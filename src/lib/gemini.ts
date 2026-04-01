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

/** Önce env, yoksa yaygın modeller (API / bölge farkı için sırayla dene) */
function modelCandidates(): string[] {
  const fromEnv = process.env.GEMINI_MODEL?.trim()
  /* 1.5-flash: AI Studio ücretsiz kotada genelde en sorunsuz */
  const fallback = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro']
  const list = fromEnv ? [fromEnv, ...fallback] : fallback
  return [...new Set(list)]
}

type Turn = { role: 'user' | 'model'; text: string }

/** Gemini çoklu turda user/model sırası ister; üst üste aynı rolü birleştir. */
function mergeToTurns(
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  latestUserText: string
): Turn[] {
  const rows = history
    .filter(
      (m) =>
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim().length > 0
    )
    .map((m) => ({
      role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
      text: m.content.trim(),
    }))

  const turns: Turn[] = []
  for (const row of rows) {
    const prev = turns[turns.length - 1]
    if (prev && prev.role === row.role) {
      prev.text += '\n' + row.text
    } else {
      turns.push({ ...row })
    }
  }

  const latest = latestUserText.trim()
  const last = turns[turns.length - 1]
  if (latest) {
    if (last?.role === 'user') {
      last.text += '\n' + latest
    } else {
      turns.push({ role: 'user', text: latest })
    }
  }

  while (turns.length > 0 && turns[0].role === 'model') {
    turns.shift()
  }

  return turns
}

function extractTextFromResponse(result: {
  response: {
    text: () => string
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
}): string {
  try {
    const t = result.response.text()
    if (t?.trim()) return t
  } catch {
    /* safety block vb. */
  }
  const parts = result.response.candidates?.[0]?.content?.parts
  const joined = parts?.map((p) => p.text ?? '').join('') ?? ''
  return joined.trim()
}

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

  const turns = mergeToTurns(history, userMessage)
  const contents = turns.map((t) => ({
    role: t.role,
    parts: [{ text: t.text }],
  }))

  const genAI = new GoogleGenerativeAI(apiKey)
  const systemInstruction = getSystemPrompt()

  let lastErr: unknown = null
  for (const modelName of modelCandidates()) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
      })
      const result = await model.generateContent({ contents })
      const text = extractTextFromResponse(result)
      if (text) {
        return text
      }
      lastErr = new Error('Boş yanıt (içerik filtresi olabilir)')
    } catch (e) {
      lastErr = e
      const msg = e instanceof Error ? e.message : String(e)
      console.warn('[gemini] model denemesi başarısız:', modelName, msg)
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error(String(lastErr ?? 'Gemini yanıt üretemedi'))
}
