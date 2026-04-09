import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'

let _groq: Groq | null = null
function getGroq(): Groq {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return _groq
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const topicId = searchParams.get('topic') || ''
  const subjectId = searchParams.get('subject') || ''
  const topicTitle = searchParams.get('title') || topicId.replace(/-/g, ' ')
  const concepts = searchParams.get('concepts') || ''

  if (!topicId) {
    return NextResponse.json({ error: 'Missing topic' }, { status: 400 })
  }

  try {
    const isCsat = subjectId === 'csat'

    const systemMessage = isCsat
      ? 'You are a UPSC CSAT Paper II expert. Generate advanced practice aids focused on problem-solving techniques, visual concept explanations, and graded practice questions. Return only valid JSON, never markdown code blocks.'
      : 'You are a UPSC preparation expert. Generate advanced study aids for aspirants. Return only valid JSON, never markdown code blocks.'

    const userMessage = isCsat
      ? `Generate advanced UPSC CSAT Paper II study aids for: "${topicTitle}" (Subject: CSAT Paper II).

Return a JSON object with ALL these fields:

{
  "mnemonic": "A clever mnemonic/acronym to remember key formulas, rules, or methods for this CSAT topic. e.g. 'DATS for Distance problems: Distance = Average speed × Total time (Sum of times)'. Must be catchy and useful for exam recall.",

  "commonMistakes": [
    "CSAT-specific mistake — e.g. 'Forgetting to convert km/h to m/s (divide by 3.6, not multiply)'",
    "Reading trap answers — e.g. 'UPSC places the value you get after one wrong step as an option'",
    "Time management error — e.g. 'Spending 5+ minutes on a single hard question instead of moving on'"
  ],

  "sourceRecommendations": [
    {"source": "Book name + specific chapter/section", "why": "Why this is the go-to source for this topic"}
  ],

  "mindMap": {
    "central": "${topicTitle}",
    "branches": [
      {"name": "Branch name", "sub": ["Sub-concept A", "Sub-concept B"]}
    ]
  },

  "diagrams": [
    {
      "title": "Diagram title, e.g. 'Venn Diagram for 2 Sets'",
      "type": "concept",
      "description": "Detailed text description of what the diagram shows — explain the visual structure, relationships, and key labels. This will be rendered as a styled card, not an actual drawing."
    }
  ],

  "practiceTypes": [
    {
      "level": "Easy",
      "question": "A practice question at easy difficulty",
      "answer": "The answer with brief explanation"
    },
    {
      "level": "Medium",
      "question": "A practice question at medium difficulty",
      "answer": "The answer with brief explanation"
    },
    {
      "level": "Hard",
      "question": "A practice question at hard difficulty",
      "answer": "The answer with brief explanation"
    }
  ]
}

RULES:
1. "mnemonic": ALWAYS create a genuinely useful memory aid for formulas or methods — acronym, rhyme, or visual association.
2. "commonMistakes": 3-5 CSAT-specific errors — sign errors, reading trap answers, wasting time on hard questions, not eliminating options first, unit conversion mistakes, misreading "at least" vs "at most".
3. "sourceRecommendations": 2-3 actual CSAT prep books — R.S. Aggarwal (Verbal & Non-Verbal Reasoning), M.K. Pandey (Analytical Reasoning), Arihant CSAT Manual, TMH CSAT Paper II, McGraw Hill Quantitative Aptitude, etc. Include specific chapters/sections.
4. "mindMap": 3-5 branches, each with 2-4 sub-points. Bird's-eye view of the topic and its sub-areas.
5. "diagrams": 1-3 entries. Describe visual concepts in text — Venn diagrams, number lines, tree structures, flowcharts, tables. Description should be detailed enough to understand the concept without an actual image.
6. "practiceTypes": Include EXACTLY 3 — one Easy, one Medium, one Hard. These are self-test questions with clear answers and explanations. Questions should be realistic UPSC CSAT level.
7. Return ONLY the JSON object. No markdown, no backticks.

Key concepts: ${concepts || 'all major aspects'}`
      : `Generate advanced UPSC study aids for: "${topicTitle}" (Subject: ${subjectId.replace(/-/g, ' ')}).

Return a JSON object with ALL these fields:

{
  "mnemonic": "A clever mnemonic/acronym to remember key aspects. e.g. 'HOMES for Great Lakes' or 'FARM-BISEC for FR Articles 14-32'. Must be catchy and useful.",

  "pyqTrends": [
    {"year": "2023", "pattern": "How UPSC asked this — paper, question type, angle"}
  ],

  "caseStudies": [
    {"title": "Case study title", "detail": "2-3 sentences with specific names, dates, places — usable in Mains answers"}
  ],

  "commonMistakes": [
    "Specific mistake — e.g. 'Confusing Article 32 (SC) with Article 226 (HC)'"
  ],

  "sourceRecommendations": [
    {"source": "Book name + chapter", "why": "Why this is the go-to source"}
  ],

  "mindMap": {
    "central": "${topicTitle}",
    "branches": [
      {"name": "Branch name", "sub": ["Sub-point A", "Sub-point B"]}
    ]
  }
}

RULES:
1. "mnemonic": ALWAYS create a genuinely useful memory aid — acronym, rhyme, or visual association.
2. "pyqTrends": 3-5 entries with realistic years and question patterns. Include paper (Prelims/Mains GS-I/II/III/IV) and type.
3. "caseStudies": 2-3 real examples with specific names, dates, places.
4. "commonMistakes": 3-5 specific errors aspirants make. Be precise about what gets confused.
5. "sourceRecommendations": 2-3 standard UPSC books (Laxmikanth, Spectrum, Shankar IAS, Ramesh Singh, etc.) with chapters.
6. "mindMap": 3-5 branches, each with 2-4 sub-points. Bird's-eye view of the topic.
7. Return ONLY the JSON object. No markdown, no backticks.

Key concepts: ${concepts || 'all major aspects'}`

    const MODELS = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile']
    let text = '{}'
    for (const model of MODELS) {
      try {
        const response = await getGroq().chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        })
        text = response.choices[0]?.message?.content?.trim() || '{}'
        break
      } catch (modelErr: unknown) {
        const err = modelErr as { status?: number; message?: string }
        if (err.status === 429 || (err.message && err.message.includes('429'))) {
          console.warn(`Enhanced notes: ${model} rate-limited, trying next model...`)
          continue
        }
        throw modelErr
      }
    }
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ enhanced: null }, { status: 200 })
    }

    const enhanced = JSON.parse(jsonMatch[0])
    return NextResponse.json({ enhanced })
  } catch (err) {
    console.error('Enhanced notes error:', err)
    return NextResponse.json({ enhanced: null }, { status: 200 })
  }
}
