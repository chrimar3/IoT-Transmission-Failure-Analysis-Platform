import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth'
import { prisma as _prisma } from '@/lib/database/prisma'
import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'

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
}

const CONTENT_BASE_PATH = path.join(process.cwd(), 'content', 'documentation')

// Get available documentation categories
const CATEGORIES = {
  'getting-started': {
    title: 'Getting Started',
    description: 'Essential guides for new users',
    icon: '🚀',
    order: 1
  },
  'analytics-guide': {
    title: 'Analytics & Insights',
    description: 'Understanding your building data',
    icon: '📊',
    order: 2
  },
  'statistical-concepts': {
    title: 'Statistical Concepts',
    description: 'Making sense of confidence intervals and p-values',
    icon: '📈',
    order: 3
  },
  'best-practices': {
    title: 'Best Practices',
    description: 'Proven strategies for facility management',
    icon: '💡',
    order: 4
  },
  'troubleshooting': {
    title: 'Troubleshooting',
    description: 'Solutions to common issues',
    icon: '🔧',
    order: 5
  },
  'api-documentation': {
    title: 'API Documentation',
    description: 'Integration guides for developers',
    icon: '⚙️',
    order: 6,
    tier_required: 'professional'
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const tag = searchParams.get('tag')
    const difficulty = searchParams.get('difficulty')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const includeContent = searchParams.get('include_content') === 'true'

    // Get user subscription for tier filtering
    const userTier = session?.user ? 'professional' : 'free' // TODO: Get actual subscription tier from database

    const articles: DocumentationArticle[] = []

    // Read articles from content directory
    try {
      const categories = await fs.readdir(CONTENT_BASE_PATH)

      for (const categoryDir of categories) {
        // Filter by category if specified
        if (category && categoryDir !== category) continue

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

              const article: DocumentationArticle = {
                slug: `${categoryDir}/${file.replace('.md', '')}`,
                title: frontmatter.title || file.replace('.md', ''),
                description: frontmatter.description || '',
                category: categoryDir,
                tags: frontmatter.tags || [],
                difficulty: frontmatter.difficulty || 'intermediate',
                estimated_read_time: frontmatter.estimated_read_time || Math.ceil(markdownContent.length / 1000),
                last_updated: frontmatter.last_updated || new Date().toISOString(),
                author: frontmatter.author,
                tier_required: frontmatter.tier_required || 'free'
              }

              // Include content if requested
              if (includeContent) {
                article.content = markdownContent
              }

              // Filter by tier access
              if (article.tier_required === 'professional' && userTier !== 'professional') {
                continue
              }

              // Filter by tag if specified
              if (tag && !article.tags.includes(tag)) {
                continue
              }

              // Filter by difficulty if specified
              if (difficulty && article.difficulty !== difficulty) {
                continue
              }

              // Filter by search term if specified
              if (search) {
                const searchLower = search.toLowerCase()
                const matchesSearch =
                  article.title.toLowerCase().includes(searchLower) ||
                  article.description.toLowerCase().includes(searchLower) ||
                  article.tags.some(t => t.toLowerCase().includes(searchLower)) ||
                  (includeContent && article.content?.toLowerCase().includes(searchLower))

                if (!matchesSearch) {
                  continue
                }
              }

              articles.push(article)
            }
          } catch (err) {
            console.warn(`Error reading category ${categoryDir}:`, err)
          }
        }
      }
    } catch (err) {
      console.warn('Error reading content directory:', err)
    }

    // Sort articles by category order and then by title
    articles.sort((a, b) => {
      const categoryOrderA = CATEGORIES[a.category as keyof typeof CATEGORIES]?.order || 999
      const categoryOrderB = CATEGORIES[b.category as keyof typeof CATEGORIES]?.order || 999

      if (categoryOrderA !== categoryOrderB) {
        return categoryOrderA - categoryOrderB
      }

      return a.title.localeCompare(b.title)
    })

    // Apply limit
    const limitedArticles = articles.slice(0, limit)

    // Track documentation usage if user is authenticated
    if (session?.user?.id && !search) {
      try {
        // TODO: Track documentation usage when database schema is updated
        console.log(`User ${session.user.id} viewed articles list - category: ${category || 'all'}`)
      } catch (err) {
        console.warn('Error tracking documentation usage:', err)
      }
    }

    return NextResponse.json({
      articles: limitedArticles,
      categories: CATEGORIES,
      total: articles.length,
      filtered: limitedArticles.length,
      filters: {
        category,
        tag,
        difficulty,
        search,
        user_tier: userTier
      }
    })
  } catch (error) {
    console.error('Error fetching documentation articles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documentation articles' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has admin role for content creation
    // TODO: Implement admin role check
    const isAdmin = false // session.user.role === 'admin'

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, description, category, content, tags, difficulty, tier_required } = body

    if (!title || !category || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: title, category, content' },
        { status: 400 }
      )
    }

    // Validate category
    if (!CATEGORIES[category as keyof typeof CATEGORIES]) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      )
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim()

    // Create frontmatter
    const frontmatter = {
      title,
      description: description || '',
      tags: tags || [],
      difficulty: difficulty || 'intermediate',
      tier_required: tier_required || 'free',
      author: session.user.name || session.user.email,
      last_updated: new Date().toISOString(),
      estimated_read_time: Math.ceil(content.length / 1000)
    }

    // Create markdown content with frontmatter
    const markdownContent = matter.stringify(content, frontmatter)

    // Ensure category directory exists
    const categoryPath = path.join(CONTENT_BASE_PATH, category)
    await fs.mkdir(categoryPath, { recursive: true })

    // Write file
    const filePath = path.join(categoryPath, `${slug}.md`)
    await fs.writeFile(filePath, markdownContent, 'utf-8')

    const article: DocumentationArticle = {
      slug: `${category}/${slug}`,
      title,
      description: description || '',
      category,
      tags: tags || [],
      difficulty: difficulty || 'intermediate',
      estimated_read_time: frontmatter.estimated_read_time,
      last_updated: frontmatter.last_updated,
      author: frontmatter.author || 'CU-BEMS Team',
      tier_required: tier_required || 'free',
      content
    }

    return NextResponse.json({
      message: 'Article created successfully',
      article
    })
  } catch (error) {
    console.error('Error creating documentation article:', error)
    return NextResponse.json(
      { error: 'Failed to create documentation article' },
      { status: 500 }
    )
  }
}