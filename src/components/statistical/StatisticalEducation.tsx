/**
 * Epic 2 Story 2.4: Statistical Confidence UI Components
 * Statistical Education Component with Interactive Tutorials and Context-Aware Help
 */

'use client'

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  BookOpen,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Target,
  BarChart3,
  TrendingUp,
  CheckCircle,
  ExternalLink,
  Award
} from 'lucide-react'

interface EducationalTopic {
  id: string
  title: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  icon: React.ReactNode
  summary: string
  detailed_explanation: string
  bangkok_context: string
  examples: string[]
  best_practices: string[]
  common_mistakes: string[]
  related_topics: string[]
}

interface StatisticalEducationProps {
  topic?: string
  context?: 'confidence_intervals' | 'p_values' | 'statistical_significance' | 'effect_sizes' | 'general'
  current_metric?: string
  className?: string
  variant?: 'tooltip' | 'sidebar' | 'modal' | 'inline'
}

const educationalContent: Record<string, EducationalTopic> = {
  confidence_intervals: {
    id: 'confidence_intervals',
    title: 'Confidence Intervals',
    difficulty: 'intermediate',
    icon: <BarChart3 className="w-5 h-5" />,
    summary: 'A confidence interval shows the range where we expect the true value to lie.',
    detailed_explanation: `A confidence interval provides a range of values that likely contains the true parameter value.
    For example, a 95% confidence interval means that if we repeated our measurement many times, 95% of those intervals
    would contain the true value. The width of the interval reflects our uncertainty - narrower intervals indicate
    more precise estimates.`,
    bangkok_context: `Using Bangkok University's 124.9M sensor readings, we can calculate highly precise confidence
    intervals for building efficiency metrics. The large sample size allows for very narrow intervals, giving us
    strong confidence in our estimates of energy savings and equipment performance.`,
    examples: [
      'Building efficiency: 72.3% (95% CI: 70.1% - 74.5%)',
      'Energy savings: €45,000 annually (95% CI: €42,000 - €48,000)',
      'HVAC performance: 68.7 kWh average (95% CI: 67.2 - 70.1 kWh)'
    ],
    best_practices: [
      'Always specify the confidence level (e.g., 95%, 99%)',
      'Consider practical significance alongside statistical precision',
      'Use appropriate methods for your data distribution',
      'Report confidence intervals alongside point estimates'
    ],
    common_mistakes: [
      'Interpreting CI as "95% chance the true value is in this range"',
      'Ignoring assumptions required for CI calculations',
      'Focusing only on statistical significance, not practical importance'
    ],
    related_topics: ['p_values', 'statistical_significance', 'effect_sizes']
  },
  p_values: {
    id: 'p_values',
    title: 'P-Values & Statistical Significance',
    difficulty: 'intermediate',
    icon: <Target className="w-5 h-5" />,
    summary: 'P-values measure the strength of evidence against the null hypothesis.',
    detailed_explanation: `A p-value is the probability of observing results as extreme as what we found,
    assuming there is actually no real effect (null hypothesis). Smaller p-values indicate stronger evidence
    against the null hypothesis. Common thresholds are p < 0.05 for significance, though context matters more
    than arbitrary cutoffs.`,
    bangkok_context: `With Bangkok University's massive dataset of 124.9M readings, we have exceptional
    statistical power. This means we can detect even small but meaningful changes in building performance with
    high confidence. Our p-values often reach <0.001 due to the large sample size.`,
    examples: [
      'HVAC efficiency improvement: p < 0.001 (highly significant)',
      'Seasonal energy pattern: p = 0.003 (significant)',
      'Equipment wear correlation: p = 0.12 (not significant)'
    ],
    best_practices: [
      'Consider practical significance alongside statistical significance',
      'Report exact p-values when possible, not just "p < 0.05"',
      'Use appropriate statistical tests for your data type',
      'Account for multiple comparisons when testing many hypotheses'
    ],
    common_mistakes: [
      'Treating p-values as the probability that the null hypothesis is true',
      'Ignoring effect size when p-values are small',
      'P-hacking: adjusting analysis until p < 0.05'
    ],
    related_topics: ['confidence_intervals', 'effect_sizes', 'statistical_power']
  },
  effect_sizes: {
    id: 'effect_sizes',
    title: 'Effect Sizes & Practical Significance',
    difficulty: 'advanced',
    icon: <TrendingUp className="w-5 h-5" />,
    summary: 'Effect sizes measure the magnitude of differences, showing practical importance.',
    detailed_explanation: `Effect sizes quantify how large a difference or relationship is, independent of
    sample size. While p-values tell us if an effect is statistically significant, effect sizes tell us if
    it's practically meaningful. Common measures include Cohen's d for differences and correlation coefficients
    for relationships.`,
    bangkok_context: `Bangkok University's building efficiency improvements show both statistical significance
    (p < 0.001) and large effect sizes. For example, Cohen's d = 0.8 for HVAC optimization indicates a large
    practical effect, translating to substantial energy savings.`,
    examples: [
      'HVAC optimization: Cohen\'s d = 0.8 (large effect)',
      'Lighting efficiency: η² = 0.15 (medium effect)',
      'Overall building performance: r = 0.45 (medium to large correlation)'
    ],
    best_practices: [
      'Always report effect sizes with statistical tests',
      'Use established benchmarks for interpreting effect sizes',
      'Consider confidence intervals for effect sizes',
      'Focus on practical significance for business decisions'
    ],
    common_mistakes: [
      'Ignoring effect sizes when sample sizes are large',
      'Using inappropriate effect size measures for the analysis type',
      'Misinterpreting correlation as causation'
    ],
    related_topics: ['confidence_intervals', 'p_values', 'statistical_power']
  }
}

export default function StatisticalEducation({
  topic,
  context = 'general',
  current_metric,
  className = '',
  variant = 'tooltip'
}: StatisticalEducationProps) {
  const { data: session } = useSession()
  const [selectedTopic, setSelectedTopic] = useState(topic || context)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  const isProfessional = session?.user?.subscriptionTier === 'PROFESSIONAL'

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const currentTopic = selectedTopic ? educationalContent[selectedTopic] : null

  if (variant === 'tooltip' && currentTopic) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm ${className}`}>
        <div className="flex items-center space-x-2 mb-2">
          {currentTopic.icon}
          <h4 className="text-sm font-medium text-gray-900">{currentTopic.title}</h4>
          <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(currentTopic.difficulty)}`}>
            {currentTopic.difficulty}
          </span>
        </div>
        <p className="text-sm text-gray-700 mb-2">
          {currentTopic.summary}
        </p>
        <p className="text-xs text-blue-600 underline cursor-pointer">
          Learn more about {currentTopic.title.toLowerCase()}
        </p>
      </div>
    )
  }

  if (variant === 'inline' && currentTopic) {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-start space-x-3">
          <div className="text-blue-600 mt-0.5">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h4 className="text-sm font-medium text-blue-900">
                Understanding {currentTopic.title}
              </h4>
              <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(currentTopic.difficulty)}`}>
                {currentTopic.difficulty}
              </span>
            </div>
            <p className="text-sm text-blue-800 mb-3">
              {currentTopic.detailed_explanation}
            </p>

            {current_metric && (
              <div className="bg-blue-100 rounded p-2 mb-3">
                <h5 className="text-xs font-medium text-blue-900 mb-1">For {current_metric}:</h5>
                <p className="text-xs text-blue-800">
                  {currentTopic.bangkok_context}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={() => toggleSection('examples')}
                className="flex items-center space-x-1 text-xs font-medium text-blue-900 hover:text-blue-700"
              >
                {expandedSections.has('examples') ?
                  <ChevronDown className="w-3 h-3" /> :
                  <ChevronRight className="w-3 h-3" />
                }
                <span>Examples from Bangkok Dataset</span>
              </button>

              {expandedSections.has('examples') && (
                <ul className="text-xs text-blue-800 space-y-1 ml-4">
                  {currentTopic.examples.map((example, index) => (
                    <li key={index} className="flex items-start space-x-1">
                      <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{example}</span>
                    </li>
                  ))}
                </ul>
              )}

              {isProfessional && (
                <>
                  <button
                    onClick={() => toggleSection('best_practices')}
                    className="flex items-center space-x-1 text-xs font-medium text-blue-900 hover:text-blue-700"
                  >
                    {expandedSections.has('best_practices') ?
                      <ChevronDown className="w-3 h-3" /> :
                      <ChevronRight className="w-3 h-3" />
                    }
                    <Award className="w-3 h-3" />
                    <span>Professional Best Practices</span>
                  </button>

                  {expandedSections.has('best_practices') && (
                    <ul className="text-xs text-blue-800 space-y-1 ml-4">
                      {currentTopic.best_practices.map((practice, index) => (
                        <li key={index} className="flex items-start space-x-1">
                          <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>{practice}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Full sidebar/modal variant
  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2 mb-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900">Statistical Guide</h3>
        </div>
        <p className="text-sm text-gray-600">
          Learn about the statistical concepts used in Bangkok dataset analysis
        </p>
      </div>

      <div className="p-4">
        {/* Topic Selection */}
        <div className="grid grid-cols-1 gap-2 mb-4">
          {Object.values(educationalContent).map((topicData) => (
            <button
              key={topicData.id}
              onClick={() => setSelectedTopic(topicData.id)}
              className={`flex items-center space-x-3 p-3 rounded-lg text-left transition-colors ${
                selectedTopic === topicData.id
                  ? 'bg-blue-50 border-blue-200 border'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className={selectedTopic === topicData.id ? 'text-blue-600' : 'text-gray-500'}>
                {topicData.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-medium text-gray-900">{topicData.title}</h4>
                  <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(topicData.difficulty)}`}>
                    {topicData.difficulty}
                  </span>
                </div>
                <p className="text-xs text-gray-600">{topicData.summary}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Selected Topic Content */}
        {currentTopic && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Detailed Explanation</h4>
              <p className="text-sm text-gray-700">{currentTopic.detailed_explanation}</p>
            </div>

            <div className="bg-blue-50 rounded-lg p-3">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Bangkok Dataset Context</h4>
              <p className="text-sm text-blue-800">{currentTopic.bangkok_context}</p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Examples</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                {currentTopic.examples.map((example, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{example}</span>
                  </li>
                ))}
              </ul>
            </div>

            {isProfessional && (
              <>
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center space-x-1">
                    <Award className="w-4 h-4 text-yellow-600" />
                    <span>Professional Best Practices</span>
                  </h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {currentTopic.best_practices.map((practice, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{practice}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-red-900 mb-2">Common Mistakes to Avoid</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {currentTopic.common_mistakes.map((mistake, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <HelpCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <span>{mistake}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {!isProfessional && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <Award className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-900 mb-1">
                      Unlock Professional Features
                    </h4>
                    <p className="text-sm text-yellow-800 mb-2">
                      Get access to advanced statistical guidance, best practices, and professional consulting tips.
                    </p>
                    <button className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1">
                      <span>Upgrade to Professional</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}