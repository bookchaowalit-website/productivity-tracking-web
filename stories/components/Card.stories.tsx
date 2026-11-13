import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SAMPLE_STAT_COUNTS, SAMPLE_TRACKING_ITEMS } from "../fixtures/tracking";

const meta = {
  title: "Components/Card",
  component: Card,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Card>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>Frieren: Beyond Journey&apos;s End</CardTitle>
        <CardDescription>By Madhouse · 2023</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          A quiet fantasy about the time that remains after the hero&apos;s journey ends.
        </p>
      </CardContent>
      <CardFooter className="gap-2">
        <Button size="sm" variant="outline">Edit</Button>
      </CardFooter>
    </Card>
  ),
};

export const HeaderOnly: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>Weekly Systems Review</CardTitle>
      </CardHeader>
    </Card>
  ),
};

export const LongTitle: Story = {
  render: () => (
    <Card className="w-72">
      <CardHeader>
        <CardTitle className="line-clamp-2">{SAMPLE_TRACKING_ITEMS[7].title}</CardTitle>
        <CardDescription>{SAMPLE_TRACKING_ITEMS[7].author}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="line-clamp-3 text-sm text-muted-foreground">{SAMPLE_TRACKING_ITEMS[7].description}</p>
      </CardContent>
    </Card>
  ),
};

// The results grid: the same card anatomy the home page renders, from fixtures.
export const ResultsGrid: Story = {
  render: () => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {SAMPLE_TRACKING_ITEMS.slice(0, 6).map((tracking) => (
        <Card key={tracking.id} className="flex flex-col">
          <CardHeader>
            <CardTitle className="line-clamp-2">{tracking.title}</CardTitle>
            {tracking.author && <CardDescription>By {tracking.author}</CardDescription>}
          </CardHeader>
          <CardContent className="flex-1">
            {tracking.description && (
              <p className="mb-2 line-clamp-3 text-sm text-muted-foreground">{tracking.description}</p>
            )}
            <p className="text-sm font-medium">{tracking.userTrackings[0]?.status.replace(/_/g, " ")}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  ),
};

// The four stat tiles above the results (text-3xl values, derived from the fixture).
export const StatTiles: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {[
        ["Total Items", SAMPLE_STAT_COUNTS.total],
        ["In progress", SAMPLE_STAT_COUNTS.inProgress],
        ["Completed", SAMPLE_STAT_COUNTS.completed],
        ["Favorites", SAMPLE_STAT_COUNTS.favorites],
      ].map(([label, value]) => (
        <Card key={label} className="tracking-stat">
          <CardHeader className="pb-2">
            <CardDescription>{label}</CardDescription>
            <CardTitle className="text-3xl">{value}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  ),
};

export const Mobile: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      {[SAMPLE_STAT_COUNTS.total, SAMPLE_STAT_COUNTS.inProgress].map((value, index) => (
        <Card key={index}>
          <CardHeader className="pb-2">
            <CardDescription>{index === 0 ? "Total Items" : "In progress"}</CardDescription>
            <CardTitle className="text-3xl">{value}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  ),
  globals: { viewport: { value: "w375" } },
};

export const Dark: Story = {
  render: Default.render,
  globals: { theme: "dark" },
};
