import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { ConsentChoicesLink } from "@/components/analytics/consent-banner";

// The small "Analytics choices" link shown above the footer once a choice is stored.
const meta = {
  title: "Components/ConsentChoicesLink",
  component: ConsentChoicesLink,
  args: { onOpen: fn() },
  parameters: { layout: "padded" },
} satisfies Meta<typeof ConsentChoicesLink>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OpenClicked: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Analytics choices" }));
    await expect(args.onOpen).toHaveBeenCalledTimes(1);
  },
};

export const Dark: Story = { globals: { theme: "dark" } };
