import { GoogleGenerativeAI } from '@google/generative-ai'
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
      '[gemini] AGENT_PROMPT.md okunamadı; kısa yedek prompt kullanılıyor.'
    )
    _systemPrompt =
      'You are Blex, a friendly dental clinic assistant. Reply briefly in the user language.'
  }
  return _systemPrompt
}

/** Google AI Studio: https://aistudio.google.com/app/apikey — İsteğe bağlı: GEMINI_MODEL=gemini-1.5-pro */
const DEFAULT_MODEL = 'gemini-2.0-flash'

export async function getGeminiResponse(
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY tanımlı değil. Google AI Studio’dan anahtar alıp Vercel ve .env.local’a ekleyin.'
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
      role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
      parts: [{ text: m.content.trim() }],
    }))

  const modelName = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: getSystemPrompt(),
  })

  const chat = model.startChat({ history: cleanHistory })
  const result = await chat.sendMessage(userMessage.trim())
  return result.response.text()
}
