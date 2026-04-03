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
    const response = await getGroq().chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content:
            "You are India's most engaging UPSC tutor — you make students genuinely excited about every topic. You explain like a brilliant friend who knows everything: conversational, vivid, full of surprising details. Generate study notes that are impossible to stop reading. Return only valid JSON, never markdown code blocks.",
        },
        {
          role: 'user',
          content: `Generate rich, engaging UPSC study notes for: "${topicTitle}" (Subject: ${subjectId.replace(/-/g, ' ')}).

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
    "Label: Detail — specific dates, article numbers, names, figures. e.g. 'Founded: 1950, under Article 280 of the Constitution'",
    "... (5-6 facts)"
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
2. "comparison": ONLY include when there's a natural, meaningful comparison (e.g. Fundamental Rights vs DPSP, Lok Sabha vs Rajya Sabha, Mughal vs Maratha administration, Tropical vs Temperate cyclones). Include 3-5 rows. For topics without a natural comparison, set to null.
3. "keyPoints": MUST have 6-8 points. MUST use **double asterisks** around key terms in each point. Each point 2-3 sentences with context and significance.
4. "importantFacts": Use "Label: Detail" format. Include specific numbers, dates, article numbers, names, places.
5. "hook": Must be genuinely surprising or thought-provoking. A real PYQ question, a counterintuitive fact, a fascinating anecdote, or a provocative "did you know". NEVER a bland statement like "This is an important topic."
6. "examTip": Be hyper-specific about how UPSC tests this — question patterns, common traps, what angle to prepare.
7. "keyTakeaways": 3-4 crisp "remember this above all" bullets.
8. Write for a complete beginner — explain jargon when you use it.
9. Return ONLY the JSON object. No markdown code blocks, no backticks, no explanation outside the JSON.
10. Within "summary", "keyPoints", "hook", and "keyTakeaways" text, highlight 3-5 important terms per section using [[term||explanation]] syntax where term is the key phrase (a person, place, concept, article, treaty, battle, policy, scheme, constitutional provision, etc.) and explanation is 1-2 sentences about what it is and why it matters for UPSC. Example: "The [[Mauryan Empire||Founded by Chandragupta Maurya in 321 BCE. One of the most frequently tested topics in Prelims GS-I — focus on Ashoka's edicts, administrative divisions, and decline.]] was the first large empire in India." Highlight 3-5 key terms per text field — names, dates, articles, policies, battles, treaties, schemes, constitutional provisions. Don't over-highlight. Only highlight genuinely important terms that an aspirant would benefit from understanding deeply. Do NOT highlight common words or obvious terms. Do NOT use this syntax in importantFacts, upscRelevance, or connections fields.`,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    })

    const text = response.choices[0]?.message?.content?.trim() || '{}'
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ notes: null, error: 'Failed to parse' }, { status: 200 })
    }

    const notes = JSON.parse(jsonMatch[0])
    return NextResponse.json({ notes })
  } catch (err) {
    console.error('Notes generation error:', err)
    return NextResponse.json({ notes: null, error: 'Generation failed' }, { status: 200 })
  }
}
