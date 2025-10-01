import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth'
import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'

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
  content_type?: string
}

interface ArticleData {
  title?: string
  description?: string
  content?: string
  tags?: string[]
  category?: string
  difficulty?: string
  tier_required?: string
}

const CONTENT_BASE_PATH = path.join(process.cwd(), 'content', 'documentation')
const PREVIEW_LENGTH = 150

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)

    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Parse filters
    const filters: SearchFilters = {
      category: searchParams.get('category') || undefined,
      difficulty: searchParams.get('difficulty') || undefined,
      tags: searchParams.get('tags')?.split(',').filter(Boolean) || undefined,
      tier: searchParams.get('tier') || undefined,
      content_type: searchParams.get('content_type') || undefined
    }

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters long' },
        { status: 400 }
      )
    }

    // Get user subscription tier for filtering
    const userTier = session?.user ? 'free' : 'free' // TODO: Get actual subscription tier

    // Perform search
    const searchResults = await performDocumentationSearch(query, filters, userTier)

    // Apply pagination
    const paginatedResults = searchResults.slice(offset, offset + limit)

    // Track search usage
    if (session?.user?.id) {
      try {
        // TODO: Track search usage when database schema is updated
        console.log(`User ${session.user.id} searched for: "${query}" - ${searchResults.length} results`)
      } catch (err) {
        console.warn('Error tracking search usage:', err)
      }
    }

    // Get search suggestions for empty or low-result queries
    const suggestions = searchResults.length < 3 ? await getSearchSuggestions(query) : []

    return NextResponse.json({
      results: paginatedResults,
      total: searchResults.length,
      offset,
      limit,
      query,
      filters,
      suggestions,
      user_tier: userTier
    })
  } catch (error) {
    console.error('Error performing documentation search:', error)
    return NextResponse.json(
      { error: 'Failed to perform search' },
      { status: 500 }
    )
  }
}

async function performDocumentationSearch(
  query: string,
  filters: SearchFilters,
  userTier: string
): Promise<SearchResult[]> {
  const results: SearchResult[] = []
  const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 1)

  try {
    const categories = await fs.readdir(CONTENT_BASE_PATH)

    for (const categoryDir of categories) {
      // Apply category filter
      if (filters.category && categoryDir !== filters.category) continue

      const categoryPath = path.join(CONTENT_BASE_PATH, categoryDir)
      const stat = await fs.stat(categoryPath)

      if (stat.isDirectory()) {
        try {
          const files = await fs.readdir(categoryPath)

          for (const file of files) {
            if (!file.endsWith('.md')) continue

            const filePath = path.join(categoryPath, file)
            const content = await fs.readFile(filePath, 'utf-8')
            const { data: frontmatter, content: markdownContent } = matter(content)

            const article = {
              slug: `${categoryDir}/${file.replace('.md', '')}`,
              title: frontmatter.title || file.replace('.md', ''),
              description: frontmatter.description || '',
              category: categoryDir,
              tags: frontmatter.tags || [],
              difficulty: frontmatter.difficulty || 'intermediate',
              tier_required: frontmatter.tier_required || 'free',
              content: markdownContent,
              last_updated: frontmatter.last_updated || new Date().toISOString(),
              estimated_read_time: frontmatter.estimated_read_time || Math.ceil(markdownContent.length / 1000)
            }

            // Apply tier filter
            if (article.tier_required === 'professional' && userTier !== 'professional') {
              continue
            }

            // Apply difficulty filter
            if (filters.difficulty && article.difficulty !== filters.difficulty) {
              continue
            }

            // Apply tags filter
            if (filters.tags && filters.tags.length > 0) {
              const hasMatchingTag = filters.tags.some(tag =>
                article.tags.some((articleTag: string) =>
                  articleTag.toLowerCase().includes(tag.toLowerCase())
                )
              )
              if (!hasMatchingTag) continue
            }

            // Calculate relevance score
            const relevanceScore = calculateRelevanceScore(article, searchTerms)

            if (relevanceScore > 0) {
              // Generate content preview with highlighted matches
              const { preview, matchedSections } = generateContentPreview(
                article.content,
                searchTerms
              )

              results.push({
                slug: article.slug,
                title: article.title,
                description: article.description,
                category: article.category,
                tags: article.tags,
                difficulty: article.difficulty,
                tier_required: article.tier_required,
                relevance_score: relevanceScore,
                content_preview: preview,
                matched_sections: matchedSections,
                estimated_read_time: article.estimated_read_time,
                last_updated: article.last_updated
              })
            }
          }
        } catch (err) {
          console.warn(`Error processing category ${categoryDir}:`, err)
        }
      }
    }
  } catch (err) {
    console.warn('Error reading content directory:', err)
  }

  // Sort by relevance score (highest first)
  return results.sort((a, b) => b.relevance_score - a.relevance_score)
}

function calculateRelevanceScore(
  article: ArticleData,
  searchTerms: string[]
): number {
  let score = 0
  const titleLower = article.title?.toLowerCase() || ''
  const descriptionLower = article.description?.toLowerCase() || ''
  const contentLower = article.content?.toLowerCase() || ''
  const tagsLower = article.tags?.map((tag: string) => tag.toLowerCase()) || []

  for (const term of searchTerms) {
    // Title matches (highest weight)
    if (titleLower.includes(term)) {
      score += 10
      if (titleLower.startsWith(term)) score += 5 // Boost for title starts with term
    }

    // Description matches
    if (descriptionLower.includes(term)) {
      score += 5
    }

    // Tag matches
    for (const tag of tagsLower) {
      if (tag.includes(term)) {
        score += 3
        if (tag === term) score += 2 // Exact tag match
      }
    }

    // Content matches (count occurrences, but cap the boost)
    const contentMatches = (contentLower.match(new RegExp(term, 'g')) || []).length
    score += Math.min(contentMatches, 5) // Cap at 5 points from content matches

    // Boost for exact phrase matches in content
    if (searchTerms.length > 1) {
      const phrase = searchTerms.join(' ')
      if (contentLower.includes(phrase)) {
        score += 8
      }
    }
  }

  return score
}

function generateContentPreview(
  content: string,
  searchTerms: string[]
): { preview: string; matchedSections: string[] } {
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const matchedSections: string[] = []

  // Find sentences that contain search terms
  for (const sentence of sentences) {
    const sentenceLower = sentence.toLowerCase()
    const hasMatch = searchTerms.some(term => sentenceLower.includes(term))

    if (hasMatch && matchedSections.length < 3) {
      matchedSections.push(sentence.trim())
    }
  }

  // Generate preview from first matched section or beginning of content
  let preview = ''
  if (matchedSections.length > 0) {
    preview = matchedSections[0]
  } else {
    preview = content.substring(0, PREVIEW_LENGTH)
  }

  // Truncate if too long
  if (preview.length > PREVIEW_LENGTH) {
    preview = preview.substring(0, PREVIEW_LENGTH) + '...'
  }

  // Highlight search terms in preview
  for (const term of searchTerms) {
    const regex = new RegExp(`(${term})`, 'gi')
    preview = preview.replace(regex, '**$1**')
  }

  return { preview, matchedSections }
}

async function getSearchSuggestions(query: string): Promise<string[]> {
  // Common search suggestions based on typical user queries
  const commonSuggestions = [
    'getting started',
    'dashboard overview',
    'understanding analytics',
    'confidence intervals',
    'energy efficiency',
    'building performance',
    'troubleshooting',
    'API documentation',
    'statistical significance',
    'data interpretation',
    'best practices',
    'facility management'
  ]

  // Filter suggestions that partially match the query
  const queryLower = query.toLowerCase()
  const matchingSuggestions = commonSuggestions.filter(suggestion =>
    suggestion.toLowerCase().includes(queryLower) ||
    queryLower.split(' ').some(term => suggestion.toLowerCase().includes(term))
  )

  // If no matching suggestions, return popular searches
  if (matchingSuggestions.length === 0) {
    return commonSuggestions.slice(0, 5)
  }

  return matchingSuggestions.slice(0, 5)
}