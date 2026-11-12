// Tracking enums shared with the tracking cell (SPEC-003). They used to come from the Prisma client;
// the tracking tables now live in the cell, so the web keeps its own copy of the value lists.
export const ContentCategory = {
  ANIME: 'ANIME', MANGA: 'MANGA', MOVIE: 'MOVIE', TV_SHOW: 'TV_SHOW', BOOK: 'BOOK',
  WEBSITE: 'WEBSITE', PODCAST: 'PODCAST', GAME: 'GAME', OTHER: 'OTHER',
} as const;
export type ContentCategory = (typeof ContentCategory)[keyof typeof ContentCategory];

export const TrackingStatus = {
  PLAN_TO_WATCH: 'PLAN_TO_WATCH', WATCHING: 'WATCHING', COMPLETED: 'COMPLETED', ON_HOLD: 'ON_HOLD', DROPPED: 'DROPPED',
} as const;
export type TrackingStatus = (typeof TrackingStatus)[keyof typeof TrackingStatus];

export const RatingScale = {
  ONE: 'ONE', TWO: 'TWO', THREE: 'THREE', FOUR: 'FOUR', FIVE: 'FIVE',
  SIX: 'SIX', SEVEN: 'SEVEN', EIGHT: 'EIGHT', NINE: 'NINE', TEN: 'TEN',
} as const;
export type RatingScale = (typeof RatingScale)[keyof typeof RatingScale];
