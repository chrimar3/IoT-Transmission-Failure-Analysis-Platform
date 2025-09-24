import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth'
import { prisma as _prisma } from '@/lib/database/prisma'
import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'

const CONTENT_BASE_PATH = path.join(process.cwd(), 'content', 'documentation')

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const articleSlug = params.slug

    // Parse slug to get category and filename
    const slugParts = articleSlug.split('/')
    if (slugParts.length !== 2) {
      return NextResponse.json(
        { error: 'Invalid article slug format' },
        { status: 400 }
      )
    }

    const [category, filename] = slugParts
    const filePath = path.join(CONTENT_BASE_PATH, category, `${filename}.md`)

    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const { data: frontmatter, content: markdownContent } = matter(content)

      const article = {
        slug: articleSlug,
        title: frontmatter.title || filename,
        description: frontmatter.description || '',
        category,
        tags: frontmatter.tags || [],
        difficulty: frontmatter.difficulty || 'intermediate',
        estimated_read_time: frontmatter.estimated_read_time || Math.ceil(markdownContent.length / 1000),
        last_updated: frontmatter.last_updated || new Date().toISOString(),
        author: frontmatter.author,
        tier_required: frontmatter.tier_required || 'free',
        content: markdownContent,
        table_of_contents: generateTableOfContents(markdownContent)
      }

      // Check tier access
      const userTier = session?.user ? 'professional' : 'free' // TODO: Get actual subscription tier from database
      if (article.tier_required === 'professional' && userTier !== 'professional') {
        return NextResponse.json(
          {
            error: 'Professional subscription required',
            tier_required: 'professional',
            user_tier: userTier
          },
          { status: 403 }
        )
      }

      // Track documentation usage
      if (session?.user?.id) {
        try {
          // TODO: Track documentation usage when database schema is updated
          console.log(`User ${session.user.id} viewed article ${articleSlug}`)
        } catch (err) {
          console.warn('Error tracking documentation usage:', err)
        }
      }

      // Get related articles
      const relatedArticles = await getRelatedArticles(category, article.tags, articleSlug)

      return NextResponse.json({
        article,
        related_articles: relatedArticles,
        user_tier: userTier
      })
    } catch (_fileError) {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error('Error fetching documentation article:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documentation article' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin permissions
    const isAdmin = false // TODO: session.user.role === 'admin'
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, description, content, tags, difficulty, tier_required } = body
    const articleSlug = params.slug

    const slugParts = articleSlug.split('/')
    if (slugParts.length !== 2) {
      return NextResponse.json(
        { error: 'Invalid article slug format' },
        { status: 400 }
      )
    }

    const [category, filename] = slugParts
    const filePath = path.join(CONTENT_BASE_PATH, category, `${filename}.md`)

    // Check if file exists
    try {
      await fs.access(filePath)
    } catch {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    // Read existing file to preserve some metadata
    const existingContent = await fs.readFile(filePath, 'utf-8')
    const { data: existingFrontmatter } = matter(existingContent)

    // Update frontmatter
    const updatedFrontmatter = {
      ...existingFrontmatter,
      title: title || existingFrontmatter.title,
      description: description !== undefined ? description : existingFrontmatter.description,
      tags: tags || existingFrontmatter.tags || [],
      difficulty: difficulty || existingFrontmatter.difficulty || 'intermediate',
      tier_required: tier_required || existingFrontmatter.tier_required || 'free',
      last_updated: new Date().toISOString(),
      estimated_read_time: content ? Math.ceil(content.length / 1000) : existingFrontmatter.estimated_read_time
    }

    // Create updated markdown content
    const updatedContent = content !== undefined ? content : existingContent
    const markdownContent = matter.stringify(updatedContent, updatedFrontmatter)

    // Write updated file
    await fs.writeFile(filePath, markdownContent, 'utf-8')

    const article = {
      slug: articleSlug,
      title: updatedFrontmatter.title,
      description: updatedFrontmatter.description,
      category,
      tags: updatedFrontmatter.tags,
      difficulty: updatedFrontmatter.difficulty,
      estimated_read_time: updatedFrontmatter.estimated_read_time,
      last_updated: updatedFrontmatter.last_updated,
      author: (updatedFrontmatter as unknown as {author?: string}).author || 'CU-BEMS Team',
      tier_required: updatedFrontmatter.tier_required,
      content: updatedContent
    }

    return NextResponse.json({
      message: 'Article updated successfully',
      article
    })
  } catch (error) {
    console.error('Error updating documentation article:', error)
    return NextResponse.json(
      { error: 'Failed to update documentation article' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin permissions
    const isAdmin = false // TODO: session.user.role === 'admin'
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const articleSlug = params.slug
    const slugParts = articleSlug.split('/')
    if (slugParts.length !== 2) {
      return NextResponse.json(
        { error: 'Invalid article slug format' },
        { status: 400 }
      )
    }

    const [category, filename] = slugParts
    const filePath = path.join(CONTENT_BASE_PATH, category, `${filename}.md`)

    try {
      await fs.unlink(filePath)
    } catch {
      return NextResponse.json(
        { error: 'Article not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Article deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting documentation article:', error)
    return NextResponse.json(
      { error: 'Failed to delete documentation article' },
      { status: 500 }
    )
  }
}

// Helper function to generate table of contents from markdown
function generateTableOfContents(content: string) {
  const headings = content
    .split('\n')
    .filter(line => line.match(/^#{1,6}\s/))
    .map(line => {
      const level = line.match(/^#{1,6}/)?.[0].length || 1
      const text = line.replace(/^#{1,6}\s/, '').trim()
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')

      return { level, text, id }
    })

  return headings
}

// Helper function to get related articles
async function getRelatedArticles(category: string, tags: string[], currentSlug: string) {
  try {
    const categoryPath = path.join(CONTENT_BASE_PATH, category)
    const files = await fs.readdir(categoryPath)
    const relatedArticles = []

    for (const file of files.slice(0, 5)) { // Limit to 5 related articles
      if (!file.endsWith('.md')) continue

      const slug = `${category}/${file.replace('.md', '')}`
      if (slug === currentSlug) continue

      const filePath = path.join(categoryPath, file)
      const content = await fs.readFile(filePath, 'utf-8')
      const { data: frontmatter } = matter(content)

      // Calculate relevance score based on shared tags
      const sharedTags = tags.filter(tag => (frontmatter.tags || []).includes(tag))
      const relevanceScore = sharedTags.length

      if (relevanceScore > 0 || relatedArticles.length < 3) {
        relatedArticles.push({
          slug,
          title: frontmatter.title || file.replace('.md', ''),
          description: frontmatter.description || '',
          difficulty: frontmatter.difficulty || 'intermediate',
          estimated_read_time: frontmatter.estimated_read_time || 5,
          relevance_score: relevanceScore
        })
      }
    }

    // Sort by relevance score and limit to 3
    return relatedArticles
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, 3)
  } catch (error) {
    console.warn('Error getting related articles:', error)
    return []
  }
}