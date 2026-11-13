import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Options match the status and rating selects on each collection card.
const STATUS_OPTIONS = [
  { value: "PLAN_TO_WATCH", label: "Planned" },
  { value: "WATCHING", label: "In progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ON_HOLD", label: "On hold" },
  { value: "DROPPED", label: "Dropped" },
];
const RATING_OPTIONS = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN"].map(
  (value, index) => ({ value, label: `${index + 1}/10` }),
);

interface StatusSelectProps {
  defaultValue?: string;
  defaultOpen?: boolean;
  disabled?: boolean;
}

function StatusSelect({ defaultValue, defaultOpen, disabled }: StatusSelectProps) {
  return (
    <Select defaultValue={defaultValue} defaultOpen={defaultOpen} disabled={disabled}>
      <SelectTrigger aria-label="Status for Frieren" className="w-56">
        <SelectValue placeholder="Set Status" />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const meta = {
  title: "Components/Select",
  component: StatusSelect,
  args: {},
  parameters: { layout: "padded" },
} satisfies Meta<typeof StatusSelect>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Placeholder: Story = {};

export const WithValue: Story = { args: { defaultValue: "WATCHING" } };

export const OpenList: Story = {
  args: { defaultValue: "WATCHING", defaultOpen: true },
  // The list is portalled to the body, so the canvas can be taller than the trigger.
  decorators: [(Story) => <div className="min-h-72 pb-2"><Story /></div>],
};

export const Disabled: Story = { args: { defaultValue: "COMPLETED", disabled: true } };

export const RatingSelect: Story = {
  render: () => (
    <Select defaultValue="NINE">
      <SelectTrigger aria-label="Rating for Arcane" className="w-24">
        <SelectValue placeholder="Rate" />
      </SelectTrigger>
      <SelectContent>
        {RATING_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ),
};

export const GroupedWithSeparator: Story = {
  render: () => (
    <Select>
      <SelectTrigger aria-label="Filter by status" className="w-56">
        <SelectValue placeholder="Choose a status" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Active</SelectLabel>
          <SelectItem value="WATCHING">In progress</SelectItem>
          <SelectItem value="PLAN_TO_WATCH">Planned</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Finished</SelectLabel>
          <SelectItem value="COMPLETED">Completed</SelectItem>
          <SelectItem value="DROPPED">Dropped</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};

export const Mobile: Story = { args: { defaultValue: "WATCHING" }, globals: { viewport: { value: "w375" } } };

export const Dark: Story = { args: { defaultValue: "WATCHING" }, globals: { theme: "dark" } };
