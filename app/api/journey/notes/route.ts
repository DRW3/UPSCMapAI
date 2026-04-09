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

  // Models in order of preference — fall back if rate-limited
  const MODELS = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile']

  try {
    const isCsat = subjectId === 'csat'

    const systemMessage = isCsat
      ? "You are India's top UPSC CSAT Paper II tutor — you make quantitative aptitude, logical reasoning, and comprehension genuinely easy to master. You explain like a brilliant friend who breaks down every problem step-by-step with formulas, shortcuts, and tricks. Return only valid JSON, never markdown code blocks."
      : "You are India's most engaging UPSC tutor — you make students genuinely excited about every topic. You explain like a brilliant friend who knows everything: conversational, vivid, full of surprising details. Generate study notes that are impossible to stop reading. Return only valid JSON, never markdown code blocks."

    const userMessage = isCsat
      ? `Generate UPSC CSAT Paper II study notes for: "${topicTitle}" (Subject: CSAT Paper II).

This is a quantitative/reasoning/comprehension topic. Focus on FORMULAS, METHODS, WORKED EXAMPLES, and SHORTCUTS — not generic theory.

Return a JSON object with this EXACT structure:

{
  "hook": "A surprising CSAT fact or tricky question that makes the reader curious",
  "summary": "2-3 sentences explaining what this topic covers in CSAT and why it matters for Paper II",

  "formulas": [
    {
      "name": "Human-readable formula name",
      "formula": "Mathematical expression written clearly, e.g. Speed = Distance ÷ Time",
      "variables": "What each variable means, e.g. S = speed (km/h), D = distance (km), T = time (hours)",
      "when": "When to use this formula — what type of question triggers it"
    }
  ],

  "methods": [
    {
      "name": "Method name, e.g. 'Solving Percentage Increase Problems'",
      "steps": [
        "Step 1: Identify the original value (base)",
        "Step 2: Find the change (new - old)",
        "Step 3: Calculate (change / original) × 100"
      ],
      "tip": "Pro tip for this method"
    }
  ],

  "workedExamples": [
    {
      "question": "A real UPSC CSAT-style question",
      "steps": [
        "Step 1: Identify given values — ...",
        "Step 2: Apply formula — ...",
        "Step 3: Calculate — ..."
      ],
      "answer": "The final answer with units",
      "type": "Category like 'Time, Speed & Distance' or 'Syllogisms'"
    }
  ],

  "shortcuts": [
    "To find 15% of any number: find 10% + half of it",
    "For percentage change: use fraction equivalents (25% = 1/4, 33.3% = 1/3)"
  ],

  "questionPatterns": [
    {
      "type": "Pattern name, e.g. 'Direct Formula Application'",
      "description": "How UPSC frames this type — what the question looks like",
      "frequency": "Very Common / Common / Occasional"
    }
  ],

  "keyPoints": ["6-8 key conceptual points with **bold** terms"],
  "importantFacts": ["Label: Detail format facts"],
  "examTip": "CSAT-specific strategy — time management, elimination, question selection",
  "upscRelevance": "Paper II specific — how many questions, marks, qualifying nature",
  "connections": "Links to other CSAT topics",
  "keyTakeaways": ["3-4 essential points"]
}

Key concepts that MUST be covered: ${concepts || 'all major aspects'}

CRITICAL RULES:
1. "formulas": Include ALL relevant formulas for this topic. For math topics, include 4-8 formulas. For reasoning topics, include 2-3 key rules/formulas. For comprehension topics (reading-comprehension, critical-reading, para-jumbles), set to empty array [].
2. "methods": Include 2-4 step-by-step solving methods. Each method should have 3-6 clear numbered steps. MUST be specific and actionable.
3. "workedExamples": Include 2-3 fully solved examples. Questions should be realistic UPSC CSAT level. Show EVERY calculation step. Include the final answer clearly.
4. "shortcuts": Include 3-6 practical time-saving tricks. These should be genuinely useful for exam speed.
5. "questionPatterns": Include 3-5 patterns showing how UPSC frames questions on this topic.
6. For comprehension topics (reading-comprehension, critical-reading, para-jumbles): formulas=[], focus on methods and workedExamples with passage-analysis techniques.
7. For reasoning topics: include logical rules as "formulas", deduction methods as "methods".
8. "keyPoints": MUST have 6-8 points. MUST use **double asterisks** around key terms in each point.
9. Return ONLY the JSON object. No markdown code blocks, no backticks, no explanation outside the JSON.`
      : `Generate rich, engaging UPSC study notes for: "${topicTitle}" (Subject: ${subjectId.replace(/-/g, ' ')}).

Write like you're explaining to a curious friend over chai — vivid, surprising, and impossible to forget. NOT like a textbook.

Return a JSON object with this EXACT structure:

{
  "hook": "A genuinely surprising fact, a thought-provoking question, a real UPSC PYQ, a counterintuitive detail, a 'What if...' question, or a fascinating historical anecdote about this topic. This must make the reader think 'Oh wow, I NEED to know more about this!' — NOT a generic opening statement.",

  "summary": "3-4 crisp sentences. What is this topic, why does it matter in the big picture, and what makes it fascinating. No filler words.",

  "keyPoints": [
    "Each point MUST use **double asterisks** around 1-2 key terms/phrases for visual emphasis. Example: '**Article 21** guarantees the right to life, but the Supreme Court has expanded this to include the right to privacy, clean air, and even the right to sleep. This single article has been the foundation of more landmark judgments than any other.' Each point should be 2-3 sentences explaining the WHAT and the WHY — why does this matter, what's the significance.",
    "... (6-8 points total covering all major aspects)"
  ],

  "timeline": [
    {"year": "326 BCE", "event": "Alexander invades India — retreats from Beas after army mutiny"},
    {"year": "321 BCE", "event": "Chandragupta Maurya defeats Nanda dynasty, establishes Mauryan Empire"}
  ],

  "comparison": {
    "title": "Descriptive comparison title (e.g. 'Lok Sabha vs Rajya Sabha')",
    "headers": ["Column A label", "Column B label"],
    "rows": [
      ["Row 1 Col A content", "Row 1 Col B content"],
      ["Row 2 Col A content", "Row 2 Col B content"]
    ]
  },

  "importantFacts": [
    "Capital: Pataliputra (modern-day Patna, Bihar)",
    "Area: Stretched from Afghanistan to Bengal, covering most of the Indian subcontinent",
    "... (5-6 facts in this 'Label: Detail' format — real data, NOT this example)"
  ],

  "examTip": "Practical exam strategy — be SPECIFIC. Mention actual question patterns UPSC uses, common wrong answer traps, which angle they test from, and what most aspirants miss. e.g. 'UPSC often frames questions on Fundamental Rights as negative statements — asking what is NOT a FR. They also love mixing up FR articles with DPSP articles.'",

  "upscRelevance": "Which paper (Prelims GS / Mains GS-I/II/III/IV / Essay), what type of questions are asked (factual, analytical, application-based), and how frequently this appears. Be specific.",

  "connections": "Connect to 2-3 other specific UPSC syllabus topics with brief explanation of the link. e.g. 'Connects to Fundamental Rights (Part III vs Part IV debate), to 73rd/74th Amendments (local governance link), and to Judicial Review (enforcement mechanisms).'",

  "keyTakeaways": [
    "If you remember nothing else, remember THIS — 3-4 concise bullet points that capture the absolute essentials.",
    "..."
  ]
}

Key concepts that MUST be covered: ${concepts || 'all major aspects'}

CRITICAL RULES:
1. "timeline": ONLY include for history/chronological topics where dates matter. Include 4-8 entries with years and concise events. For non-chronological topics (like Geography concepts, Polity principles, Economy theories), set to empty array [].
2. "comparison": ONLY include when there's a natural, meaningful comparison (e.g. Fundamental Rights vs DPSP, Lok Sabha vs Rajya Sabha, Mughal vs Maratha administration, Tropical vs Temperate cyclones). Include 3-5 rows. For topics without a natural comparison, set to null. IMPORTANT: "comparison.title" and each string inside "comparison.headers" must be PLAIN TEXT ONLY — NO asterisks, NO **bold** markers, NO [[term||explanation]] highlights, NO markdown of any kind. They render as labels, not rich text. Example of CORRECT headers: ["Northern Plains", "Coastal Plains"]. Example of WRONG headers: ["**Northern Plains**", "**Coastal Plains**"]. The title should be a clean short label like "Northern Plains vs Coastal Plains", NOT "**Northern Plains vs Coastal Plains**".
3. "keyPoints": MUST have 6-8 points. MUST use **double asterisks** around key terms in each point. Each point 2-3 sentences with context and significance.
4. "importantFacts": Each fact must be a REAL fact about this topic in "Label: Detail" format. Never include example/template text. Include specific numbers, dates, article numbers, names, places.
5. "hook": Must be genuinely surprising or thought-provoking. A real PYQ question, a counterintuitive fact, a fascinating anecdote, or a provocative "did you know". NEVER a bland statement like "This is an important topic."
6. "examTip": Be hyper-specific about how UPSC tests this — question patterns, common traps, what angle to prepare.
7. "keyTakeaways": 3-4 crisp "remember this above all" bullets.
8. Write for a complete beginner — explain jargon when you use it.
9. Return ONLY the JSON object. No markdown code blocks, no backticks, no explanation outside the JSON.
10. Within "summary", "keyPoints", "hook", and "keyTakeaways" text, highlight 3-5 important terms per section using [[term||explanation]] syntax where term is the key phrase (a person, place, concept, article, treaty, battle, policy, scheme, constitutional provision, etc.) and explanation is 1-2 sentences about what it is and why it matters for UPSC. Example: "The [[Mauryan Empire||Founded by Chandragupta Maurya in 321 BCE. One of the most frequently tested topics in Prelims GS-I — focus on Ashoka's edicts, administrative divisions, and decline.]] was the first large empire in India." Highlight 3-5 key terms per text field — names, dates, articles, policies, battles, treaties, schemes, constitutional provisions. Don't over-highlight. Only highlight genuinely important terms that an aspirant would benefit from understanding deeply. Do NOT highlight common words or obvious terms. Do NOT use this syntax in importantFacts, upscRelevance, or connections fields.`

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
        break // success — stop trying models
      } catch (modelErr: unknown) {
        const err = modelErr as { status?: number; message?: string }
        if (err.status === 429 || (err.message && err.message.includes('429'))) {
          console.warn(`Notes: ${model} rate-limited, trying next model...`)
          continue // try next model
        }
        throw modelErr // non-rate-limit error — bubble up
      }
    }
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ notes: null, error: 'Failed to parse' }, { status: 200 })
    }

    const notes = JSON.parse(jsonMatch[0])

    // Post-process: filter out prompt-leakage from importantFacts
    if (Array.isArray(notes.importantFacts)) {
      notes.importantFacts = notes.importantFacts.filter(
        (f: string) => !/Label:\s*Detail|e\.g\.\s*'Founded|specific dates.*article numbers|NOT this example/i.test(f)
      )
    }

    return NextResponse.json({ notes })
  } catch (err) {
    console.error('Notes generation error:', err)
    return NextResponse.json({ notes: null, error: 'Generation failed' }, { status: 200 })
  }
}
