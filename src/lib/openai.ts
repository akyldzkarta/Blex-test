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
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY tanımlı değil. Vercel → Settings → Environment Variables içine ekleyip yeniden deploy edin.'
    )
  }

  const cleanHistory = history
    .filter(
      (m) =>
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim().length > 0
    )
    .map((m) => ({
      role: m.role,
      content: m.content.trim(),
    })) as Array<{ role: 'user' | 'assistant'; content: string }>

  const openai = new OpenAI({ apiKey })

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: getSystemPrompt() },
      ...cleanHistory,
      { role: 'user', content: userMessage.trim() },
    ],
    max_tokens: 500,
    temperature: 0.7,
  })

  return response.choices[0].message.content ?? ''
}
