import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Heart, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const VARIANTS = ["default", "destructive", "outline", "secondary", "ghost", "link"] as const;
const SIZES = ["default", "sm", "lg", "icon"] as const;

const meta = {
  title: "Components/Button",
  component: Button,
  args: { children: "Add signal", variant: "default", size: "default", disabled: false },
  argTypes: {
    variant: { control: "select", options: [...VARIANTS] },
    size: { control: "select", options: [...SIZES] },
  },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-3">
      {VARIANTS.map((variant) => (
        <Button key={variant} {...args} variant={variant}>
          {variant}
        </Button>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} size="sm">Small</Button>
      <Button {...args} size="default">Default</Button>
      <Button {...args} size="lg">Large</Button>
      <Button {...args} size="icon" aria-label="Search">
        <Search />
      </Button>
    </div>
  ),
};

export const Disabled: Story = { args: { disabled: true } };

export const DisabledVariants: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-3">
      {VARIANTS.map((variant) => (
        <Button key={variant} {...args} variant={variant} disabled>
          {variant}
        </Button>
      ))}
    </div>
  ),
};

export const WithIcon: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-3">
      <Button {...args}>
        <Plus className="mr-2 h-5 w-5" /> Add signal
      </Button>
      <Button {...args} variant="outline">
        <Search className="mr-2 h-4 w-4" /> Search
      </Button>
    </div>
  ),
};

// The favourite toggle on each collection card: pressed and unpressed states.
export const FavoriteToggle: Story = {
  render: () => (
    <div className="flex gap-3">
      {[false, true].map((isFavorite) => (
        <Button
          key={String(isFavorite)}
          variant="ghost"
          size="icon"
          aria-label={isFavorite ? "Remove Frieren from favorites" : "Add Frieren to favorites"}
          aria-pressed={isFavorite}
        >
          <Heart className={`h-5 w-5 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
        </Button>
      ))}
    </div>
  ),
};

// The "Favorites only" filter: default (on) and outline (off).
export const FilterToggle: Story = {
  render: () => (
    <div className="flex gap-3">
      <Button variant="default">
        <Heart className="mr-2 h-5 w-5 fill-current" /> Favorites only
      </Button>
      <Button variant="outline">
        <Heart className="mr-2 h-5 w-5" /> Favorites only
      </Button>
    </div>
  ),
};

export const AsLink: Story = {
  render: (args) => (
    <Button {...args} asChild>
      <a href="/more-projects">More projects</a>
    </Button>
  ),
};

export const LongLabel: Story = {
  args: {
    children: "Export every tracking item with its notes, ratings, progress and dates as one CSV file",
  },
  render: (args) => (
    <div className="w-72">
      <Button {...args} className="w-full" />
    </div>
  ),
};
