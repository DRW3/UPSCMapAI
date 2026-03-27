import { NextRequest } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

const SYSTEM = `You are a concise UPSC geography and history expert.
Given a location name and map context, return a focused study card in markdown.

Format EXACTLY like this (use these headings, keep it tight):

## About
2-3 crisp sentences. What it is, where it is, why it matters geographically or historically.

## UPSC Relevance
1-2 sentences on which paper/topic this appears in and why examiners ask about it.

## Key Facts
- Fact 1 (specific, exam-relevant — dates, measurements, firsts, records)
- Fact 2
- Fact 3
- Fact 4

## Syllabus
GS-I / GS-II / GS-III / Prelims — specific syllabus topic in 5 words max.

Rules: No fluff. No "this is important because". Examiners love numbers, firsts, and comparisons. If you know a PYQ angle, mention it. Be crisp.`

export async function POST(req: NextRequest) {
  const { name, icon, mapContext } = await req.json()
  if (!name) return new Response('Missing name', { status: 400 })

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          systemInstruction: SYSTEM,
        })

        const prompt = `Location: ${icon} ${name}
Map context: ${mapContext || 'India geography'}`

        const result = await model.generateContentStream(prompt)

        for await (const chunk of result.stream) {
          const text = chunk.text()
          if (text) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' })}\n\n`)
        )
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store',
      Connection: 'keep-alive',
    },
  })
}
