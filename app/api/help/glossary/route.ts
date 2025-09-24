import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/auth'
import { prisma } from '@/lib/database/prisma'

interface GlossaryTerm {
  id: string
  term: string
  definition: string
  category: string
  tags: string[]
  related_terms: string[]
  examples?: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  context: 'facility_management' | 'statistics' | 'energy' | 'general'
  see_also?: string[]
}

// Comprehensive glossary of technical terms in facility management context
const GLOSSARY_TERMS: GlossaryTerm[] = [
  // Statistical Terms
  {
    id: 'confidence-interval',
    term: 'Confidence Interval',
    definition: 'A range of values that likely contains the true value of a measurement. A 95% confidence interval means we are 95% certain the true value falls within this range.',
    category: 'Statistics',
    tags: ['statistics', 'confidence', 'measurement', 'reliability'],
    related_terms: ['p-value', 'statistical-significance', 'margin-of-error'],
    examples: [
      'Your building\'s energy efficiency is 82% ± 3% (95% CI: 79%-85%)',
      'Average temperature readings: 72°F ± 1.2°F (95% CI: 70.8°F-73.2°F)'
    ],
    difficulty: 'intermediate',
    context: 'statistics',
    see_also: ['statistical-significance', 'standard-deviation']
  },
  {
    id: 'p-value',
    term: 'P-Value',
    definition: 'The probability that the observed difference occurred by chance. Lower p-values (typically < 0.05) suggest the difference is statistically significant and not due to random variation.',
    category: 'Statistics',
    tags: ['statistics', 'significance', 'probability', 'hypothesis'],
    related_terms: ['confidence-interval', 'statistical-significance'],
    examples: [
      'P = 0.02 means there\'s only a 2% chance this energy reduction happened by accident',
      'P = 0.15 suggests the equipment upgrade may not have made a real difference'
    ],
    difficulty: 'intermediate',
    context: 'statistics',
    see_also: ['confidence-interval', 'hypothesis-testing']
  },
  {
    id: 'statistical-significance',
    term: 'Statistical Significance',
    definition: 'When a result is unlikely to have occurred by chance alone. In facility management, this helps determine if changes in building performance are real improvements or just random fluctuation.',
    category: 'Statistics',
    tags: ['statistics', 'significance', 'analysis', 'validation'],
    related_terms: ['p-value', 'confidence-interval'],
    examples: [
      'The 15% energy reduction after HVAC upgrades is statistically significant (p < 0.05)',
      'Temperature variations between floors show statistical significance, indicating a real difference'
    ],
    difficulty: 'intermediate',
    context: 'statistics',
    see_also: ['p-value', 'confidence-interval']
  },

  // Energy Management Terms
  {
    id: 'energy-efficiency',
    term: 'Energy Efficiency',
    definition: 'A measure of how well a building uses energy to provide comfort and services to occupants. Higher efficiency means using less energy to achieve the same results.',
    category: 'Energy Management',
    tags: ['energy', 'efficiency', 'performance', 'consumption'],
    related_terms: ['energy-intensity', 'eui', 'baseline-consumption'],
    examples: [
      'An 85% energy efficiency rating means your building performs better than 85% of similar facilities',
      'LED lighting increased efficiency by 60% compared to fluorescent bulbs'
    ],
    difficulty: 'beginner',
    context: 'energy',
    see_also: ['energy-intensity', 'energy-star-rating']
  },
  {
    id: 'eui',
    term: 'EUI (Energy Use Intensity)',
    definition: 'Energy Use Intensity measures annual energy consumption per square foot of building space. It\'s a key metric for comparing building performance across different sizes and types.',
    category: 'Energy Management',
    tags: ['energy', 'intensity', 'benchmark', 'comparison'],
    related_terms: ['energy-efficiency', 'baseline-consumption'],
    examples: [
      'Office buildings typically have an EUI of 80-120 kBtu/sq ft/year',
      'Reducing EUI from 95 to 75 represents a 21% improvement in energy performance'
    ],
    difficulty: 'intermediate',
    context: 'energy',
    see_also: ['energy-efficiency', 'energy-benchmarking']
  },
  {
    id: 'baseline-consumption',
    term: 'Baseline Consumption',
    definition: 'The amount of energy a building normally uses before any efficiency improvements. This reference point helps measure the impact of upgrades and operational changes.',
    category: 'Energy Management',
    tags: ['energy', 'baseline', 'measurement', 'reference'],
    related_terms: ['energy-efficiency', 'eui'],
    examples: [
      'Established baseline: 500 kWh per day average consumption over 12 months',
      'Post-upgrade consumption of 425 kWh shows 15% improvement over baseline'
    ],
    difficulty: 'beginner',
    context: 'energy',
    see_also: ['energy-efficiency', 'measurement-verification']
  },

  // Facility Management Terms
  {
    id: 'hvac-optimization',
    term: 'HVAC Optimization',
    definition: 'The process of adjusting heating, ventilation, and air conditioning systems to maximize comfort while minimizing energy consumption. Often the largest opportunity for energy savings.',
    category: 'Facility Management',
    tags: ['hvac', 'optimization', 'climate-control', 'energy-savings'],
    related_terms: ['setpoint-management', 'demand-response', 'thermal-comfort'],
    examples: [
      'Optimized HVAC scheduling reduced energy use by 20% without affecting occupant comfort',
      'Variable frequency drives on HVAC fans improved efficiency by 30%'
    ],
    difficulty: 'intermediate',
    context: 'facility_management',
    see_also: ['setpoint-management', 'building-automation']
  },
  {
    id: 'setpoint-management',
    term: 'Setpoint Management',
    definition: 'The practice of controlling temperature, humidity, and other environmental settings to balance occupant comfort with energy efficiency. Small adjustments can yield significant savings.',
    category: 'Facility Management',
    tags: ['temperature', 'control', 'comfort', 'settings'],
    related_terms: ['hvac-optimization', 'thermal-comfort'],
    examples: [
      'Raising cooling setpoint from 72°F to 74°F can reduce energy use by 6-8%',
      'Automated setpoint adjustment during unoccupied hours saves 15-20% on HVAC costs'
    ],
    difficulty: 'beginner',
    context: 'facility_management',
    see_also: ['hvac-optimization', 'occupancy-scheduling']
  },
  {
    id: 'demand-response',
    term: 'Demand Response',
    definition: 'Programs that incentivize reducing electricity use during peak demand periods. Participating buildings can earn money while helping stabilize the electrical grid.',
    category: 'Facility Management',
    tags: ['demand', 'grid', 'peak-shaving', 'incentives'],
    related_terms: ['peak-demand', 'load-management'],
    examples: [
      'Reduced lighting and HVAC during 2-6 PM peak hours earned $5,000 in demand response credits',
      'Automated demand response system cuts 25% of load when grid signals high demand'
    ],
    difficulty: 'advanced',
    context: 'facility_management',
    see_also: ['peak-demand', 'energy-storage']
  },

  // Building Analytics Terms
  {
    id: 'anomaly-detection',
    term: 'Anomaly Detection',
    definition: 'Automated identification of unusual patterns in building data that may indicate equipment problems, operational issues, or opportunities for improvement.',
    category: 'Building Analytics',
    tags: ['analytics', 'detection', 'monitoring', 'automation'],
    related_terms: ['fault-detection', 'predictive-maintenance'],
    examples: [
      'System detected 40% increase in chiller energy use, indicating potential refrigerant leak',
      'Anomaly alert identified HVAC fan running during unoccupied hours'
    ],
    difficulty: 'intermediate',
    context: 'facility_management',
    see_also: ['fault-detection', 'performance-monitoring']
  },
  {
    id: 'fault-detection',
    term: 'Fault Detection and Diagnostics (FDD)',
    definition: 'Technology that automatically identifies and diagnoses equipment malfunctions or performance degradation. Helps prevent failures and optimize maintenance timing.',
    category: 'Building Analytics',
    tags: ['fault', 'diagnostics', 'maintenance', 'equipment'],
    related_terms: ['anomaly-detection', 'predictive-maintenance'],
    examples: [
      'FDD system identified stuck damper causing 15% energy waste in air handler',
      'Detected sensor drift in temperature readings, preventing comfort complaints'
    ],
    difficulty: 'advanced',
    context: 'facility_management',
    see_also: ['anomaly-detection', 'condition-monitoring']
  },

  // Sustainability Terms
  {
    id: 'carbon-footprint',
    term: 'Carbon Footprint',
    definition: 'The total amount of greenhouse gas emissions produced by a building\'s energy consumption, typically measured in CO2 equivalent tons per year.',
    category: 'Sustainability',
    tags: ['carbon', 'emissions', 'sustainability', 'environment'],
    related_terms: ['greenhouse-gas', 'sustainability-reporting'],
    examples: [
      'Office building carbon footprint: 150 tons CO2/year from electricity and gas',
      'Solar panels reduced carbon footprint by 30 tons CO2/year'
    ],
    difficulty: 'beginner',
    context: 'facility_management',
    see_also: ['renewable-energy', 'sustainability-reporting']
  },
  {
    id: 'energy-star-rating',
    term: 'ENERGY STAR Rating',
    definition: 'A 1-100 score comparing a building\'s energy performance to similar buildings nationwide. Scores of 75 or higher can qualify for ENERGY STAR certification.',
    category: 'Sustainability',
    tags: ['energy-star', 'rating', 'benchmark', 'certification'],
    related_terms: ['energy-efficiency', 'benchmarking'],
    examples: [
      'Achieved ENERGY STAR score of 82, indicating top 18% performance in building category',
      'Improved from score 65 to 78 through LED upgrades and HVAC optimization'
    ],
    difficulty: 'intermediate',
    context: 'facility_management',
    see_also: ['energy-efficiency', 'building-benchmarking']
  }
]

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)

    const search = searchParams.get('search')
    const category = searchParams.get('category')
    const difficulty = searchParams.get('difficulty')
    const context = searchParams.get('context')
    const limit = parseInt(searchParams.get('limit') || '50')

    let filteredTerms = [...GLOSSARY_TERMS]

    // Apply search filter
    if (search && search.length >= 2) {
      const searchLower = search.toLowerCase()
      filteredTerms = filteredTerms.filter(term =>
        term.term.toLowerCase().includes(searchLower) ||
        term.definition.toLowerCase().includes(searchLower) ||
        term.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
        term.examples?.some(example => example.toLowerCase().includes(searchLower))
      )

      // Track search if user is authenticated
      if (session?.user?.id) {
        try {
          await prisma.helpInteractions.create({
            data: {
              user_id: session.user.id,
              help_type: 'search',
              page_context: 'glossary',
              help_content_id: `search:${search}`,
              interaction_type: 'view'
            }
          })
        } catch (err) {
          console.warn('Error tracking glossary search:', err)
        }
      }
    }

    // Apply category filter
    if (category) {
      filteredTerms = filteredTerms.filter(term =>
        term.category.toLowerCase() === category.toLowerCase()
      )
    }

    // Apply difficulty filter
    if (difficulty) {
      filteredTerms = filteredTerms.filter(term =>
        term.difficulty === difficulty
      )
    }

    // Apply context filter
    if (context) {
      filteredTerms = filteredTerms.filter(term =>
        term.context === context
      )
    }

    // Sort by relevance (exact matches first, then alphabetical)
    if (search) {
      const searchLower = search.toLowerCase()
      filteredTerms.sort((a, b) => {
        const aExactMatch = a.term.toLowerCase().includes(searchLower)
        const bExactMatch = b.term.toLowerCase().includes(searchLower)

        if (aExactMatch && !bExactMatch) return -1
        if (!aExactMatch && bExactMatch) return 1

        return a.term.localeCompare(b.term)
      })
    } else {
      filteredTerms.sort((a, b) => a.term.localeCompare(b.term))
    }

    // Apply limit
    const limitedTerms = filteredTerms.slice(0, limit)

    // Get available categories and contexts for filtering
    const categories = [...new Set(GLOSSARY_TERMS.map(term => term.category))].sort()
    const contexts = [...new Set(GLOSSARY_TERMS.map(term => term.context))].sort()
    const difficulties = ['beginner', 'intermediate', 'advanced']

    return NextResponse.json({
      terms: limitedTerms,
      total: GLOSSARY_TERMS.length,
      filtered: filteredTerms.length,
      displayed: limitedTerms.length,
      filters: {
        categories,
        contexts,
        difficulties
      },
      query: {
        search,
        category,
        difficulty,
        context
      }
    })
  } catch (error) {
    console.error('Error fetching glossary terms:', error)
    return NextResponse.json(
      { error: 'Failed to fetch glossary terms' },
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

    const body = await request.json()
    const { term_id, interaction_type, helpful: _helpful } = body

    if (!term_id || !interaction_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Valid interaction types for glossary
    const validInteractionTypes = ['view', 'helpful', 'not_helpful', 'copy', 'share']
    if (!validInteractionTypes.includes(interaction_type)) {
      return NextResponse.json(
        { error: 'Invalid interaction type' },
        { status: 400 }
      )
    }

    // Find the term to validate it exists
    const term = GLOSSARY_TERMS.find(t => t.id === term_id)
    if (!term) {
      return NextResponse.json(
        { error: 'Term not found' },
        { status: 404 }
      )
    }

    // Record the interaction
    const interaction = await prisma.helpInteractions.create({
      data: {
        user_id: session.user.id,
        help_type: 'glossary',
        page_context: 'glossary',
        help_content_id: term_id,
        interaction_type
      }
    })

    return NextResponse.json({
      message: 'Glossary interaction recorded successfully',
      interaction_id: interaction.id,
      term: term.term
    })
  } catch (error) {
    console.error('Error recording glossary interaction:', error)
    return NextResponse.json(
      { error: 'Failed to record interaction' },
      { status: 500 }
    )
  }
}