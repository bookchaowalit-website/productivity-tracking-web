// Server-side product analytics (SPEC-001, ADR-0005 layer 2).
// Sends one event to the PostHog capture API. Analytics is optional: with no
// project key nothing is sent, and a failure or timeout is logged and
// swallowed, so it can never change an API response.

const DEFAULT_HOST = 'https://eu.i.posthog.com';
const DEFAULT_TIMEOUT_MS = 2000;
const PRODUCT = 'trackit';

// Only these events and properties are ever sent. Titles, notes, URLs, email
// and error messages are dropped because they are not listed here.
const ALLOWED_PROPERTIES: Record<string, readonly string[]> = {
    tracking_item_added: ['category', 'source', 'status'],
    tracking_updated: ['fields_changed', 'status'],
    tracking_item_completed: ['category'],
    tracking_item_removed: ['category'],
    tracking_write_failed: ['method', 'status_code'],
};

function timeoutMs(): number {
    const value = Number(process.env.POSTHOG_TIMEOUT_MS);
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_TIMEOUT_MS;
}

export async function track(event: string, userId: string, props: Record<string, unknown> = {}): Promise<void> {
    const apiKey = process.env.POSTHOG_PROJECT_KEY?.trim();
    if (!apiKey || !userId || !Object.prototype.hasOwnProperty.call(ALLOWED_PROPERTIES, event)) return;

    const properties: Record<string, unknown> = {};
    for (const key of ALLOWED_PROPERTIES[event]) {
        if (key in props) properties[key] = props[key];
    }
    const host = (process.env.POSTHOG_HOST?.trim() || DEFAULT_HOST).replace(/\/+$/, '');
    const body = JSON.stringify({
        api_key: apiKey,
        event,
        distinct_id: userId,
        timestamp: new Date().toISOString(),
        properties: { ...properties, product: PRODUCT, $ip: null, $geoip_disable: true },
    });

    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
            controller.abort();
            reject(new Error('timeout'));
        }, timeoutMs());
    });
    // Errors carry a fixed reason only: a fetch error message can contain the
    // host URL, and with it any credentials a misconfigured host includes.
    const send = fetch(`${host}/i/v0/e/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
    }).then(
        (response) => {
            if (!response.ok) throw new Error(`status ${response.status}`);
        },
        () => {
            throw new Error('request failed');
        },
    );
    // Whichever loses the race must not surface as an unhandled rejection.
    send.catch(() => {});
    timedOut.catch(() => {});

    try {
        await Promise.race([send, timedOut]);
    } catch (error) {
        // Event name and a fixed reason only: never the payload, key or user ID.
        console.warn(`analytics: ${event} not sent (${error instanceof Error ? error.message : 'unknown error'})`);
    } finally {
        clearTimeout(timer);
    }
}
