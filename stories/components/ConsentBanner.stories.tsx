import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { ConsentBanner } from "@/components/analytics/consent-banner";

// PDPA analytics banner. The app only shows it when analytics is configured,
// so these stories render the component directly with the visible state.
const meta = {
  title: "Components/ConsentBanner",
  component: ConsentBanner,
  args: { onAccept: fn(), onDecline: fn(), reveal: false },
  parameters: { layout: "padded" },
} satisfies Meta<typeof ConsentBanner>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Visible: Story = {};

// Reopened from "Analytics choices": scrolled into view and focused.
export const Reveal: Story = { args: { reveal: true } };

export const AcceptClicked: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Allow analytics" }));
    await expect(args.onAccept).toHaveBeenCalledTimes(1);
    await expect(args.onDecline).not.toHaveBeenCalled();
  },
};

export const DeclineClicked: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Decline" }));
    await expect(args.onDecline).toHaveBeenCalledTimes(1);
    await expect(args.onAccept).not.toHaveBeenCalled();
  },
};

export const Mobile: Story = { globals: { viewport: { value: "w375" } } };

export const Dark: Story = { globals: { theme: "dark" } };
