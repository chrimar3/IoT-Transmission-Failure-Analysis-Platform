import { useState, useEffect, useCallback } from 'react'

interface DocumentationArticle {
  slug: string
  title: string
  description: string
  category: string
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimated_read_time: number
  last_updated: string
  content?: string
  author?: string
  tier_required?: 'free' | 'professional'
  table_of_contents?: Array<{ level: number; text: string; id: string }>
}

interface DocumentationCategory {
  title: string
  description: string
  icon: string
  order: number
  tier_required?: 'free' | 'professional'
}

interface SearchResult {
  slug: string
  title: string
  description: string
  category: string
  tags: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  tier_required: 'free' | 'professional'
  relevance_score: number
  content_preview: string
  matched_sections: string[]
  estimated_read_time: number
  last_updated: string
}

interface SearchFilters {
  category?: string
  difficulty?: string
  tags?: string[]
  tier?: string
}

interface FeedbackStats {
  average_rating: number | null
  total_ratings: number
  rating_distribution: Record<number, number>
  average_completion: number | null
  total_completions: number
  view_count: number
  average_session_duration: number | null
  helpful_percentage: number
}

interface UseDocumentationReturn {
  // Articles
  articles: DocumentationArticle[]
  categories: Record<string, DocumentationCategory>
  currentArticle: DocumentationArticle | null
  loadingArticles: boolean
  articlesError: string | null

  // Search
  searchResults: SearchResult[]
  searchLoading: boolean
  searchError: string | null
  searchQuery: string
  searchFilters: SearchFilters
  searchSuggestions: string[]

  // Feedback
  feedbackStats: FeedbackStats | null
  submittingFeedback: boolean
  feedbackError: string | null

  // Actions
  loadArticles: (filters?: { category?: string; tag?: string; difficulty?: string }) => Promise<void>
  loadArticle: (slug: string) => Promise<DocumentationArticle | null>
  searchDocumentation: (query: string, filters?: SearchFilters) => Promise<void>
  clearSearch: () => void
  submitFeedback: (data: {
    document_slug: string
    rating?: number
    feedback_text?: string
    feedback_type?: string
    session_duration_seconds?: number
    completion_percentage?: number
  }) => Promise<void>
  loadFeedbackStats: (document_slug: string) => Promise<void>

  // Utilities
  getArticlesByCategory: (category: string) => DocumentationArticle[]
  getPopularArticles: () => DocumentationArticle[]
  getRecommendedArticles: (currentSlug?: string) => DocumentationArticle[]
}

export default function useDocumentation(): UseDocumentationReturn {
  // Articles state
  const [articles, setArticles] = useState<DocumentationArticle[]>([])
  const [categories, setCategories] = useState<Record<string, DocumentationCategory>>({})
  const [currentArticle, setCurrentArticle] = useState<DocumentationArticle | null>(null)
  const [loadingArticles, setLoadingArticles] = useState(false)
  const [articlesError, setArticlesError] = useState<string | null>(null)

  // Search state
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({})
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([])

  // Feedback state
  const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null)
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [feedbackError, setFeedbackError] = useState<string | null>(null)

  // Load articles
  const loadArticles = useCallback(async (filters?: { category?: string; tag?: string; difficulty?: string }) => {
    setLoadingArticles(true)
    setArticlesError(null)

    try {
      const params = new URLSearchParams()
      if (filters?.category) params.append('category', filters.category)
      if (filters?.tag) params.append('tag', filters.tag)
      if (filters?.difficulty) params.append('difficulty', filters.difficulty)

      const response = await fetch(`/api/docs/articles?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to load articles')
      }

      const data = await response.json()
      setArticles(data.articles || [])
      setCategories(data.categories || {})
    } catch (error) {
      setArticlesError(error instanceof Error ? error.message : 'Unknown error occurred')
    } finally {
      setLoadingArticles(false)
    }
  }, [])

  // Load specific article
  const loadArticle = useCallback(async (slug: string): Promise<DocumentationArticle | null> => {
    try {
      const response = await fetch(`/api/docs/articles/${encodeURIComponent(slug)}`)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Article not found')
        }
        throw new Error('Failed to load article')
      }

      const data = await response.json()
      const article = data.article

      setCurrentArticle(article)
      return article
    } catch (error) {
      setArticlesError(error instanceof Error ? error.message : 'Unknown error occurred')
      return null
    }
  }, [])

  // Search documentation
  const searchDocumentation = useCallback(async (query: string, filters?: SearchFilters) => {
    if (!query.trim()) {
      clearSearch()
      return
    }

    setSearchLoading(true)
    setSearchError(null)
    setSearchQuery(query)
    setSearchFilters(filters || {})

    try {
      const params = new URLSearchParams({ q: query })
      if (filters?.category) params.append('category', filters.category)
      if (filters?.difficulty) params.append('difficulty', filters.difficulty)
      if (filters?.tier) params.append('tier', filters.tier)
      if (filters?.tags) {
        filters.tags.forEach(tag => params.append('tags', tag))
      }

      const response = await fetch(`/api/docs/search?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setSearchResults(data.results || [])
      setSearchSuggestions(data.suggestions || [])
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Search failed')
      setSearchResults([])
      setSearchSuggestions([])
    } finally {
      setSearchLoading(false)
    }
  }, [clearSearch])

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchResults([])
    setSearchQuery('')
    setSearchFilters({})
    setSearchSuggestions([])
    setSearchError(null)
  }, [])

  // Submit feedback
  const submitFeedback = useCallback(async (data: {
    document_slug: string
    rating?: number
    feedback_text?: string
    feedback_type?: string
    session_duration_seconds?: number
    completion_percentage?: number
  }) => {
    setSubmittingFeedback(true)
    setFeedbackError(null)

    try {
      const response = await fetch('/api/docs/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error('Failed to submit feedback')
      }

      const result = await response.json()

      // Update feedback stats if they were returned
      if (result.document_stats) {
        setFeedbackStats(result.document_stats)
      }
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : 'Failed to submit feedback')
    } finally {
      setSubmittingFeedback(false)
    }
  }, [])

  // Load feedback stats
  const loadFeedbackStats = useCallback(async (document_slug: string) => {
    try {
      const response = await fetch(`/api/docs/feedback?document_slug=${encodeURIComponent(document_slug)}`)

      if (!response.ok) {
        throw new Error('Failed to load feedback stats')
      }

      const data = await response.json()
      setFeedbackStats(data.stats || null)
    } catch (error) {
      console.warn('Error loading feedback stats:', error)
      setFeedbackStats(null)
    }
  }, [])

  // Get articles by category
  const getArticlesByCategory = useCallback((category: string) => {
    return articles.filter(article => article.category === category)
  }, [articles])

  // Get popular articles (based on view count from feedback stats)
  const getPopularArticles = useCallback(() => {
    // For now, return recent articles sorted by estimated read time (shorter = more popular)
    return [...articles]
      .sort((a, b) => a.estimated_read_time - b.estimated_read_time)
      .slice(0, 5)
  }, [articles])

  // Get recommended articles based on current article
  const getRecommendedArticles = useCallback((currentSlug?: string) => {
    if (!currentSlug) {
      return getPopularArticles()
    }

    const current = articles.find(a => a.slug === currentSlug)
    if (!current) {
      return getPopularArticles()
    }

    // Find articles with similar tags or in same category
    const recommended = articles
      .filter(article => article.slug !== currentSlug)
      .map(article => {
        let score = 0

        // Same category bonus
        if (article.category === current.category) {
          score += 3
        }

        // Shared tags bonus
        const sharedTags = article.tags.filter(tag => current.tags.includes(tag))
        score += sharedTags.length * 2

        // Similar difficulty bonus
        if (article.difficulty === current.difficulty) {
          score += 1
        }

        return { article, score }
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ article }) => article)

    return recommended.length > 0 ? recommended : getPopularArticles()
  }, [articles, getPopularArticles])

  // Load articles on mount
  useEffect(() => {
    loadArticles()
  }, [loadArticles])

  return {
    // Articles
    articles,
    categories,
    currentArticle,
    loadingArticles,
    articlesError,

    // Search
    searchResults,
    searchLoading,
    searchError,
    searchQuery,
    searchFilters,
    searchSuggestions,

    // Feedback
    feedbackStats,
    submittingFeedback,
    feedbackError,

    // Actions
    loadArticles,
    loadArticle,
    searchDocumentation,
    clearSearch,
    submitFeedback,
    loadFeedbackStats,

    // Utilities
    getArticlesByCategory,
    getPopularArticles,
    getRecommendedArticles
  }
}