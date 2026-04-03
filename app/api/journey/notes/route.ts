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
          content: `Generate concise UPSC study notes for: "${topicTitle}" (Subject: ${subjectId.replace(/-/g, ' ')}).

Return a JSON object:
{
  "summary": "3-4 sentence overview of this topic for UPSC preparation",
  "keyPoints": [
    "Clear, factual point 1",
    "Clear, factual point 2",
    ... (6-8 key points)
  ],
  "importantFacts": [
    "Specific date, name, or fact 1",
    "Specific date, name, or fact 2",
    ... (4-6 important facts)
  ],
  "upscRelevance": "2 sentences on why this matters for UPSC and what aspects are commonly tested in Prelims/Mains",
  "connections": "1-2 sentences linking this topic to related topics in the UPSC syllabus"
}

Key concepts to cover: ${concepts || 'general overview'}

Rules:
- Be precise and factual — no vague statements
- Include specific dates, names, places, and figures where relevant
- Each key point should be 1-2 sentences max
- Focus on what UPSC actually tests
- Return ONLY the JSON object, no markdown`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
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
