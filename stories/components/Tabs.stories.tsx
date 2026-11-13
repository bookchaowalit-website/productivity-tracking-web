import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BookOpen, Film, MoreHorizontal, PlayCircle, Tv } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const meta = {
  title: "Components/Tabs",
  component: Tabs,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Tabs>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-[480px]">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <p className="text-sm text-muted-foreground">Counts and the next item to pick up.</p>
      </TabsContent>
      <TabsContent value="notes">
        <p className="text-sm text-muted-foreground">Free-form notes stay on the item.</p>
      </TabsContent>
      <TabsContent value="history">
        <p className="text-sm text-muted-foreground">Status changes, newest first.</p>
      </TabsContent>
    </Tabs>
  ),
};

export const DisabledTab: Story = {
  render: () => (
    <Tabs defaultValue="all">
      <TabsList>
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="anime">Anime</TabsTrigger>
        <TabsTrigger value="archived" disabled>
          Archived
        </TabsTrigger>
      </TabsList>
      <TabsContent value="all">
        <p className="text-sm text-muted-foreground">The archived tab cannot be selected.</p>
      </TabsContent>
    </Tabs>
  ),
};

// The category rail from the home page: more tabs than fit on a phone, scrolled horizontally.
// Like the page, every trigger points aria-controls at one shared results region.
const CATEGORY_TABS = [
  { value: "all", label: "All", icon: MoreHorizontal },
  { value: "ANIME", label: "Anime", icon: PlayCircle },
  { value: "MANGA", label: "Manga", icon: BookOpen },
  { value: "MOVIE", label: "Movies", icon: Film },
  { value: "TV_SHOW", label: "TV Shows", icon: Tv },
  { value: "BOOK", label: "Books", icon: BookOpen },
  { value: "GAME", label: "Games", icon: MoreHorizontal },
  { value: "PODCAST", label: "Podcasts", icon: MoreHorizontal },
  { value: "WEBSITE", label: "Websites", icon: MoreHorizontal },
  { value: "OTHER", label: "Other", icon: MoreHorizontal },
];

export const CategoryRail: Story = {
  render: () => (
    <Tabs defaultValue="ANIME" className="max-w-full">
      <div className="overflow-x-auto">
        <TabsList className="flex w-full justify-start">
          {CATEGORY_TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger key={value} value={value} aria-controls="category-results" className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <div id="category-results" className="mt-4 text-sm text-muted-foreground">
        Results for the selected category appear here.
      </div>
    </Tabs>
  ),
};

export const CategoryRailMobile: Story = { ...CategoryRail, globals: { viewport: { value: "w375" } } };

export const Dark: Story = { ...CategoryRail, globals: { theme: "dark" } };
