import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import Page from "../../src/app/page";
import { Providers } from "../../src/app/providers";
import { SiteFooter } from "../../src/components/site-footer";
import { SAMPLE_USER, installAccountApi } from "../fixtures/auth-mock";
import { SAMPLE_TRACKING_ITEMS } from "../fixtures/tracking";

// The real root-layout tree: the app Providers (next-auth SessionProvider and the
// analytics provider, which stays off here) around the page, then the footer.
// Session and /api/tracking come from the per-story stub in installAccountApi.
const meta = {
  title: "Pages/Home",
  parameters: { layout: "fullscreen", nextjs: { navigation: { pathname: "/" } } },
  render: () => (
    <>
      <Providers>
        <Page />
      </Providers>
      <SiteFooter />
    </>
  ),
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const SEARCH_PLACEHOLDER = "Search the constellation...";

export const SignedOut: Story = {
  // Signed out the page shows its built-in demo list and the demo notice.
  beforeEach: () => installAccountApi({ user: null }),
};

export const SignedIn: Story = {
  beforeEach: () => installAccountApi({ user: SAMPLE_USER, tracking: SAMPLE_TRACKING_ITEMS }),
};

export const EmptyCollection: Story = {
  beforeEach: () => installAccountApi({ user: SAMPLE_USER, tracking: [] }),
};

export const SearchNoResults: Story = {
  beforeEach: () => installAccountApi({ user: SAMPLE_USER, tracking: SAMPLE_TRACKING_ITEMS }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByPlaceholderText(SEARCH_PLACEHOLDER), "zzz-no-match");
    await expect(await canvas.findByText("No items found")).toBeVisible();
  },
};

export const AddItemModal: Story = {
  beforeEach: () => installAccountApi({ user: SAMPLE_USER, tracking: SAMPLE_TRACKING_ITEMS }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Add signal" }));
    await expect(await canvas.findByRole("heading", { name: "Add New Tracking Item" })).toBeVisible();
  },
};

export const Loading: Story = {
  // The list request never settles, so the page stays on its loading state.
  beforeEach: () => installAccountApi({ user: SAMPLE_USER, tracking: "pending" }),
};

// The page logs "Error fetching tracking items:" in its catch block. That log is
// the expected outcome of this story, so it is silenced here (and restored on
// cleanup) to keep the smoke run clean. The visible "Sync problem" notice is what
// the story checks.
const EXPECTED_LOAD_LOG = "Error fetching tracking items:";

export const LoadError: Story = {
  beforeEach: () => {
    const restoreApi = installAccountApi({ user: SAMPLE_USER, tracking: "error" });
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      if (String(args[0]).startsWith(EXPECTED_LOAD_LOG)) return;
      originalError(...args);
    };
    return () => {
      console.error = originalError;
      restoreApi();
    };
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Sync problem")).toBeVisible();
  },
};

export const Mobile: Story = {
  beforeEach: () => installAccountApi({ user: SAMPLE_USER, tracking: SAMPLE_TRACKING_ITEMS }),
  globals: { viewport: { value: "w375" } },
};

export const Dark: Story = {
  beforeEach: () => installAccountApi({ user: SAMPLE_USER, tracking: SAMPLE_TRACKING_ITEMS }),
  globals: { theme: "dark" },
};
