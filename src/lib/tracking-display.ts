export type Category = 'ANIME' | 'MANGA' | 'MOVIE' | 'TV_SHOW' | 'BOOK' | 'WEBSITE' | 'PODCAST' | 'GAME' | 'OTHER'
export type Status = 'PLAN_TO_WATCH' | 'WATCHING' | 'COMPLETED' | 'ON_HOLD' | 'DROPPED'

export const STATUS_LABELS: Record<Status, string> = {
  PLAN_TO_WATCH: 'Planned',
  WATCHING: 'In progress',
  COMPLETED: 'Completed',
  ON_HOLD: 'On hold',
  DROPPED: 'Dropped',
}

export interface ProgressInput {
  category: Category
  progress: number | null | undefined
  totalEpisodes: number | null
  totalChapters: number | null
  totalBooks: number | null
}

export interface ProgressView {
  text: string
  percent: number | null
}

type ProgressUnit = 'episodes' | 'chapters' | 'books'

export function getProgress(input: ProgressInput): ProgressView | null {
  if (!input.progress) return null

  let total: number | null
  let unit: ProgressUnit

  if (input.category === 'ANIME' || input.category === 'TV_SHOW') {
    total = input.totalEpisodes
    unit = 'episodes'
  } else if (input.category === 'MANGA') {
    total = input.totalChapters
    unit = 'chapters'
  } else if (input.category === 'BOOK') {
    if (input.totalChapters !== null && input.totalChapters > 0) {
      total = input.totalChapters
      unit = 'chapters'
    } else {
      total = input.totalBooks
      unit = 'books'
    }
  } else if (input.totalEpisodes !== null && input.totalEpisodes > 0) {
    total = input.totalEpisodes
    unit = 'episodes'
  } else if (input.totalChapters !== null && input.totalChapters > 0) {
    total = input.totalChapters
    unit = 'chapters'
  } else if (input.totalBooks !== null && input.totalBooks > 0) {
    total = input.totalBooks
    unit = 'books'
  } else {
    return { text: 'Progress: ' + input.progress, percent: null }
  }

  if (total === null || total <= 0) {
    return { text: input.progress + '/? ' + unit, percent: null }
  }

  return {
    text: input.progress + '/' + total + ' ' + unit,
    percent: Math.min(100, Math.round((input.progress / total) * 100)),
  }
}

export function scrollHints(el: { scrollLeft: number; scrollWidth: number; clientWidth: number }): { left: boolean; right: boolean } {
  return {
    left: el.scrollLeft > 1,
    right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
  }
}
