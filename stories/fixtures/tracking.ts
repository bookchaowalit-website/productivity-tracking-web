// Sample tracking rows shaped like the GET /api/tracking payload that
// src/app/page.tsx renders. Plain string unions stand in for the Prisma enums so
// stories never import @prisma/client. All titles and people are invented.

export type SampleCategory =
  | "ANIME" | "MANGA" | "MOVIE" | "TV_SHOW" | "BOOK" | "WEBSITE" | "PODCAST" | "GAME" | "OTHER";
export type SampleStatus = "PLAN_TO_WATCH" | "WATCHING" | "COMPLETED" | "ON_HOLD" | "DROPPED";
export type SampleRating =
  | "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE" | "SIX" | "SEVEN" | "EIGHT" | "NINE" | "TEN";

export interface SampleTrackingItem {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  externalUrl: string | null;
  category: SampleCategory;
  author: string | null;
  year: number | null;
  genres: string[];
  totalEpisodes: number | null;
  totalChapters: number | null;
  totalBooks: number | null;
  userTrackings: Array<{
    status: SampleStatus;
    rating: SampleRating | null;
    progress: number | null;
    startDate: string | null;
    finishDate: string | null;
    priority: number | null;
    isFavorite: boolean;
  }>;
  _count: { userTrackings: number };
}

function item(
  id: string,
  fields: Omit<SampleTrackingItem, "id" | "imageUrl" | "externalUrl" | "userTrackings" | "_count"> & {
    status: SampleStatus;
    rating?: SampleRating | null;
    progress?: number | null;
    isFavorite?: boolean;
    priority?: number | null;
  },
): SampleTrackingItem {
  const { status, rating = null, progress = null, isFavorite = false, priority = null, ...rest } = fields;
  return {
    id,
    imageUrl: null,
    externalUrl: null,
    ...rest,
    userTrackings: [{ status, rating, progress, startDate: null, finishDate: null, priority, isFavorite }],
    _count: { userTrackings: 1 },
  };
}

// Covers every category tab, every status, progress with and without a total,
// favourites, ratings, empty genres, a null description and a long title.
export const SAMPLE_TRACKING_ITEMS: SampleTrackingItem[] = [
  item("sample-frieren", {
    title: "Frieren: Beyond Journey's End",
    description: "A quiet fantasy about the time that remains after the hero's journey ends.",
    category: "ANIME",
    author: "Madhouse",
    year: 2023,
    genres: ["Fantasy", "Adventure", "Drama", "Slice of life"],
    totalEpisodes: 28,
    totalChapters: null,
    totalBooks: null,
    status: "WATCHING",
    progress: 12,
    isFavorite: true,
    priority: 1,
  }),
  item("sample-berserk", {
    title: "Berserk",
    description: "A mercenary carries a sword too heavy for anyone else to lift.",
    category: "MANGA",
    author: "Kentaro Miura",
    year: 1989,
    genres: ["Dark fantasy"],
    totalEpisodes: null,
    totalChapters: 374,
    totalBooks: null,
    status: "ON_HOLD",
    progress: 140,
    rating: "EIGHT",
  }),
  item("sample-dune-part-two", {
    title: "Dune: Part Two",
    description: "A film waiting for its next session.",
    category: "MOVIE",
    author: "Denis Villeneuve",
    year: 2024,
    genres: ["Science fiction", "Drama"],
    totalEpisodes: null,
    totalChapters: null,
    totalBooks: null,
    status: "PLAN_TO_WATCH",
    isFavorite: true,
  }),
  item("sample-arcane", {
    title: "Arcane",
    description: "A series that is finished and rated.",
    category: "TV_SHOW",
    author: "Fortiche",
    year: 2021,
    genres: ["Animation", "Fantasy"],
    totalEpisodes: 18,
    totalChapters: null,
    totalBooks: null,
    status: "COMPLETED",
    progress: 18,
    rating: "NINE",
    isFavorite: true,
  }),
  item("sample-ddia", {
    title: "Designing Data-Intensive Applications",
    description: "A reference book parked in the reading queue.",
    category: "BOOK",
    author: "Martin Kleppmann",
    year: 2017,
    genres: ["Systems", "Engineering"],
    totalEpisodes: null,
    totalChapters: 12,
    totalBooks: 1,
    status: "WATCHING",
    progress: 4,
  }),
  item("sample-game-dropped", {
    title: "Hollow Lantern",
    description: "Dropped after the first long boss fight.",
    category: "GAME",
    author: "Small Studio",
    year: 2019,
    genres: ["Metroidvania"],
    totalEpisodes: null,
    totalChapters: null,
    totalBooks: null,
    status: "DROPPED",
    rating: "THREE",
  }),
  item("sample-podcast", {
    title: "Weekly Systems Review",
    description: null,
    category: "PODCAST",
    author: null,
    year: null,
    genres: [],
    totalEpisodes: null,
    totalChapters: null,
    totalBooks: null,
    status: "WATCHING",
    progress: 30,
  }),
  item("sample-long-title-website", {
    title:
      "A very long article title that keeps going so the card header has to clamp it to two lines instead of pushing the grid apart",
    description:
      "Long descriptions are clamped to three lines in the grid. This sample checks that the clamp holds and the status select stays reachable.",
    category: "WEBSITE",
    author: "Anonymous Essayist",
    year: 2025,
    genres: ["Essay", "Design", "Productivity", "Writing", "Notes"],
    totalEpisodes: null,
    totalChapters: null,
    totalBooks: null,
    status: "PLAN_TO_WATCH",
    rating: "FOUR",
  }),
];

// Derived counts the page shows in its stat tiles; kept next to the fixture so
// the story text can name them without recomputing.
export const SAMPLE_STAT_COUNTS = {
  total: SAMPLE_TRACKING_ITEMS.length,
  inProgress: SAMPLE_TRACKING_ITEMS.filter((i) => i.userTrackings[0]?.status === "WATCHING").length,
  completed: SAMPLE_TRACKING_ITEMS.filter((i) => i.userTrackings[0]?.status === "COMPLETED").length,
  favorites: SAMPLE_TRACKING_ITEMS.filter((i) => i.userTrackings[0]?.isFavorite).length,
};
