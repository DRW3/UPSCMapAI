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
          content: 'You are an expert UPSC Civil Services tutor. Generate concise, factual study notes. Return only valid JSON.',
        },
        {
          role: 'user',
          content: `Generate comprehensive UPSC study notes for: "${topicTitle}" (Subject: ${subjectId.replace(/-/g, ' ')}).

This is for a UPSC Civil Services aspirant who needs to understand this topic thoroughly. Write like a top coaching institute teacher explaining to a beginner.

Return a JSON object:
{
  "summary": "4-5 sentence comprehensive overview. Start with what this topic is, its historical/geographical/political significance, and why it matters. Write in clear, simple English that even a first-time UPSC aspirant can understand.",
  "keyPoints": [
    "Detailed point with context and explanation (2-3 sentences each). Don't just state facts — explain WHY they matter.",
    ... (8-10 detailed key points covering all major aspects)
  ],
  "importantFacts": [
    "Specific fact with date/name/place/figure — formatted as 'Label: Detail'",
    ... (6-8 important facts that are commonly tested)
  ],
  "upscRelevance": "3-4 sentences explaining exactly how this topic appears in UPSC — which paper (Prelims GS/Mains GS-I/II/III/IV), what type of questions are asked, and what angle to prepare from.",
  "connections": "2-3 sentences connecting this topic to other UPSC syllabus topics. For example: 'This connects to Modern History through... and to Polity through...'"
}

Key concepts that MUST be covered: ${concepts || 'all major aspects'}

Rules:
- Write for a complete beginner — explain technical terms
- Each key point should be 2-3 sentences with context, not just one-liners
- Include specific years, names, places, constitutional articles, or policy names where relevant
- Cover multiple dimensions: historical background, current relevance, constitutional provisions, government schemes, international comparisons as applicable
- For history topics: include timeline, key personalities, causes and effects
- For polity topics: include article numbers, amendment details, landmark judgments
- For geography topics: include locations, climate data, economic significance
- For economy topics: include schemes, data points, policy evolution
- Make importantFacts formatted as "Label: Detail" (e.g., "Founded: 1947 by Jawaharlal Nehru")
- Return ONLY the JSON object, no markdown or code blocks`,
        },
      ],
      temperature: 0.3,
      max_tokens: 3000,
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
