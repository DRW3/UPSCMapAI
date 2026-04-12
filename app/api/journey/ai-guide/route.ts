import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export const runtime = 'nodejs'

let _nvidia: OpenAI | null = null
function getNvidia(): OpenAI {
  if (!_nvidia)
    _nvidia = new OpenAI({
      baseURL: 'https://integrate.api.nvidia.com/v1',
      apiKey: process.env.NVIDIA_API_KEY,
    })
  return _nvidia
}

const SECTION_IDS = [
  'hook',
  'overview',
  'timeline',
  'keyConcepts',
  'examStrategy',
  'quickFacts',
  'keyTakeaways',
  'connectedTopics',
  'comparison',
  'mindMap',
  'pyqTrends',
  'caseStudies',
  'commonMistakes',
  'mnemonic',
  'answerFramework',
  'sourceRecommendations',
] as const

interface ScriptRequest {
  topicTitle: string
  subjectId: string
  notes: Record<string, unknown>
  doubt?: string
}

function buildScriptPrompt(
  topicTitle: string,
  subjectId: string,
  notes: Record<string, unknown>
): string {
  // Only include sections that have content
  const presentSections: { id: string; content: string }[] = []

  for (const id of SECTION_IDS) {
    const val = notes[id]
    if (val === undefined || val === null) continue
    if (typeof val === 'string' && val.trim() === '') continue
    if (Array.isArray(val) && val.length === 0) continue

    presentSections.push({
      id,
      content:
        typeof val === 'string' ? val : JSON.stringify(val, null, 2),
    })
  }

  const sectionsBlock = presentSections
    .map((s) => `### ${s.id}\n${s.content}`)
    .join('\n\n')

  return `You are "Priya", a warm, encouraging UPSC mentor who makes every topic feel approachable and exam-relevant. You speak conversationally — use contractions ("you'll", "don't", "here's"), rhetorical questions ("Ever wondered why...?"), and UPSC exam references ("This is a Prelims favourite", "Mains GS-I loves this angle").

Topic: "${topicTitle}" (Subject: ${subjectId.replace(/-/g, ' ')})

Below are the study notes broken into sections. For EACH section that has content, produce a short conversational explanation (2-4 sentences). Do NOT copy the notes verbatim — rephrase them in your own warm, mentor voice. Make it sound like you're explaining to a student sitting across from you.

${sectionsBlock}

Return a JSON object with this EXACT structure (only include sections that appear above):
{
  "sections": [
    {"sectionId": "<id>", "speakText": "Your conversational explanation..."},
    ...
  ]
}

RULES:
1. Each speakText must be 2-4 sentences. Keep it concise but warm.
2. Use contractions, rhetorical questions, and UPSC exam tips naturally.
3. Reference how UPSC tests this where relevant ("UPSC loves asking about...", "In Prelims, they often frame this as...").
4. Do NOT use markdown, bullet points, or numbered lists in speakText — pure conversational text.
5. Return ONLY the JSON object. No markdown code blocks, no backticks.`
}

function buildDoubtPrompt(
  topicTitle: string,
  subjectId: string,
  doubt: string
): string {
  return `You are "Priya", a warm, encouraging UPSC mentor. A student studying "${topicTitle}" (${subjectId.replace(/-/g, ' ')}) has a doubt.

Student's question: "${doubt}"

Give a brief, clear answer (3-5 sentences). Be conversational — use contractions, be encouraging, and tie it back to UPSC exam relevance where appropriate. If the question is vague, give the most helpful interpretation.

Return a JSON object:
{"answer": "Your conversational answer here..."}

RULES:
1. 3-5 sentences max. Concise but complete.
2. Warm mentor tone — contractions, encouragement, exam tips.
3. Return ONLY the JSON object. No markdown code blocks.`
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ScriptRequest
    const { topicTitle, subjectId, notes, doubt } = body

    if (!topicTitle || !notes) {
      return NextResponse.json(
        { error: 'Missing topicTitle or notes' },
        { status: 400 }
      )
    }

    const isDoubtMode = typeof doubt === 'string' && doubt.trim().length > 0

    const userMessage = isDoubtMode
      ? buildDoubtPrompt(topicTitle, subjectId || '', doubt)
      : buildScriptPrompt(topicTitle, subjectId || '', notes)

    const response = await getNvidia().chat.completions.create({
      model: 'meta/llama-3.1-70b-instruct',
      messages: [{ role: 'user', content: userMessage }],
      temperature: 0.5,
      max_tokens: 2048,
    })

    const text = response.choices[0]?.message?.content?.trim() || '{}'

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'Failed to parse LLM response' },
        { status: 500 }
      )
    }

    const parsed = JSON.parse(jsonMatch[0])

    if (isDoubtMode) {
      return NextResponse.json({ answer: parsed.answer || '' })
    }

    return NextResponse.json({
      sections: Array.isArray(parsed.sections) ? parsed.sections : [],
    })
  } catch (err) {
    console.error('AI Guide error:', err)
    return NextResponse.json(
      { error: 'AI Guide generation failed' },
      { status: 500 }
    )
  }
}
