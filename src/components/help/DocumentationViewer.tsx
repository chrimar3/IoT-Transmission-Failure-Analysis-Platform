import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import useDocumentation from '@/src/hooks/useDocumentation'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface DocumentationViewerProps {
  slug?: string
  showSidebar?: boolean
  showFeedback?: boolean
  className?: string
}

const DocumentationViewer: React.FC<DocumentationViewerProps> = ({
  slug,
  showSidebar = true,
  showFeedback = true,
  className = ''
}) => {
  const router = useRouter()
  const {
    currentArticle,
    _articles,
    _categories,
    feedbackStats,
    loadArticle,
    loadFeedbackStats,
    submitFeedback,
    submittingFeedback,
    _getArticlesByCategory,
    getRecommendedArticles
  } = useDocumentation()

  const [readingProgress, setReadingProgress] = useState(0)
  const [estimatedTimeLeft, setEstimatedTimeLeft] = useState(0)
  const [userRating, setUserRating] = useState<number | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [activeHeading, setActiveHeading] = useState<string>('')

  const contentRef = useRef<HTMLDivElement>(null)
  const startTimeRef = useRef<number>(Date.now())

  // Load article when slug changes
  useEffect(() => {
    if (slug) {
      loadArticle(slug)
      loadFeedbackStats(slug)
      startTimeRef.current = Date.now()
      setReadingProgress(0)
      setUserRating(null)
      setFeedbackText('')
      setShowFeedbackForm(false)
    }
  }, [slug, loadArticle, loadFeedbackStats])

  // Track reading progress
  useEffect(() => {
    if (!contentRef.current || !currentArticle) return

    const handleScroll = () => {
      const element = contentRef.current
      if (!element) return

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      const scrollHeight = element.scrollHeight - window.innerHeight
      const progress = Math.min((scrollTop / scrollHeight) * 100, 100)

      setReadingProgress(progress)

      // Estimate time left based on reading speed (200 words per minute)
      const wordsRead = Math.floor((progress / 100) * (currentArticle.content?.split(' ').length || 0))
      const wordsRemaining = (currentArticle.content?.split(' ').length || 0) - wordsRead
      const timeLeft = Math.ceil(wordsRemaining / (200 / 60)) // Convert to seconds

      setEstimatedTimeLeft(timeLeft)

      // Update active heading based on scroll position
      updateActiveHeading()
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [currentArticle, updateActiveHeading])

  // Update active heading in table of contents
  const updateActiveHeading = useCallback(() => {
    if (!currentArticle?.table_of_contents) return

    const headings = currentArticle.table_of_contents
    let activeId = ''

    for (const heading of headings) {
      const element = document.getElementById(heading.id)
      if (element) {
        const rect = element.getBoundingClientRect()
        if (rect.top <= 100) {
          activeId = heading.id
        }
      }
    }

    setActiveHeading(activeId)
  }, [currentArticle])

  // Submit rating
  const handleRatingSubmit = async (rating: number) => {
    if (!currentArticle) return

    setUserRating(rating)

    const sessionDuration = Math.floor((Date.now() - startTimeRef.current) / 1000)

    await submitFeedback({
      document_slug: currentArticle.slug,
      rating,
      session_duration_seconds: sessionDuration,
      completion_percentage: Math.floor(readingProgress)
    })
  }

  // Submit text feedback
  const handleFeedbackSubmit = async () => {
    if (!currentArticle || !feedbackText.trim()) return

    const sessionDuration = Math.floor((Date.now() - startTimeRef.current) / 1000)

    await submitFeedback({
      document_slug: currentArticle.slug,
      feedback_text: feedbackText,
      feedback_type: 'improvement',
      session_duration_seconds: sessionDuration,
      completion_percentage: Math.floor(readingProgress)
    })

    setFeedbackText('')
    setShowFeedbackForm(false)
  }

  // Navigate to article
  const navigateToArticle = (articleSlug: string) => {
    router.push(`/docs/${articleSlug}`)
  }

  if (!currentArticle) {
    return (
      <div className={`flex items-center justify-center min-h-64 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading documentation...</p>
        </div>
      </div>
    )
  }

  const recommendedArticles = getRecommendedArticles(currentArticle.slug)

  return (
    <div className={`flex max-w-7xl mx-auto ${className}`}>
      {/* Sidebar */}
      {showSidebar && (
        <div className="hidden lg:block w-64 flex-shrink-0 mr-8">
          <div className="sticky top-8 space-y-6">
            {/* Article Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center space-x-2 mb-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  currentArticle.difficulty === 'beginner'
                    ? 'bg-green-100 text-green-800'
                    : currentArticle.difficulty === 'advanced'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {currentArticle.difficulty}
                </span>
                <span className="text-xs text-gray-500">
                  {currentArticle.estimated_read_time} min read
                </span>
              </div>

              {/* Reading Progress */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{Math.round(readingProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${readingProgress}%` }}
                  />
                </div>
                {estimatedTimeLeft > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    ~{estimatedTimeLeft}s left
                  </p>
                )}
              </div>

              {/* Tags */}
              {currentArticle.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {currentArticle.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Table of Contents */}
            {currentArticle.table_of_contents && currentArticle.table_of_contents.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-medium text-gray-900 mb-3">Contents</h3>
                <nav className="space-y-1">
                  {currentArticle.table_of_contents.map(heading => (
                    <a
                      key={heading.id}
                      href={`#${heading.id}`}
                      className={`block text-sm transition-colors ${
                        activeHeading === heading.id
                          ? 'text-blue-600 font-medium'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                      style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}
                    >
                      {heading.text}
                    </a>
                  ))}
                </nav>
              </div>
            )}

            {/* Recommended Articles */}
            {recommendedArticles.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-medium text-gray-900 mb-3">Recommended</h3>
                <div className="space-y-3">
                  {recommendedArticles.map(article => (
                    <div
                      key={article.slug}
                      onClick={() => navigateToArticle(article.slug)}
                      className="cursor-pointer p-2 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <h4 className="text-sm font-medium text-gray-900 line-clamp-2">
                        {article.title}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {article.estimated_read_time} min • {article.difficulty}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div ref={contentRef} className="bg-white rounded-lg border border-gray-200">
          {/* Header */}
          <div className="border-b border-gray-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {currentArticle.title}
                </h1>
                {currentArticle.description && (
                  <p className="text-gray-600 text-lg mb-4">
                    {currentArticle.description}
                  </p>
                )}
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  {currentArticle.author && (
                    <span>By {currentArticle.author}</span>
                  )}
                  <span>
                    Updated {new Date(currentArticle.last_updated).toLocaleDateString()}
                  </span>
                  {currentArticle.tier_required === 'professional' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                      👑 Professional
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => window.print()}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Print article"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                </button>
                <button
                  onClick={() => navigator.share?.({ title: currentArticle.title, url: window.location.href })}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Share article"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none p-6">
            <ReactMarkdown
              components={{
                code({ _node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={tomorrow}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  )
                },
                h1: ({ children, ...props }) => {
                  const id = String(children).toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')
                  return <h1 id={id} {...props}>{children}</h1>
                },
                h2: ({ children, ...props }) => {
                  const id = String(children).toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')
                  return <h2 id={id} {...props}>{children}</h2>
                },
                h3: ({ children, ...props }) => {
                  const id = String(children).toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')
                  return <h3 id={id} {...props}>{children}</h3>
                },
              }}
            >
              {currentArticle.content || ''}
            </ReactMarkdown>
          </div>

          {/* Feedback Section */}
          {showFeedback && (
            <div className="border-t border-gray-200 p-6">
              <div className="max-w-2xl">
                {/* Rating */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    Was this article helpful?
                  </h3>
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map(rating => (
                      <button
                        key={rating}
                        onClick={() => handleRatingSubmit(rating)}
                        disabled={submittingFeedback}
                        className={`w-8 h-8 transition-colors ${
                          userRating && rating <= userRating
                            ? 'text-yellow-400'
                            : 'text-gray-300 hover:text-yellow-400'
                        }`}
                      >
                        <svg fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    ))}
                    {feedbackStats && (
                      <span className="ml-4 text-sm text-gray-500">
                        {feedbackStats.average_rating ? `${feedbackStats.average_rating}/5` : 'No ratings yet'}
                        ({feedbackStats.total_ratings} {feedbackStats.total_ratings === 1 ? 'rating' : 'ratings'})
                      </span>
                    )}
                  </div>
                </div>

                {/* Text Feedback */}
                <div>
                  {!showFeedbackForm ? (
                    <button
                      onClick={() => setShowFeedbackForm(true)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      + Leave detailed feedback
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <textarea
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        placeholder="What could we improve about this article?"
                        className="w-full p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={handleFeedbackSubmit}
                          disabled={!feedbackText.trim() || submittingFeedback}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        >
                          {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                        </button>
                        <button
                          onClick={() => setShowFeedbackForm(false)}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DocumentationViewer