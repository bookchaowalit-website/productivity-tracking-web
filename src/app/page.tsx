"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { analytics } from '@/lib/browser-analytics'
import {
  Plus,
  Search,
  Star,
  Clock,
  CheckCircle2,
  PauseCircle,
  XCircle,
  Heart,
  PlayCircle,
  BookOpen,
  Film,
  Tv,
  Headphones,
  Gamepad2,
  Globe,
  MoreHorizontal
} from 'lucide-react'
import { ContentCategory, TrackingStatus, RatingScale } from '@prisma/client'

interface TrackingItem {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  externalUrl: string | null
  category: ContentCategory
  author: string | null
  year: number | null
  genres: string[]
  totalEpisodes: number | null
  totalChapters: number | null
  totalBooks: number | null
  userTrackings: Array<{
    status: TrackingStatus
    rating: RatingScale | null
    progress: number | null
    startDate: string | null
    finishDate: string | null
    priority: number | null
    isFavorite: boolean
  }>
  _count: {
    userTrackings: number
  }
}

// Data passed from the Add Item form
interface AddItemForm {
  title: string
  description?: string | null
  category: ContentCategory
  author?: string | null
  year?: number | null
  genres?: string[]
  imageUrl?: string | null
  externalUrl?: string | null
  totalEpisodes?: number | null
  totalChapters?: number | null
  totalBooks?: number | null
}

const DEMO_STORAGE_KEY = 'trackit-demo-items-v1'
const DEMO_NOTICE = 'Demo workspace — the database is unavailable, so changes stay in this browser.'
const LOAD_ERROR_NOTICE = 'Your saved list could not be loaded. Try again in a moment.'
const SAVE_ERROR_NOTICE = 'That change could not be saved. Your saved list was not changed.'
const SIGNED_OUT_NOTICE = 'Demo workspace — sign in to load your saved list. Until then, changes stay in this browser.'

const DEMO_ITEMS: TrackingItem[] = [
  {
    id: 'demo-dune-part-two',
    title: 'Dune: Part Two',
    description: 'A quiet example of a film waiting for its next session.',
    imageUrl: null,
    externalUrl: null,
    category: ContentCategory.MOVIE,
    author: 'Denis Villeneuve',
    year: 2024,
    genres: ['Science fiction', 'Drama'],
    totalEpisodes: null,
    totalChapters: null,
    totalBooks: null,
    userTrackings: [{ status: TrackingStatus.PLAN_TO_WATCH, rating: null, progress: null, startDate: null, finishDate: null, priority: 2, isFavorite: true }],
    _count: { userTrackings: 1 },
  },
  {
    id: 'demo-designing-data-intensive-applications',
    title: 'Designing Data-Intensive Applications',
    description: 'A reference book parked in the reading queue.',
    imageUrl: null,
    externalUrl: null,
    category: ContentCategory.BOOK,
    author: 'Martin Kleppmann',
    year: 2017,
    genres: ['Systems', 'Engineering'],
    totalEpisodes: null,
    totalChapters: 12,
    totalBooks: 1,
    userTrackings: [{ status: TrackingStatus.WATCHING, rating: null, progress: 4, startDate: null, finishDate: null, priority: 1, isFavorite: false }],
    _count: { userTrackings: 1 },
  },
  {
    id: 'demo-arcane',
    title: 'Arcane',
    description: 'A series example showing progress and a completed state.',
    imageUrl: null,
    externalUrl: null,
    category: ContentCategory.TV_SHOW,
    author: 'Fortiche',
    year: 2021,
    genres: ['Animation', 'Fantasy'],
    totalEpisodes: 18,
    totalChapters: null,
    totalBooks: null,
    userTrackings: [{ status: TrackingStatus.COMPLETED, rating: RatingScale.NINE, progress: 18, startDate: null, finishDate: null, priority: null, isFavorite: true }],
    _count: { userTrackings: 1 },
  },
]

const categoryIcons: Record<ContentCategory, React.ReactNode> = {
  ANIME: <PlayCircle className="w-4 h-4" />,
  MANGA: <BookOpen className="w-4 h-4" />,
  MOVIE: <Film className="w-4 h-4" />,
  TV_SHOW: <Tv className="w-4 h-4" />,
  BOOK: <BookOpen className="w-4 h-4" />,
  WEBSITE: <Globe className="w-4 h-4" />,
  PODCAST: <Headphones className="w-4 h-4" />,
  GAME: <Gamepad2 className="w-4 h-4" />,
  OTHER: <MoreHorizontal className="w-4 h-4" />
}

const statusColors: Record<TrackingStatus, string> = {
  PLAN_TO_WATCH: 'bg-gray-500',
  WATCHING: 'bg-blue-500',
  COMPLETED: 'bg-green-500',
  ON_HOLD: 'bg-yellow-500',
  DROPPED: 'bg-red-500'
}

const statusLabels: Record<TrackingStatus, string> = {
  PLAN_TO_WATCH: 'Plan to Watch',
  WATCHING: 'Watching',
  COMPLETED: 'Completed',
  ON_HOLD: 'On Hold',
  DROPPED: 'Dropped'
}

const _statusIcons: Record<TrackingStatus, React.ReactNode> = {
  PLAN_TO_WATCH: <Clock className="w-4 h-4" />,
  WATCHING: <PlayCircle className="w-4 h-4" />,
  COMPLETED: <CheckCircle2 className="w-4 h-4" />,
  ON_HOLD: <PauseCircle className="w-4 h-4" />,
  DROPPED: <XCircle className="w-4 h-4" />
}

export default function DashboardPage() {
  const [trackingItems, setTrackingItems] = useState<TrackingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<ContentCategory | 'all'>('all')
  const [selectedStatus, setSelectedStatus] = useState<TrackingStatus | 'all'>('all')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [dataNotice, setDataNotice] = useState<string | null>(null)

  // The server derives the user from the session; the client never names one.
  const { data: session, status: authStatus } = useSession()
  // Changes on sign-in, sign-out and a direct switch from one user to another.
  const isSignedIn = authStatus === 'authenticated'
  const sessionKey = isSignedIn ? `user:${session?.user?.id ?? ''}` : authStatus
  // Bumped on every auth change so a read started under an earlier session
  // can never write its (possibly another user's) result into state.
  const readGeneration = useRef(0)
  const pendingRead = useRef<AbortController | null>(null)

  const readDemoItems = useCallback(() => {
    try {
      const stored = window.localStorage.getItem(DEMO_STORAGE_KEY)
      if (stored) return JSON.parse(stored) as TrackingItem[]
    } catch (error) {
      console.warn('Unable to read local demo data:', error)
    }
    return DEMO_ITEMS
  }, [])

  const saveDemoItems = useCallback((items: TrackingItem[]) => {
    try {
      window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(items))
    } catch (error) {
      console.warn('Unable to save local demo data:', error)
    }
  }, [])

  const activateDemoMode = useCallback((notice = DEMO_NOTICE) => {
    const items = readDemoItems()
    setIsDemoMode(true)
    setDataNotice(notice)
    setTrackingItems(items)
    saveDemoItems(items)
  }, [readDemoItems, saveDemoItems])

  const updateDemoItems = (update: (_items: TrackingItem[]) => TrackingItem[]) => {
    const currentItems = trackingItems.length > 0 ? trackingItems : readDemoItems()
    const nextItems = update(currentItems)
    setIsDemoMode(true)
    setDataNotice(DEMO_NOTICE)
    setTrackingItems(nextItems)
    saveDemoItems(nextItems)
  }

  const fetchTrackingItems = useCallback(async () => {
    const generation = readGeneration.current
    const controller = new AbortController()
    pendingRead.current?.abort()
    pendingRead.current = controller
    const isStale = () => generation !== readGeneration.current
    try {
      const response = await fetch('/api/tracking', { signal: controller.signal, cache: 'no-store' })
      if (!response.ok) throw new Error(`Tracking API returned ${response.status}`)
      const data = await response.json()
      if (isStale()) return
      if (!Array.isArray(data)) throw new Error('Tracking API returned an invalid payload')
      setTrackingItems(data)
      setIsDemoMode(false)
      setDataNotice(null)
    } catch (error) {
      if (isStale()) return
      console.error('Error fetching tracking items:', error)
      // Signed-in users never fall back to the browser-local demo list, so
      // nothing they do afterwards can land in demo storage.
      setDataNotice(LOAD_ERROR_NOTICE)
    } finally {
      if (pendingRead.current === controller) pendingRead.current = null
      if (!isStale()) setLoading(false)
    }
  }, [])

  useEffect(() => {
    readGeneration.current += 1
    pendingRead.current?.abort()
    pendingRead.current = null
    // Never keep the previous identity's list while the next one loads.
    setTrackingItems([])
    setIsDemoMode(false)
    setDataNotice(null)
    if (authStatus === 'loading') return
    if (authStatus === 'authenticated') {
      setLoading(true)
      fetchTrackingItems()
    } else {
      activateDemoMode(SIGNED_OUT_NOTICE)
      setLoading(false)
    }
  }, [sessionKey, authStatus, activateDemoMode, fetchTrackingItems])

  // Signed-in writes go to the API only. The server takes the user from the
  // session; the body names the user this view shows only as an assertion, so
  // if another tab switched the cookie to a different account the server
  // refuses the write with 403 instead of applying it to that account. A write
  // that finishes after the session changed is ignored rather than refreshing
  // another identity's view.
  const saveTracking = async (method: 'POST' | 'PUT' | 'DELETE', body: Record<string, unknown>) => {
    const viewUserId = session?.user?.id
    if (!viewUserId) return false
    const generation = readGeneration.current
    const isStale = () => generation !== readGeneration.current
    try {
      const response = await fetch('/api/tracking', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, userId: viewUserId }),
        cache: 'no-store',
      })
      if (isStale()) return false
      if (!response.ok) throw new Error(`Tracking API returned ${response.status}`)
      await fetchTrackingItems()
      return true
    } catch (error) {
      if (isStale()) return false
      console.error(`Error saving tracking change (${method}):`, error)
      setDataNotice(SAVE_ERROR_NOTICE)
      return false
    }
  }

  const filteredItems = useMemo(() => {
    let filtered = [...trackingItems]

    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.author?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory)
    }

    if (selectedStatus !== 'all') {
      filtered = filtered.filter(item =>
        item.userTrackings[0]?.status === selectedStatus
      )
    }

    if (showFavoritesOnly) {
      filtered = filtered.filter(item =>
        item.userTrackings[0]?.isFavorite
      )
    }

    return filtered
  }, [trackingItems, searchQuery, selectedCategory, selectedStatus, showFavoritesOnly])

  // One count per search, not per keystroke; the query text is never sent.
  const hasSearch = searchQuery.trim() !== ''
  useEffect(() => {
    if (!hasSearch) return
    const timer = setTimeout(() => analytics.track('collection_filtered', { filter: 'search' }), 800)
    return () => clearTimeout(timer)
  }, [hasSearch])

  const handleAddItem = async (itemData: AddItemForm) => {
    const addLocalItem = () => {
      const item: TrackingItem = {
        id: `demo-${Date.now()}`,
        title: itemData.title,
        description: itemData.description || null,
        imageUrl: itemData.imageUrl || null,
        externalUrl: itemData.externalUrl || null,
        category: itemData.category,
        author: itemData.author || null,
        year: itemData.year || null,
        genres: itemData.genres || [],
        totalEpisodes: itemData.totalEpisodes || null,
        totalChapters: itemData.totalChapters || null,
        totalBooks: itemData.totalBooks || null,
        userTrackings: [{ status: TrackingStatus.PLAN_TO_WATCH, rating: null, progress: null, startDate: null, finishDate: null, priority: null, isFavorite: false }],
        _count: { userTrackings: 1 },
      }
      updateDemoItems((items) => [item, ...items])
      setShowAddModal(false)
    }

    if (!isSignedIn) {
      // Demo mode is only ever entered while signed out; during the session
      // check neither the API nor demo storage is written.
      if (isDemoMode) addLocalItem()
      return
    }

    if (await saveTracking('POST', { ...itemData })) setShowAddModal(false)
  }

  const handleUpdateStatus = async (itemId: string, status: TrackingStatus) => {
    const updateLocalStatus = () => updateDemoItems((items) => items.map((item) => item.id === itemId
      ? { ...item, userTrackings: item.userTrackings.map((tracking, index) => index === 0 ? { ...tracking, status } : tracking) }
      : item))

    if (!isSignedIn) {
      if (isDemoMode) updateLocalStatus()
      return
    }

    await saveTracking('PUT', { itemId, status })
  }

  const handleToggleFavorite = async (itemId: string, isFavorite: boolean) => {
    const updateLocalFavorite = () => updateDemoItems((items) => items.map((item) => item.id === itemId
      ? { ...item, userTrackings: item.userTrackings.map((tracking, index) => index === 0 ? { ...tracking, isFavorite: !isFavorite } : tracking) }
      : item))

    if (!isSignedIn) {
      if (isDemoMode) updateLocalFavorite()
      return
    }

    await saveTracking('PUT', { itemId, isFavorite: !isFavorite })
  }

  const handleRateItem = async (itemId: string, rating: RatingScale) => {
    const updateLocalRating = () => updateDemoItems((items) => items.map((item) => item.id === itemId
      ? { ...item, userTrackings: item.userTrackings.map((tracking, index) => index === 0 ? { ...tracking, rating } : tracking) }
      : item))

    if (!isSignedIn) {
      if (isDemoMode) updateLocalRating()
      return
    }

    await saveTracking('PUT', { itemId, rating })
  }

  const getProgressText = (item: TrackingItem) => {
    const progress = item.userTrackings[0]?.progress
    if (!progress) return null

    if (item.category === 'ANIME' || item.category === 'TV_SHOW') {
      return `${progress}/${item.totalEpisodes || '?'} episodes`
    } else if (item.category === 'MANGA') {
      return `${progress}/${item.totalChapters || '?'} chapters`
    } else if (item.category === 'BOOK') {
      return `${progress}/${item.totalBooks || 1} books`
    }
    return `Progress: ${progress}`
  }

  const renderStars = (rating: RatingScale | null) => {
    if (!rating) return null
    const ratingValue = Object.keys(RatingScale).indexOf(rating) + 1
    return (
      <div className="flex items-center gap-1">
        {[...Array(10)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i < ratingValue ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
          />
        ))}
        <span className="ml-2 text-sm text-muted-foreground">{ratingValue}/10</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="tracking-console min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your tracking list...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="tracking-console min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Header */}
      <header className="tracking-console-header border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="tracking-console-logo bg-primary text-primary-foreground p-2 rounded-lg">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">TRACKIT</h1>
                <p className="text-xs text-muted-foreground">personal media constellation</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {authStatus === 'authenticated' ? (
                <Button variant="outline" onClick={() => signOut()}>Sign out</Button>
              ) : (
                <Button variant="outline" onClick={() => signIn()} disabled={authStatus === 'loading'}>Sign in</Button>
              )}
              <Button onClick={() => setShowAddModal(true)} size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Add signal
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {dataNotice && (
          <div className="tracking-console-notice mb-6 flex items-start gap-3 px-4 py-3" role="status">
            <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{isDemoMode ? 'Local demo mode' : 'Sync problem'}</p>
              <p className="mt-1 text-sm text-muted-foreground">{dataNotice}</p>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="tracking-console-controls mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                placeholder="Search the constellation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showFavoritesOnly ? 'default' : 'outline'}
              onClick={() => {
                setShowFavoritesOnly(!showFavoritesOnly)
                analytics.track('collection_filtered', { filter: 'favorites' })
              }}
            >
              <Heart className={`w-5 h-5 mr-2 ${showFavoritesOnly ? 'fill-current' : ''}`} />
              Favorites only
            </Button>
          </div>
        </div>

        {/* Category Tabs */}
        <Tabs
          value={selectedCategory}
          onValueChange={(value) => {
            setSelectedCategory(value as ContentCategory | 'all')
            analytics.track('collection_filtered', { filter: 'category' })
          }}
          className="mb-8"
        >
          <TabsList className="flex w-full justify-start">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <MoreHorizontal className="w-4 h-4" />
              All
            </TabsTrigger>
            <TabsTrigger value="ANIME" className="flex items-center gap-2">
              {categoryIcons.ANIME}
              Anime
            </TabsTrigger>
            <TabsTrigger value="MANGA" className="flex items-center gap-2">
              {categoryIcons.MANGA}
              Manga
            </TabsTrigger>
            <TabsTrigger value="MOVIE" className="flex items-center gap-2">
              {categoryIcons.MOVIE}
              Movies
            </TabsTrigger>
            <TabsTrigger value="TV_SHOW" className="flex items-center gap-2">
              {categoryIcons.TV_SHOW}
              TV Shows
            </TabsTrigger>
            <TabsTrigger value="BOOK" className="flex items-center gap-2">
              {categoryIcons.BOOK}
              Books
            </TabsTrigger>
            <TabsTrigger value="GAME" className="flex items-center gap-2">
              {categoryIcons.GAME}
              Games
            </TabsTrigger>
            <TabsTrigger value="PODCAST" className="flex items-center gap-2">
              {categoryIcons.PODCAST}
              Podcasts
            </TabsTrigger>
            <TabsTrigger value="WEBSITE" className="flex items-center gap-2">
              {categoryIcons.WEBSITE}
              Websites
            </TabsTrigger>
            <TabsTrigger value="OTHER" className="flex items-center gap-2">
              {categoryIcons.OTHER}
              Other
            </TabsTrigger>
          </TabsList>

          {/* Status Filter */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant={selectedStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSelectedStatus('all')
                analytics.track('collection_filtered', { filter: 'status' })
              }}
            >
              All Status
            </Button>
            {Object.entries(TrackingStatus).map(([_key, value]) => (
              <Button
                key={value}
                variant={selectedStatus === value ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setSelectedStatus(value)
                  analytics.track('collection_filtered', { filter: 'status' })
                }}
              >
                {statusLabels[value]}
              </Button>
            ))}
          </div>
        </Tabs>

        {/* Stats Overview */}
        <div className="tracking-console-stats grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="tracking-stat">
            <CardHeader className="pb-2">
              <CardDescription>Total Items</CardDescription>
              <CardTitle className="text-3xl">{trackingItems.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="tracking-stat">
            <CardHeader className="pb-2">
              <CardDescription>Watching/Reading</CardDescription>
              <CardTitle className="text-3xl">
                {trackingItems.filter(item => item.userTrackings[0]?.status === TrackingStatus.WATCHING).length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="tracking-stat">
            <CardHeader className="pb-2">
              <CardDescription>Completed</CardDescription>
              <CardTitle className="text-3xl">
                {trackingItems.filter(item => item.userTrackings[0]?.status === TrackingStatus.COMPLETED).length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="tracking-stat">
            <CardHeader className="pb-2">
              <CardDescription>Favorites</CardDescription>
              <CardTitle className="text-3xl">
                {trackingItems.filter(item => item.userTrackings[0]?.isFavorite).length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Items Grid */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-muted rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No items found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Try adjusting your search or filters' : 'Start by adding your first tracking item'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="w-5 h-5 mr-2" />
                Add Your First Item
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => {
              const tracking = item.userTrackings[0]
              const status = tracking?.status

              return (
                <Card key={item.id} className="tracking-card flex flex-col hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-primary/10 text-primary p-2 rounded">
                          {categoryIcons[item.category]}
                        </div>
                        <span className="text-xs font-medium text-muted-foreground uppercase">
                          {item.category.replace('_', ' ')}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleFavorite(item.id, tracking?.isFavorite || false)}
                      >
                        <Heart
                          className={`w-5 h-5 ${tracking?.isFavorite ? 'fill-red-500 text-red-500' : ''}`}
                        />
                      </Button>
                    </div>
                    <CardTitle className="line-clamp-2">{item.title}</CardTitle>
                    {item.author && (
                      <CardDescription>By {item.author}</CardDescription>
                    )}
                    {item.year && (
                      <CardDescription>{item.year}</CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="flex-1">
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                        {item.description}
                      </p>
                    )}

                    {item.genres.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {item.genres.slice(0, 3).map((genre, index) => (
                          <span
                            key={index}
                            className="text-xs bg-secondary px-2 py-1 rounded-full"
                          >
                            {genre}
                          </span>
                        ))}
                        {item.genres.length > 3 && (
                          <span className="text-xs bg-secondary px-2 py-1 rounded-full">
                            +{item.genres.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {status && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
                        <span className="text-sm font-medium">{statusLabels[status]}</span>
                      </div>
                    )}

                    {tracking?.rating && renderStars(tracking.rating)}

                    {getProgressText(item) && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{getProgressText(item)}</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{
                              width: item.totalEpisodes
                                ? `${((tracking.progress || 0) / item.totalEpisodes) * 100}%`
                                : item.totalChapters
                                ? `${((tracking.progress || 0) / item.totalChapters) * 100}%`
                                : item.totalBooks
                                ? `${((tracking.progress || 0) / item.totalBooks) * 100}%`
                                : '0%'
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="flex gap-2">
                    <select
                      value={status || ''}
                      onChange={(e) => handleUpdateStatus(item.id, e.target.value as TrackingStatus)}
                      className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Set Status</option>
                      {Object.entries(TrackingStatus).map(([_key, value]) => (
                        <option key={value} value={value}>
                          {statusLabels[value]}
                        </option>
                      ))}
                    </select>
                    <select
                      value={tracking?.rating || ''}
                      onChange={(e) => e.target.value && handleRateItem(item.id, e.target.value as RatingScale)}
                      className="w-24 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Rate</option>
                      {Object.entries(RatingScale).map(([_key, value]) => (
                        <option key={value} value={value}>
                          {Object.keys(RatingScale).indexOf(value) + 1}/10
                        </option>
                      ))}
                    </select>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="tracking-modal w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Add New Tracking Item</CardTitle>
              <CardDescription>Add a new anime, manga, movie, book, or any content you want to track</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                handleAddItem({
                  title: formData.get('title') as string,
                  description: (formData.get('description') as string) || null,
                  category: formData.get('category') as ContentCategory,
                  author: (formData.get('author') as string) || null,
                  year: formData.get('year') ? parseInt(formData.get('year') as string) : null,
                  genres: formData.get('genres') ? (formData.get('genres') as string).split(',').map(g => g.trim()).filter(Boolean) : [],
                  imageUrl: (formData.get('imageUrl') as string) || null,
                  externalUrl: (formData.get('externalUrl') as string) || null,
                  totalEpisodes: formData.get('totalEpisodes') ? parseInt(formData.get('totalEpisodes') as string) : null,
                  totalChapters: formData.get('totalChapters') ? parseInt(formData.get('totalChapters') as string) : null,
                  totalBooks: formData.get('totalBooks') ? parseInt(formData.get('totalBooks') as string) : null,
                })
              }} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title *</label>
                  <Input name="title" required className="mt-1" />
                </div>

                <div>
                  <label className="text-sm font-medium">Category *</label>
                  <select name="category" required className="w-full h-10 mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Select Category</option>
                    {Object.entries(ContentCategory).map(([_key, value]) => (
                      <option key={value} value={value}>
                        {value.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Description</label>
                  <textarea name="description" className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Author</label>
                    <Input name="author" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Year</label>
                    <Input name="year" type="number" className="mt-1" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Genres (comma-separated)</label>
                  <Input name="genres" placeholder="Action, Comedy, Drama" className="mt-1" />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Total Episodes</label>
                    <Input name="totalEpisodes" type="number" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Total Chapters</label>
                    <Input name="totalChapters" type="number" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Total Books</label>
                    <Input name="totalBooks" type="number" className="mt-1" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Image URL</label>
                  <Input name="imageUrl" placeholder="https://..." className="mt-1" />
                </div>

                <div>
                  <label className="text-sm font-medium">External URL</label>
                  <Input name="externalUrl" placeholder="https://..." className="mt-1" />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1">
                    <Plus className="w-5 h-5 mr-2" />
                    Add Item
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
