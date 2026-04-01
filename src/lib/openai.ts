import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'

let _systemPrompt: string | null = null

function getSystemPrompt(): string {
  if (_systemPrompt) return _systemPrompt
  try {
    _systemPrompt = fs.readFileSync(
      path.join(process.cwd(), 'AGENT_PROMPT.md'),
      'utf-8'
    )
  } catch {
    console.error(
      '[openai] AGENT_PROMPT.md okunamadı (Vercel paketi?). Kısa yedek prompt kullanılıyor.'
    )
    _systemPrompt =
      'You are Blex, a friendly dental clinic assistant. Reply briefly in the user language.'
  }
  return _systemPrompt
}

export async function getAIResponse(
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: getSystemPrompt() },
      ...history,
      { role: 'user', content: userMessage },
    ],
    max_tokens: 500,
    temperature: 0.7,
  })

  return response.choices[0].message.content ?? ''
}
