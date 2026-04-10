import { NextResponse } from 'next/server'
import Groq from 'groq-sdk'

let _groq: Groq | null = null
function getGroq(): Groq {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  return _groq
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { question, context } = await req.json()
    if (!question || typeof question !== 'string') {
      return NextResponse.json({ answer: 'Please ask a question.' }, { status: 400 })
    }

    const systemPrompt = `You are PadhAI, a friendly and encouraging AI mentor for UPSC Civil Services exam preparation. You speak like a senior mentor who genuinely cares about the aspirant's success.

Context about the student:
- Name: ${context?.name || 'Aspirant'}
- Currently viewing: ${context?.tab || 'home'} tab
- Current topic: ${context?.topicTitle || 'not set'}
- Current subject: ${context?.subjectTitle || 'not set'}
- Streak: ${context?.streak ?? 0} days

Rules:
1. Keep answers concise (2-4 sentences max)
2. Be specific to UPSC preparation
3. If they ask about a topic, give a quick study tip or PYQ pattern for that topic
4. If they ask about strategy, give actionable advice
5. Always be encouraging but honest
6. Use simple English — no jargon
7. If the question is unrelated to UPSC/studies, gently redirect to preparation`

    const response = await getGroq().chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
      temperature: 0.4,
      max_tokens: 300,
    })

    const answer = response.choices[0]?.message?.content?.trim() || "I'm not sure about that. Try asking about a specific UPSC topic or study strategy!"

    return NextResponse.json({ answer })
  } catch (err) {
    console.error('Mentor chat error:', err)
    return NextResponse.json({ answer: "Something went wrong. Try again in a moment!" }, { status: 200 })
  }
}
