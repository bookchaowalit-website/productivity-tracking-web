import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const meta = {
  title: "Components/Input",
  component: Input,
  args: { placeholder: "Search the constellation...", "aria-label": "Search", disabled: false, type: "text" },
  argTypes: {
    type: { control: "select", options: ["text", "search", "number", "email", "url"] },
  },
  decorators: [(Story) => <div className="w-80"><Story /></div>],
} satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithValue: Story = { args: { defaultValue: "Frieren" } };

export const Disabled: Story = { args: { disabled: true, defaultValue: "Locked while saving" } };

// The component has no invalid styling of its own; only aria-invalid is set here.
export const Invalid: Story = {
  args: { type: "url", defaultValue: "not a url", "aria-invalid": true, "aria-label": "External URL" },
};

export const Types: Story = {
  render: () => (
    <div className="grid w-80 gap-3">
      {[
        { type: "text", label: "Title" },
        { type: "number", label: "Year" },
        { type: "email", label: "Contact email" },
        { type: "url", label: "External URL" },
        { type: "search", label: "Search type" },
      ].map(({ type, label }) => (
        <Input key={type} type={type} aria-label={label} placeholder={label} />
      ))}
    </div>
  ),
};

export const SearchWithIcon: Story = {
  render: () => (
    <div className="relative w-80">
      <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
      <Input aria-label="Search the collection" placeholder="Search the constellation..." className="pl-10" />
    </div>
  ),
};

export const LongValue: Story = {
  args: {
    defaultValue:
      "https://example.test/a/very/long/url/path/that/keeps/going/without/any/spaces/so/it/has/to/be/clipped",
    "aria-label": "External URL",
  },
};

export const Mobile: Story = { args: { placeholder: "Search" }, globals: { viewport: { value: "w375" } } };

export const Dark: Story = { args: { placeholder: "Search" }, globals: { theme: "dark" } };
