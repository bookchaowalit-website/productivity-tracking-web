#!/usr/bin/env python3
"""Autopilot loop: pick a backlog issue, let Claude implement it, gate it, merge it, repeat.

One invocation is one *run*. A run works through up to ``limits.max_tasks_per_run``
issues and stops early on any stop condition (budget, rate limit, pause, wall time,
empty backlog). Every decision is written to the issue, the ledger issue and Telegram,
so there is an evidence trail without anybody watching.

Usage:
    python3 .autopilot/autopilot.py              # real run (CI)
    python3 .autopilot/autopilot.py --dry-run    # read-only: show what the run would do
    python3 .autopilot/autopilot.py --sandbox    # real agents and gates, but no push, no
                                                 # GitHub writes; Telegram tagged [sandbox]

Environment:
    GH_TOKEN                      gh CLI auth (GITHUB_TOKEN in Actions)
    CLAUDE_CODE_OAUTH_TOKEN       Claude Code auth in CI (from `claude setup-token`)
    TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (or Infisical's TELEGRAM_NOTI_BOT_TOKEN / _CHAT_ID)
    AUTOPILOT_SKILLS_DIR          checkout of platform-agent-skills (visual gate)
    PLAYWRIGHT_MODULE             path to the playwright package (visual gate)
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import shutil
import signal
import subprocess
import sys
import textwrap
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
HERE = ROOT / ".autopilot"
CONFIG = json.loads((HERE / "config.json").read_text())
LIMITS = CONFIG["limits"]
LABELS = CONFIG["backlog"]["status_labels"]
BASE = CONFIG["default_branch"]
REPO = CONFIG["repo"]
BKK = dt.timezone(dt.timedelta(hours=7))
RUN_STARTED = time.monotonic()
WORK = Path(os.environ.get("RUNNER_TEMP", "/tmp")) / "autopilot"
P_FINDING = re.compile(r"^\s*(?:[-*]\s*)?\[(P[0-3])\]\s*(.+)$", re.M)
RATE_LIMIT = re.compile(r"usage limit|rate.?limit|limit reached|overloaded|too many requests|quota", re.I)
JSON_BLOCK = re.compile(r"```json\s*(\{.*?\})\s*```", re.S)
TRAILER = "\n\nCo-Authored-By: Claude <noreply@anthropic.com>"

ARGS: argparse.Namespace


class StopRun(Exception):
    """Raised when the whole run must stop (budget, rate limit, pause, wall time)."""

    def __init__(self, reason: str, event: str = "run_error"):
        super().__init__(reason)
        self.reason, self.event = reason, event


# --------------------------------------------------------------------------- utils

def now_bkk() -> dt.datetime:
    return dt.datetime.now(BKK)


def log(msg: str) -> None:
    print(f"[autopilot {now_bkk():%H:%M:%S}] {msg}", flush=True)


def run(cmd: list[str] | str, *, cwd: Path = ROOT, timeout: int = 900, env: dict | None = None,
        stdin: str | None = None, check: bool = False) -> tuple[int, str]:
    shell = isinstance(cmd, str)
    try:
        p = subprocess.run(cmd, cwd=cwd, shell=shell, input=stdin, text=True, capture_output=True,
                           timeout=timeout, env={**os.environ, **(env or {})})
        out = (p.stdout or "") + (("\n" + p.stderr) if p.stderr else "")
        code = p.returncode
    except subprocess.TimeoutExpired as e:
        out = f"{e.stdout or ''}\n{e.stderr or ''}\nTIMEOUT after {timeout}s"
        code = 124
    if check and code != 0:
        raise RuntimeError(f"{cmd!r} exited {code}: {tail(out)}")
    return code, out


def tail(text: str, lines: int = 40, chars: int = 3500) -> str:
    return "\n".join(text.strip().splitlines()[-lines:])[-chars:]


def git(*args: str, check: bool = True, timeout: int = 300) -> str:
    return run(["git", *args], check=check, timeout=timeout)[1].strip()


def last_json(text: str) -> dict[str, Any] | None:
    blocks = JSON_BLOCK.findall(text or "")
    for raw in reversed(blocks):
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            continue
    return None


def fingerprint(text: str) -> str:
    norm = re.sub(r"\d+", "#", re.sub(r"\s+", " ", text.lower()))[:4000]
    return hashlib.sha1(norm.encode()).hexdigest()[:12]


def minutes_used() -> float:
    return (time.monotonic() - RUN_STARTED) / 60


def esc(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:40] or "task"


# --------------------------------------------------------------------------- telegram

def telegram(event: str, text: str) -> None:
    if not CONFIG["notify"].get("telegram") or event not in CONFIG["notify"]["events"] + ["run_summary"]:
        return
    token = os.environ.get("TELEGRAM_BOT_TOKEN") or os.environ.get("TELEGRAM_NOTI_BOT_TOKEN")
    chat = os.environ.get("TELEGRAM_CHAT_ID") or os.environ.get("TELEGRAM_NOTI_CHAT_ID")
    prefix = "[sandbox] " if ARGS.sandbox else ""
    if ARGS.dry_run or not token or not chat:
        log(f"telegram({event}) skipped: {text[:120]!r}")
        return
    body = urllib.parse.urlencode({
        "chat_id": chat, "parse_mode": "HTML", "disable_web_page_preview": "true",
        "text": f"🤖 <b>{prefix}Autopilot · {esc(REPO.split('/')[-1])}</b>\n{text}"[:4000],
    }).encode()
    for attempt in range(3):
        try:
            urllib.request.urlopen(f"https://api.telegram.org/bot{token}/sendMessage", body, timeout=20).read()
            return
        except urllib.error.HTTPError as e:  # never let a notification failure stop the loop
            log(f"telegram failed: HTTP {e.code}")
            if e.code < 500 and e.code != 429:
                return
        except Exception as e:
            log(f"telegram failed: {type(e).__name__} (try {attempt + 1}/3)")
        time.sleep(3 * (attempt + 1))


# --------------------------------------------------------------------------- github

def gh(*args: str, check: bool = True, stdin: str | None = None) -> str:
    return run(["gh", *args], check=check, stdin=stdin, timeout=120)[1].strip()


def gh_json(*args: str) -> Any:
    out = gh(*args)
    return json.loads(out) if out else None


def writes_allowed() -> bool:
    return not (ARGS.dry_run or ARGS.sandbox)


def issue_comment(number: int, body: str) -> None:
    if writes_allowed():
        gh("issue", "comment", str(number), "--repo", REPO, "--body-file", "-", stdin=body)
    else:
        log(f"(no write) comment on #{number}: {body[:160]!r}")


def set_status(number: int, status: str) -> None:
    remove = [v for k, v in LABELS.items() if k not in (status, "approved")]
    if writes_allowed():
        gh("issue", "edit", str(number), "--repo", REPO, "--add-label", LABELS[status],
           *sum((["--remove-label", label] for label in remove), []), check=False)
    else:
        log(f"(no write) #{number} → {status}")


def clear_status(number: int) -> None:
    if writes_allowed():
        gh("issue", "edit", str(number), "--repo", REPO,
           *sum((["--remove-label", v] for k, v in LABELS.items() if k != "approved"), []), check=False)


def ensure_labels() -> None:
    wanted = {CONFIG["backlog"]["label"]: "5319e7", **{v: "c5def5" for v in LABELS.values()},
              **{p: "fbca04" for p in CONFIG["backlog"]["priority_labels"]},
              **{v: "bfd4f2" for v in CONFIG["backlog"]["risk_labels"].values()},
              "autopilot:paused": "b60205"}
    have = {label["name"] for label in gh_json("label", "list", "--repo", REPO, "-L", "200", "--json", "name")}
    for name, color in wanted.items():
        if name not in have and writes_allowed():
            gh("label", "create", name, "--repo", REPO, "--color", color, check=False)


@dataclass
class Task:
    number: int
    title: str
    body: str
    labels: list[str]
    url: str

    @property
    def priority(self) -> int:
        for i, p in enumerate(CONFIG["backlog"]["priority_labels"]):
            if p in self.labels:
                return i
        return len(CONFIG["backlog"]["priority_labels"])

    @property
    def risk(self) -> str:
        for name, label in CONFIG["backlog"]["risk_labels"].items():
            if label in self.labels:
                return name
        return "medium"

    @property
    def ui_pages(self) -> list[str]:
        m = re.search(r"^##\s*UI pages\s*\n(.*?)(?:\n##|\Z)", self.body, re.S | re.M | re.I)
        return re.findall(r"`?(/[^\s`]*)`?", m.group(1)) if m else []

    @property
    def depends_on(self) -> list[int]:
        return [int(n) for n in re.findall(r"depends on #(\d+)", self.body, re.I)]

    @property
    def branch(self) -> str:
        return f"{CONFIG['branch_prefix']}{self.number}-{slug(self.title)}"

    @property
    def doc_path(self) -> str:
        return f"docs/autopilot/tasks/{self.number:04d}-{slug(self.title)}.md"


def list_tasks(status: str) -> list[Task]:
    rows = gh_json("issue", "list", "--repo", REPO, "--state", "open", "-L", "100",
                   "--label", CONFIG["backlog"]["label"], "--label", LABELS[status],
                   "--json", "number,title,body,labels,url") or []
    tasks = [Task(r["number"], r["title"], r["body"] or "", [x["name"] for x in r["labels"]], r["url"]) for r in rows]
    return sorted(tasks, key=lambda t: (t.priority, t.number))


def issue_closed(number: int) -> bool:
    return gh_json("issue", "view", str(number), "--repo", REPO, "--json", "state")["state"] == "CLOSED"


def paused_issue() -> dict | None:
    rows = gh_json("issue", "list", "--repo", REPO, "--state", "open", "--label", "autopilot:paused",
                   "--json", "number,title,url") or []
    return rows[0] if rows else None


def pause(reason: str) -> None:
    if writes_allowed() and not paused_issue():
        gh("issue", "create", "--repo", REPO, "--title", "Autopilot paused", "--label", "autopilot:paused",
           "--body-file", "-", stdin=f"Autopilot หยุดตัวเองเพราะ: {reason}\n\nแก้สาเหตุแล้ว **ปิด issue นี้** เพื่อให้ run ถัดไปทำงานต่อ")
    telegram("paused", f"⏸️ หยุด autopilot ชั่วคราว\nสาเหตุ: {esc(reason)}\nแก้แล้วปิด issue “Autopilot paused” เพื่อให้ทำต่อ")


# --------------------------------------------------------------------------- ledger / budget

@dataclass
class Budget:
    calls_today: int = 0
    tasks_today: int = 0
    usd_today: float = 0.0
    recent_outcomes: list[str] = field(default_factory=list)
    run_calls: int = 0
    run_usd: float = 0.0
    run_tasks: list[dict] = field(default_factory=list)
    ledger_issue: int | None = None
    history_closed: bool = False
    paused: bool = False

    def charge(self, usd: float) -> None:
        self.calls_today += 1
        self.run_calls += 1
        self.usd_today += usd
        self.run_usd += usd

    def check(self, task_usd: float = 0.0) -> None:
        if self.calls_today >= LIMITS["max_claude_calls_per_day"]:
            raise StopRun(f"ครบเพดาน Claude {LIMITS['max_claude_calls_per_day']} ครั้ง/วัน", "budget_hit")
        if self.usd_today >= LIMITS["max_est_usd_per_day"]:
            raise StopRun(f"ครบเพดานประมาณการ ${LIMITS['max_est_usd_per_day']}/วัน", "budget_hit")
        if minutes_used() >= LIMITS["max_run_minutes"]:
            raise StopRun(f"run ใช้เวลาครบ {LIMITS['max_run_minutes']} นาที", "run_summary")


def load_budget() -> Budget:
    b = Budget()
    title = CONFIG["backlog"]["ledger_issue_title"]
    rows = gh_json("issue", "list", "--repo", REPO, "--state", "all", "--search", f'"{title}" in:title',
                   "--json", "number,title") or []
    rows = [r for r in rows if r["title"] == title]
    if not rows:
        if writes_allowed():
            url = gh("issue", "create", "--repo", REPO, "--title", title, "--body-file", "-",
                     stdin="บันทึกการทำงานของ autopilot หนึ่ง comment ต่อหนึ่ง run (JSON) ใช้คิดเพดานโควตารายวัน ห้ามลบ")
            b.ledger_issue = int(url.rstrip("/").split("/")[-1])
        return b
    b.ledger_issue = rows[0]["number"]
    data = gh_json("api", f"repos/{REPO}/issues/{b.ledger_issue}/comments?per_page=100&sort=created&direction=desc") or []
    today = now_bkk().date().isoformat()
    for c in data:
        entry = last_json(c.get("body", ""))
        if not entry or entry.get("kind") != "autopilot-run":
            continue
        if entry.get("date") == today and not entry.get("sandbox"):
            b.calls_today += entry.get("claude_calls", 0)
            b.usd_today += entry.get("est_usd", 0.0)
            b.tasks_today += len([t for t in entry.get("tasks", []) if t.get("outcome") == "merged"])
        if entry.get("paused"):
            b.history_closed = True
        if not b.history_closed:
            b.recent_outcomes.extend(reversed([t.get("outcome", "") for t in entry.get("tasks", [])]))
    return b


def write_ledger(b: Budget, stop_reason: str) -> None:
    entry = {"kind": "autopilot-run", "date": now_bkk().date().isoformat(), "at": now_bkk().isoformat(timespec="seconds"),
             "run_url": run_url(), "sandbox": ARGS.sandbox, "claude_calls": b.run_calls,
             "est_usd": round(b.run_usd, 3), "minutes": round(minutes_used(), 1), "stop_reason": stop_reason,
             "tasks": b.run_tasks, "paused": b.paused}
    body = f"Run {entry['at']} — {stop_reason}\n\n```json\n{json.dumps(entry, ensure_ascii=False, indent=1)}\n```"
    if b.ledger_issue and writes_allowed():
        issue_comment(b.ledger_issue, body)
    else:
        log("ledger entry:\n" + body)


def run_url() -> str:
    if os.environ.get("GITHUB_RUN_ID"):
        return f"{os.environ.get('GITHUB_SERVER_URL', 'https://github.com')}/{REPO}/actions/runs/{os.environ['GITHUB_RUN_ID']}"
    return "local"


# --------------------------------------------------------------------------- claude

READ_ONLY_TOOLS = "Read,Glob,Grep,Bash(git diff:*),Bash(git log:*),Bash(git show:*),Bash(ls:*)"
MAKER_TOOLS = ("Read,Edit,Write,Glob,Grep,Bash(npm test:*),Bash(npm run lint:*),Bash(npm run build:*),"
               "Bash(npx tsc:*),Bash(node --test:*),Bash(git status:*),Bash(git diff:*),Bash(git log:*),"
               "Bash(ls:*),Bash(mkdir:*)")
MAKER_DENY = "Bash(git commit:*),Bash(git push:*),Bash(git reset:*),Bash(vercel:*),Bash(npx vercel:*),Bash(npm install:*),Bash(curl:*),WebFetch,WebSearch"


def claude(prompt: str, *, budget: Budget, max_turns: int, tools: str, deny: str = "", role: str) -> dict[str, Any]:
    budget.check()
    if ARGS.dry_run:
        return {"ok": False, "text": "", "usd": 0.0, "dry": True}
    cmd = ["claude", "-p", "--output-format", "json", "--max-turns", str(max_turns),
           "--permission-mode", "acceptEdits", "--allowedTools", tools]
    if deny:
        cmd += ["--disallowedTools", deny]
    log(f"claude[{role}] start (turns≤{max_turns})")
    try:
        p = subprocess.run(cmd, cwd=ROOT, input=prompt, text=True, capture_output=True,
                           timeout=LIMITS["max_task_minutes"] * 60)
        code, out, err = p.returncode, p.stdout or "", p.stderr or ""
    except subprocess.TimeoutExpired:
        code, out, err = 124, "", f"claude timed out after {LIMITS['max_task_minutes']} min"
    try:
        data = json.loads(out[out.index("{"):out.rindex("}") + 1])
    except ValueError:
        data = {"is_error": True, "result": tail(out + "\n" + err), "subtype": "unparsed"}
    out = out + "\n" + err
    usd = float(data.get("total_cost_usd") or 0.0)
    budget.charge(usd)
    text = str(data.get("result") or "")
    log(f"claude[{role}] done code={code} subtype={data.get('subtype')} turns={data.get('num_turns')} est=${usd:.2f}")
    if (data.get("is_error") or code != 0) and RATE_LIMIT.search(text + out[-2000:]):
        raise StopRun(f"Claude ติด usage/rate limit ({role})", "rate_limited")
    return {"ok": code == 0 and not data.get("is_error"), "text": text, "usd": usd,
            "subtype": data.get("subtype"), "turns": data.get("num_turns")}


def prompt(name: str, **values: Any) -> str:
    return (HERE / "prompts" / f"{name}.md").read_text().format(repo=REPO, base=BASE, **values)


# --------------------------------------------------------------------------- gates

@dataclass
class GateResult:
    name: str
    ok: bool
    detail: str = ""
    blocking_text: str = ""
    infra: bool = False  # the gate itself could not run: not the maker's problem


def changed_files() -> list[str]:
    return [f for f in git("diff", "--name-only", f"{BASE}...HEAD").splitlines() if f]


def changed_lines() -> int:
    total = 0
    for line in git("diff", "--numstat", f"{BASE}...HEAD").splitlines():
        a, d, *_ = line.split("\t")
        total += (int(a) if a.isdigit() else 0) + (int(d) if d.isdigit() else 0)
    return total


def command_gates() -> list[GateResult]:
    results = []
    for g in CONFIG["gates"]["commands"]:
        code, out = run(g["run"], timeout=900)
        results.append(GateResult(g["name"], code == 0, tail(out, 25), "" if code == 0 else f"`{g['run']}` failed:\n{tail(out, 40)}"))
        log(f"gate {g['name']}: {'pass' if code == 0 else 'FAIL'}")
    return results


def review_gate(task: Task, budget: Budget) -> GateResult:
    cfg = CONFIG["gates"]["codex_review"]
    if not cfg["enabled"]:
        return GateResult("review", True, "disabled")
    instructions = prompt("reviewer", number=task.number, title=task.title, body=task.body)
    if shutil.which("codex") and (Path.home() / ".codex" / "auth.json").exists() and not ARGS.dry_run:
        # `codex review --base` cannot take custom instructions, so run a read-only exec
        last = WORK / f"codex-review-{task.number}.md"
        last.unlink(missing_ok=True)
        code, out = run(["codex", "exec", "-s", "read-only", "-c", 'model_reasoning_effort="high"',
                         "-o", str(last), "-"], stdin=instructions, timeout=1500)
        text = last.read_text() if last.exists() else ""
        verdict = last_json(text)
        if code == 0 and verdict:
            return verdict_gate("codex-review", verdict, text, cfg)
        log(f"codex review unavailable (exit {code}, verdict={'yes' if verdict else 'no'}); falling back to {cfg['fallback']}")
    if cfg.get("fallback") != "claude":
        return GateResult("review", False, "no reviewer available", "No reviewer could run.")
    r = claude(instructions, budget=budget, max_turns=LIMITS["reviewer_max_turns"], tools=READ_ONLY_TOOLS, role="reviewer")
    return verdict_gate("claude-review", last_json(r["text"]) or {}, r["text"], cfg)


def verdict_gate(name: str, verdict: dict, raw: str, cfg: dict) -> GateResult:
    # Only P0/P1 block. A "request_changes" with P2/P3 only passes; those findings go into the evidence.
    findings = verdict.get("findings", [])
    blocking = [f for f in findings if f.get("severity") in cfg["block_on"]]
    ok = bool(verdict) and not blocking
    fmt = lambda fs: "\n".join(f"[{f.get('severity')}] {f.get('file')}:{f.get('line')} {f.get('summary')} → {f.get('fix')}" for f in fs)
    log(f"gate {name}: {verdict.get('verdict')} ({len(blocking)} blocking, {len(findings) - len(blocking)} non-blocking)")
    detail = f"{verdict.get('verdict', 'no verdict')}; {len(findings)} finding(s)\n{fmt(findings)}" if verdict else tail(raw, 60)
    return GateResult(name, ok, detail,
                      "" if ok else ("Reviewer findings to fix:\n" + fmt(blocking) if blocking else "Reviewer returned no parseable verdict."))


def needs_visual(task: Task, files: list[str]) -> bool:
    cfg = CONFIG["gates"]["visual"]
    return cfg["enabled"] and (bool(task.ui_pages) or any(f.startswith(tuple(cfg["trigger_paths"])) for f in files))


def skills_dir() -> Path | None:
    cfg = CONFIG["gates"]["visual"]
    if os.environ.get("AUTOPILOT_SKILLS_DIR"):
        return Path(os.environ["AUTOPILOT_SKILLS_DIR"])
    target = WORK / "platform-agent-skills"
    if not (target / "qa-testing/scripts/ui_review.mjs").exists():
        run(["git", "clone", "--quiet", f"https://github.com/{cfg['skills_repo']}.git", str(target)], timeout=300)
        run(["git", "checkout", "--quiet", cfg["skills_ref"]], cwd=target)
    return target if (target / "qa-testing/scripts/ui_review.mjs").exists() else None


def capture(src: Path, port: int, pages: list[str], out: Path) -> tuple[dict, str]:
    """Build and serve ``src`` on ``port``, capture ``pages``; return (counts, report_md path)."""
    skills = skills_dir()
    if not skills:
        raise RuntimeError("platform-agent-skills checkout not available")
    if src != ROOT:
        if not (src / "node_modules").exists():
            (src / "node_modules").symlink_to(ROOT / "node_modules")
        code, out_b = run("npm run build", cwd=src, timeout=900)
        if code != 0:
            raise RuntimeError(f"baseline build failed: {tail(out_b, 15)}")
    server = subprocess.Popen(["npx", "next", "start", "-p", str(port)], cwd=src, stdout=subprocess.DEVNULL,
                              stderr=subprocess.DEVNULL, start_new_session=True)
    try:
        for _ in range(60):
            if run(["curl", "-s", "-o", "/dev/null", f"http://127.0.0.1:{port}/"], timeout=10)[0] == 0:
                break
            time.sleep(1)
        cmd = ["node", str(skills / "qa-testing/scripts/ui_review.mjs"), "--widths", CONFIG["gates"]["visual"]["widths"],
               "--out", str(out), "--a11y", "off"]
        for p in pages:
            cmd += ["--url", f"http://127.0.0.1:{port}{p}"]
        code, txt = run(cmd, timeout=600)
        report = out / "report.json"
        if not report.exists():
            raise RuntimeError(f"ui_review produced no report: {tail(txt, 15)}")
        data = json.loads(report.read_text())
        if not data.get("pages"):
            raise RuntimeError(f"ui_review captured no pages (browser failed to start?) skipped={str(data.get('skipped'))[:300]} {tail(txt, 8)}")
        return data.get("counts", {}), str(out / "report.md")
    finally:
        os.killpg(server.pid, signal.SIGTERM)


def visual_gate(task: Task, budget: Budget, baseline: dict) -> tuple[GateResult, list[dict]]:
    cfg = CONFIG["gates"]["visual"]
    pages = task.ui_pages or cfg["pages"]
    try:
        if "counts" not in baseline:
            wt = WORK / "baseline"
            if wt.exists():
                run(["git", "worktree", "remove", "--force", str(wt)])
            git("worktree", "prune")  # a deleted baseline dir stays registered otherwise
            git("worktree", "add", "--force", "--detach", str(wt), BASE)
            baseline["counts"], baseline["md"] = capture(wt, cfg["port"] + 1, pages, WORK / "shots-base")
            baseline["shots"] = str(WORK / "shots-base")
        shots = WORK / f"shots-{task.number}"
        shutil.rmtree(shots, ignore_errors=True)
        counts, report_md = capture(ROOT, cfg["port"], pages, shots)
    except Exception as e:
        return GateResult("visual", False, str(e), f"Visual gate could not run: {e}", infra=True), []
    worse = [f"{sev}: {counts.get(sev, 0)} (was {baseline['counts'].get(sev, 0)} on {BASE})"
             for sev in cfg["block_on_new"] if counts.get(sev, 0) > baseline["counts"].get(sev, 0)]
    if worse:
        return GateResult("visual-audit", False, f"counts {counts}",
                          f"The automated visual audit got worse — read {report_md}:\n" + "\n".join(worse)), []
    if not cfg["ai_visual_review"]:
        return GateResult("visual-audit", True, f"counts {counts} (base {baseline['counts']})"), []
    checklist = skills_dir() / "qa-testing/references/ui-quality-gate.md"
    r = claude(prompt("visual", number=task.number, title=task.title, shots_dir=shots, baseline_shots_dir=baseline["shots"],
                      report_md=report_md, baseline_md=baseline["md"], checklist=checklist, widths=cfg["widths"]),
               budget=budget, max_turns=LIMITS["visual_max_turns"], tools=f"Read,Glob,Grep", role="visual")
    v = last_json(r["text"]) or {}
    bad = [f for f in v.get("findings", []) if f.get("severity") in ("blocker", "major")]
    ok = v.get("verdict") == "pass" and not bad
    text = "\n".join(f"[{f.get('severity')}] {f.get('page')} @{f.get('width')}: {f.get('summary')} → {f.get('fix')}" for f in bad)
    return (GateResult("visual-ai", ok, f"audit {counts}; AI verdict {v.get('verdict')}; checked {v.get('pages_checked')}",
                       "" if ok else "Visual reviewer findings to fix:\n" + (text or "no verdict returned")),
            v.get("preexisting", []))


# --------------------------------------------------------------------------- task loop

def reset_to_base() -> None:
    git("checkout", "--quiet", "--force", BASE)
    git("reset", "--quiet", "--hard", f"origin/{BASE}" if not ARGS.sandbox else BASE)
    git("clean", "-fdq", "-e", "node_modules", "-e", ".next")


def touches_protected(files: list[str], task: Task) -> list[str]:
    allowed = {task.doc_path}
    return [f for f in files if f not in allowed and any(f.startswith(p) for p in CONFIG["merge"]["protected_paths"])]


def work_task(task: Task, budget: Budget, baseline: dict) -> dict:
    usd_before = budget.run_usd
    try:
        record = _work_task(task, budget, baseline)
        record["est_usd"] = round(budget.run_usd - usd_before, 3)
        return record
    except StopRun as e:
        issue_comment(task.number, f"⏸️ run หยุดกลางงานนี้ ({e.reason}) — คืนสถานะเป็น todo ให้ run ถัดไปเริ่มใหม่\n\n{run_url()}")
        set_status(task.number, "todo")
        budget.run_tasks.append({"issue": task.number, "title": task.title, "outcome": "interrupted", "reason": e.reason})
        raise


def _work_task(task: Task, budget: Budget, baseline: dict) -> dict:
    log(f"task #{task.number}: {task.title} (risk {task.risk})")
    record = {"issue": task.number, "title": task.title, "attempts": 0, "est_usd": 0.0, "outcome": "?"}
    set_status(task.number, "in_progress")
    reset_to_base()
    git("checkout", "--quiet", "-B", task.branch)
    feedback, last_fp, gates_log = "", None, []
    usd_before = budget.run_usd
    preexisting: list[dict] = []

    for attempt in range(1, LIMITS["max_attempts_per_task"] + 1):
        record["attempts"] = attempt
        if budget.run_usd - usd_before >= LIMITS["max_est_usd_per_task"]:
            return finish_blocked(task, record, f"ใช้ประมาณการเกิน ${LIMITS['max_est_usd_per_task']} ต่องาน", gates_log)
        maker = claude(prompt("maker", number=task.number, title=task.title, body=task.body, attempt=attempt,
                              max_attempts=LIMITS["max_attempts_per_task"], doc_path=task.doc_path,
                              feedback=("Fix these problems from the previous attempt's gates:\n" + feedback) if feedback else "First attempt."),
                       budget=budget, max_turns=LIMITS["maker_max_turns"], tools=MAKER_TOOLS, deny=MAKER_DENY, role="maker")
        verdict = last_json(maker["text"]) or {}
        if verdict.get("status") == "needs_human":
            return finish_needs_human(task, record, verdict.get("needs_human_reason") or "maker asked for a human")
        if verdict.get("status") == "cannot_do":
            return finish_blocked(task, record, f"maker: {verdict.get('summary', 'cannot do')}", gates_log)
        if not git("status", "--porcelain"):
            feedback = f"You made no file changes. Maker result: {maker.get('subtype')} — {tail(maker['text'], 10)}"
            fp = fingerprint(feedback)
        else:
            git("add", "-A")
            git("commit", "--quiet", "-m", f"autopilot(#{task.number}): {task.title} (attempt {attempt}){TRAILER}")
            results = command_gates()
            if all(r.ok for r in results):
                results.append(review_gate(task, budget))
            files = changed_files()
            if all(r.ok for r in results) and needs_visual(task, files):
                g, preexisting = visual_gate(task, budget, baseline)
                results.append(g)
            gates_log.append({"attempt": attempt, "gates": {r.name: r.ok for r in results}})
            failed = [r for r in results if not r.ok]
            infra = [r for r in failed if r.infra]
            if infra:
                return finish_blocked(task, record, f"gate {infra[0].name} รันไม่ได้ (ปัญหาที่ระบบ ไม่ใช่โค้ด)", gates_log, infra[0].detail)
            if not failed:
                record["est_usd"] = round(budget.run_usd - usd_before, 3)  # shown in the evidence comment
                return finish_passed(task, record, verdict, results, files, preexisting)
            feedback = "\n\n".join(r.blocking_text for r in failed)
            fp = fingerprint(feedback)
        if fp == last_fp:
            return finish_blocked(task, record, "วนแก้ปัญหาเดิมซ้ำ (stuck)", gates_log, feedback)
        last_fp = fp
        log(f"attempt {attempt} failed: {feedback[:200]!r}")
    return finish_blocked(task, record, f"ไม่ผ่าน gate ภายใน {LIMITS['max_attempts_per_task']} รอบ", gates_log, feedback)


def gate_table(results: list[GateResult]) -> str:
    return "\n".join(f"| {r.name} | {'✅' if r.ok else '❌'} | {esc(r.detail.splitlines()[-1] if r.detail else '')[:120]} |" for r in results)


def record_gate_evidence(task: Task, results: list[GateResult]) -> None:
    doc = ROOT / task.doc_path
    if not doc.exists():
        return
    text = doc.read_text()
    review = "\n".join(f"- **{r.name}**: {'ผ่าน' if r.ok else 'ไม่ผ่าน'}\n" + textwrap.indent(r.detail.strip()[:2500], "  ")
                       for r in results if not r.name.startswith("visual")) + f"\n- Run: {run_url()} · {now_bkk():%Y-%m-%d %H:%M} ICT"
    visual = [r for r in results if r.name.startswith("visual")]
    visual_txt = ("\n".join(f"- **{r.name}**: {'ผ่าน' if r.ok else 'ไม่ผ่าน'} — {r.detail.strip()[:1500]}" for r in visual)
                  if visual else "N/A — งานนี้ไม่ได้แตะไฟล์ UI และ issue ไม่ได้ระบุ UI pages (loop ตรวจจาก diff)")
    for heading, body in (("Review evidence", review), ("Visual review", visual_txt)):
        text = re.sub(rf"(^##\s*{heading}[^\n]*\n)(.*?)(?=^##\s|\Z)", lambda m: m.group(1) + "\n" + body + "\n\n", text, count=1, flags=re.S | re.M)
    doc.write_text(text)
    if git("status", "--porcelain"):
        git("add", task.doc_path)
        git("commit", "--quiet", "-m", f"docs(autopilot): record gate evidence for #{task.number}{TRAILER}")


def finish_passed(task: Task, record: dict, verdict: dict, results: list[GateResult], files: list[str], preexisting: list[dict]) -> dict:
    record_gate_evidence(task, results)
    protected = touches_protected(files, task)
    lines = changed_lines()
    reasons = []
    if protected:
        reasons.append("แตะไฟล์ที่ต้องให้คนอนุมัติ: " + ", ".join(protected[:6]))
    if task.risk not in CONFIG["merge"]["auto_merge_risk"]:
        reasons.append(f"risk {task.risk}")
    if lines > LIMITS["max_changed_lines_auto_merge"]:
        reasons.append(f"diff {lines} บรรทัด เกิน {LIMITS['max_changed_lines_auto_merge']}")
    acceptance = "\n".join(f"- [{'x' if a.get('met') else ' '}] {a.get('criterion')} — {a.get('evidence', '')}" for a in verdict.get("acceptance", []))
    evidence = (f"### Autopilot evidence ({now_bkk():%Y-%m-%d %H:%M} ICT)\n\n"
                f"- Run: {run_url()}\n- Attempts: {record['attempts']} · est. ${record['est_usd']}\n"
                f"- Diff: {lines} lines in {len(files)} files · task record `{task.doc_path}`\n\n"
                f"| Gate | Result | Detail |\n|---|---|---|\n{gate_table(results)}\n\n"
                f"**Acceptance (maker self-check, verified by reviewer):**\n{acceptance or '-'}\n\n"
                f"**Summary:** {verdict.get('summary', '')}")
    propose_preexisting(task, preexisting)

    if reasons:
        record["outcome"] = "pr_opened"
        if writes_allowed():
            git("push", "--quiet", "--force-with-lease", "origin", task.branch)
            pr = gh("pr", "create", "--repo", REPO, "--base", BASE, "--head", task.branch,
                    "--title", f"autopilot(#{task.number}): {task.title}", "--body-file", "-",
                    stdin=f"{evidence}\n\nต้องให้คนอนุมัติเพราะ: {'; '.join(reasons)}\n\n"
                          f"อนุมัติ: ใส่ label `{LABELS['approved']}` ที่ PR นี้ แล้ว run ถัดไปจะ merge ให้ (merge ใน clone ตามกติกา)\n\nRefs #{task.number}\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)")
            record["pr"] = pr
        issue_comment(task.number, evidence + f"\n\n➡️ เปิด PR รออนุมัติ: {record.get('pr', '(sandbox)')}")
        set_status(task.number, "needs_human")
        telegram("pr_opened", f"🟡 #{task.number} {esc(task.title)}\nผ่านทุก gate แต่ต้องอนุมัติ: {esc('; '.join(reasons))}\nPR: {record.get('pr', '-')}\nใส่ label <code>{LABELS['approved']}</code> เพื่อให้ merge")
        return record

    if ARGS.sandbox:
        record["outcome"] = "sandbox_pass"
        log("sandbox: all gates passed; not merging\n" + evidence)
        telegram("task_done", f"🧪 #{task.number} {esc(task.title)} ผ่านทุก gate ใน sandbox (ไม่ได้ merge)")
        return record
    merged = merge_branch(task.branch, f"Merge {task.branch}: {task.title}\n\nCloses #{task.number}{TRAILER}")
    record["outcome"] = "merged" if merged else "merge_failed"
    record["commit"] = merged or None
    if merged:
        issue_comment(task.number, evidence + f"\n\n✅ merge เข้า `{BASE}` แล้ว ({merged[:7]}) · **ยังไม่ได้ deploy production**")
        if writes_allowed():
            gh("issue", "close", str(task.number), "--repo", REPO, "--reason", "completed", check=False)
            clear_status(task.number)
        telegram("task_done", f"✅ #{task.number} {esc(task.title)}\nmerge แล้ว {merged[:7]} · {record['attempts']} รอบ · ~${record['est_usd']}\n{task.url}")
    else:
        return finish_blocked(task, record, "merge/push เข้า main ไม่สำเร็จ", [])
    return record


def merge_branch(branch: str, message: str) -> str:
    git("checkout", "--quiet", BASE)
    if writes_allowed():
        git("pull", "--quiet", "--ff-only", "origin", BASE)
    code, out = run(["git", "merge", "--no-ff", "-m", message, branch])
    if code != 0:
        run(["git", "merge", "--abort"])
        log(f"merge failed: {tail(out, 10)}")
        return ""
    if git("rev-parse", f"{branch}^{{tree}}") != git("rev-parse", "HEAD^{tree}"):
        # main moved since the branch was cut: re-run the command gates on the merged tree
        if not all(r.ok for r in command_gates()):
            git("reset", "--quiet", "--hard", "HEAD~1")
            return ""
    sha = git("rev-parse", "HEAD")
    if writes_allowed():
        code, out = run(["git", "push", "--quiet", "origin", BASE])
        if code != 0:
            log(f"push failed: {tail(out, 10)}")
            git("reset", "--quiet", "--hard", "HEAD~1")
            return ""
        run(["git", "push", "--quiet", "origin", "--delete", branch])
    return sha


def keep_work(task: Task, record: dict) -> str:
    """Commit leftovers and push the branch so a human can pick the work up."""
    if git("rev-parse", "--abbrev-ref", "HEAD") != task.branch:
        return ""
    if git("status", "--porcelain"):
        git("add", "-A")
        git("commit", "--quiet", "-m", f"autopilot(#{task.number}): unfinished work ({record['outcome']}){TRAILER}")
    if not git("log", "--oneline", f"{BASE}..HEAD"):
        return ""
    if writes_allowed():
        run(["git", "push", "--quiet", "--force-with-lease", "origin", task.branch])
        return f"\n- Branch ที่ทำค้างไว้: https://github.com/{REPO}/tree/{task.branch}"
    return f"\n- Branch (local): {task.branch}"


def finish_blocked(task: Task, record: dict, reason: str, gates_log: list, feedback: str = "") -> dict:
    record["outcome"] = "blocked"
    record["reason"] = reason
    branch_note = keep_work(task, record)
    body = (f"### ⛔ Autopilot หยุดงานนี้ ({now_bkk():%Y-%m-%d %H:%M} ICT)\n\nสาเหตุ: **{reason}**\n\n"
            f"- Run: {run_url()}\n- Attempts: {record['attempts']}\n- Gates: `{json.dumps(gates_log, ensure_ascii=False)}`{branch_note}\n\n"
            f"<details><summary>ปัญหาล่าสุด</summary>\n\n```\n{feedback[-3000:]}\n```\n</details>\n\n"
            f"ถ้าจะให้ลองใหม่: แก้ issue (ขยาย acceptance criteria หรือแตกงานเล็กลง) แล้วเปลี่ยน label กลับเป็น `{LABELS['todo']}`")
    issue_comment(task.number, body)
    set_status(task.number, "blocked")
    telegram("task_blocked", f"⛔ #{task.number} {esc(task.title)}\n{esc(reason)}\n{task.url}")
    return record


def finish_needs_human(task: Task, record: dict, reason: str) -> dict:
    record["outcome"] = "needs_human"
    record["reason"] = reason
    branch_note = keep_work(task, record)
    issue_comment(task.number, f"### 🙋 ต้องการคนตัดสินใจ\n\n{reason}\n{branch_note}\n\nตอบใน issue นี้ แล้วเปลี่ยน label กลับเป็น `{LABELS['todo']}`")
    set_status(task.number, "needs_human")
    telegram("needs_human", f"🙋 #{task.number} {esc(task.title)}\nต้องการคน: {esc(reason)}\n{task.url}")
    return record


# --------------------------------------------------------------------------- approvals / planner

def merge_approved_prs(budget: Budget) -> None:
    prs = gh_json("pr", "list", "--repo", REPO, "--state", "open", "--label", LABELS["approved"],
                  "--json", "number,headRefName,title,url,body") or []
    for pr in prs:
        if not pr["headRefName"].startswith(CONFIG["branch_prefix"]):
            continue
        log(f"approved PR #{pr['number']}: merging")
        reset_to_base()
        git("fetch", "--quiet", "origin", pr["headRefName"])
        git("checkout", "--quiet", "-B", pr["headRefName"], f"origin/{pr['headRefName']}")
        issue = re.search(r"Refs #(\d+)", pr["body"] or "")
        msg = f"Merge {pr['headRefName']}: {pr['title']}\n\nApproved via label on {pr['url']}" + (f"\nCloses #{issue.group(1)}" if issue else "") + TRAILER
        sha = merge_branch(pr["headRefName"], msg)
        rec = {"issue": int(issue.group(1)) if issue else None, "title": pr["title"], "outcome": "merged" if sha else "merge_failed", "pr": pr["url"]}
        budget.run_tasks.append(rec)
        if sha and writes_allowed():
            gh("pr", "comment", str(pr["number"]), "--repo", REPO, "--body", f"merge ใน clone แล้ว ({sha[:7]}) ตามที่อนุมัติ · ยังไม่ได้ deploy production", check=False)
            gh("pr", "close", str(pr["number"]), "--repo", REPO, check=False)
            if issue:
                gh("issue", "close", issue.group(1), "--repo", REPO, check=False)
            telegram("task_done", f"✅ merge PR ที่อนุมัติแล้ว: {esc(pr['title'])} ({sha[:7]})")
        elif not sha:
            telegram("task_blocked", f"⛔ merge PR ที่อนุมัติไม่สำเร็จ (conflict หรือ gate ไม่ผ่านหลัง rebase): {pr['url']}")


def create_task_issue(p: dict, origin: str) -> str:
    risk = p.get("risk", "medium")
    status = "todo" if risk in CONFIG["planner"]["auto_accept_risk"] else "proposed"
    body = (f"{p.get('why', '')}\n\n## Acceptance criteria\n" + "\n".join(f"- [ ] {a}" for a in p.get("acceptance", [])) +
            ("\n\n## UI pages\n" + "\n".join(f"- `{u}`" for u in p["ui_pages"]) if p.get("ui_pages") else "") +
            f"\n\n---\nสร้างโดย autopilot ({origin}). อนุมัติให้ทำ: เปลี่ยน label `{LABELS['proposed']}` เป็น `{LABELS['todo']}`")
    labels = [CONFIG["backlog"]["label"], LABELS[status], p.get("priority", "P2"), CONFIG["backlog"]["risk_labels"].get(risk, "risk:medium")]
    if not writes_allowed():
        log(f"(no write) propose: {p.get('title')}")
        return "(sandbox)"
    return gh("issue", "create", "--repo", REPO, "--title", p["title"][:120], "--body-file", "-",
              *sum((["--label", label] for label in labels), []), stdin=body)


def propose_preexisting(task: Task, items: list[dict]) -> None:
    serious = [i for i in items if i.get("severity") in ("blocker", "major")][:3]
    for i in serious:
        create_task_issue({"title": f"UI: {i.get('summary', '')[:90]}", "risk": "low", "priority": "P2",
                           "why": f"ปัญหาที่มีอยู่ก่อนแล้ว พบระหว่าง visual review ของ #{task.number} ({i.get('page')} @{i.get('width')}px)",
                           "acceptance": [f"Given หน้า {i.get('page')} ที่ {i.get('width')}px When เปิดดู Then ไม่พบปัญหา: {i.get('summary')}"],
                           "ui_pages": [i.get("page", "/")]}, "visual review")


def plan(budget: Budget) -> None:
    if not CONFIG["planner"]["enabled"] or list_tasks("proposed"):
        log("planner: skipped (disabled or proposals already waiting)")
        return
    existing = gh_json("issue", "list", "--repo", REPO, "--state", "all", "-L", "60", "--label", CONFIG["backlog"]["label"], "--json", "number,title,state") or []
    lint = run("npm run lint", timeout=600)[1]
    r = claude(prompt("planner", max=CONFIG["planner"]["max_proposals"], lint=tail(lint, 60),
                      existing="\n".join(f"- #{i['number']} [{i['state']}] {i['title']}" for i in existing) or "- none"),
               budget=budget, max_turns=LIMITS["reviewer_max_turns"], tools=READ_ONLY_TOOLS, role="planner")
    proposals = (last_json(r["text"]) or {}).get("proposals", [])[: CONFIG["planner"]["max_proposals"]]
    urls = [create_task_issue(p, "planner") for p in proposals]
    if urls:
        telegram("proposals", "📝 backlog ว่าง เสนองานใหม่ {} งาน (รออนุมัติ):\n".format(len(urls)) +
                 "\n".join(f"• {esc(p['title'])}" for p in proposals) +
                 f"\nอนุมัติ: เปลี่ยน label เป็น <code>{LABELS['todo']}</code>\nhttps://github.com/{REPO}/issues?q=label%3A{urllib.parse.quote(LABELS['proposed'])}")


# --------------------------------------------------------------------------- main

def preflight() -> None:
    if not ARGS.sandbox and not ARGS.dry_run and git("status", "--porcelain"):
        raise StopRun("working tree ไม่สะอาดก่อนเริ่ม run")
    if not ARGS.dry_run and not shutil.which("claude"):
        raise StopRun("ไม่พบ claude CLI")
    if writes_allowed():
        git("fetch", "--quiet", "origin", BASE)
        reset_to_base()
        code, out = run("npm test", timeout=600)
        if code != 0:
            raise StopRun(f"main พังอยู่แล้ว (npm test fail) — ไม่เริ่มงานใหม่:\n{tail(out, 8)}", "paused")


def main() -> int:
    global ARGS, BASE
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--sandbox", action="store_true")
    ap.add_argument("--max-tasks", type=int, default=LIMITS["max_tasks_per_run"])
    ARGS = ap.parse_args()
    WORK.mkdir(parents=True, exist_ok=True)
    stop_reason, budget = "ok", Budget()
    start_branch = git("rev-parse", "--abbrev-ref", "HEAD") if ARGS.sandbox else None
    if ARGS.sandbox:
        BASE = start_branch  # branch from, diff against and review against the current branch
        if git("status", "--porcelain"):
            print("sandbox needs a clean working tree (commit first)", file=sys.stderr)
            return 2
    try:
        if paused_issue():
            log("paused: open 'Autopilot paused' issue exists")
            return 0
        ensure_labels()
        budget = load_budget()
        fails = 0
        for o in budget.recent_outcomes:
            if o in ("interrupted", "pr_opened", "needs_human"):
                continue
            if o not in ("blocked", "merge_failed"):
                break
            fails += 1
        if fails >= LIMITS["consecutive_failures_to_pause"]:
            pause(f"งานล้มเหลวติดกัน {fails} งาน")
            budget.paused = True
            write_ledger(budget, f"paused: {fails} consecutive failures")
            return 0
        budget.check()
        if budget.tasks_today >= LIMITS["max_tasks_per_day"]:
            raise StopRun(f"ครบ {LIMITS['max_tasks_per_day']} งาน/วันแล้ว", "run_summary")
        preflight()
        merge_approved_prs(budget)
        baseline: dict = {}
        done = 0
        while done < ARGS.max_tasks:
            budget.check()
            ready = [t for t in list_tasks("todo") if all(issue_closed(d) for d in t.depends_on)]
            if not ready:
                if done == 0 and not ARGS.dry_run:
                    plan(budget)
                elif ARGS.dry_run:
                    log("would run the planner (backlog empty)")
                stop_reason = "backlog ว่าง" if done == 0 else "ไม่มีงานพร้อมทำแล้ว"
                break
            task = ready[0]
            if ARGS.dry_run:
                log(f"would work on #{task.number} {task.title} (P{task.priority}, risk {task.risk}, ui {task.ui_pages}, branch {task.branch})")
                stop_reason = "dry-run"
                break
            budget.run_tasks.append(work_task(task, budget, baseline))
            done += 1
            if budget.run_tasks[-1]["outcome"] == "merged":
                budget.tasks_today += 1
                if budget.tasks_today >= LIMITS["max_tasks_per_day"]:
                    stop_reason = "ครบเพดานงานต่อวัน"
                    break
        else:
            stop_reason = f"ครบ {ARGS.max_tasks} งานต่อ run"
    except StopRun as e:
        stop_reason = e.reason
        log(f"stop: {e.reason}")
        if e.event == "paused":
            pause(e.reason)
        elif e.event != "run_summary":
            telegram(e.event, f"⚠️ {esc(e.reason)}")
    except Exception as e:  # unexpected: record it, notify, exit non-zero
        stop_reason = f"error: {type(e).__name__}: {e}"
        log(stop_reason)
        telegram("run_error", f"💥 run error: {esc(str(e))[:500]}\n{run_url()}")
        write_ledger(budget, stop_reason)
        return 1
    finally:
        if start_branch:
            run(["git", "checkout", "--quiet", "--force", start_branch])
    if not ARGS.dry_run:
        write_ledger(budget, stop_reason)
    if budget.run_tasks or CONFIG["notify"]["run_summary"] == "always":
        merged = [t for t in budget.run_tasks if t["outcome"] == "merged"]
        telegram("run_summary", f"📊 จบ run: {esc(stop_reason)}\nmerge {len(merged)}/{len(budget.run_tasks)} งาน · Claude {budget.run_calls} ครั้ง · ~${budget.run_usd:.2f} · {minutes_used():.0f} นาที\n"
                 f"วันนี้: {budget.calls_today}/{LIMITS['max_claude_calls_per_day']} calls · ~${budget.usd_today:.2f}/{LIMITS['max_est_usd_per_day']}"
                 + ("\nmain นำหน้า production อยู่ — deploy ต้องให้คุณอนุมัติ" if merged else ""))
    log(f"done: {stop_reason}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
