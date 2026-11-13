import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SiteFooter } from "@/components/site-footer";

// Rendered by the root layout after the page content; the page stories show it in place.
const meta = {
  title: "Components/SiteFooter",
  component: SiteFooter,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof SiteFooter>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Mobile: Story = { globals: { viewport: { value: "w375" } } };

export const Dark: Story = { globals: { theme: "dark" } };
