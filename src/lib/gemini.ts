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

const REST_BASE =
  'https://generativelanguage.googleapis.com/v1beta'

function modelCandidates(): string[] {
  const fromEnv = process.env.GEMINI_MODEL?.trim()
  const fallback = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-001',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
  ]
  const list = fromEnv ? [fromEnv, ...fallback] : fallback
  return [...new Set(list)]
}

type Turn = { role: 'user' | 'model'; text: string }

/** Gemini çoklu tur: user/model sırası; üst üste aynı rol birleştirilir. */
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

type RestErrorBody = {
  error?: { code?: number; message?: string; status?: string }
  promptFeedback?: { blockReason?: string }
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
    finishReason?: string
  }>
}

async function callGeminiRest(
  apiKey: string,
  model: string,
  systemInstruction: string,
  turns: Turn[]
): Promise<string> {
  const url = `${REST_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`

  const contents = turns.map((t) => ({
    role: t.role,
    parts: [{ text: t.text }],
  }))

  const body = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
    ],
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = (await res.json()) as RestErrorBody

  if (!res.ok) {
    const m = data.error?.message ?? `${res.status} ${res.statusText}`
    throw new Error(`Gemini API: ${m}`)
  }

  if (data.promptFeedback?.blockReason) {
    throw new Error(`Gemini prompt engellendi: ${data.promptFeedback.blockReason}`)
  }

  const parts = data.candidates?.[0]?.content?.parts
  const text = parts?.map((p) => p.text ?? '').join('') ?? ''
  const trimmed = text.trim()
  if (!trimmed) {
    const fr = data.candidates?.[0]?.finishReason
    throw new Error(`Gemini boş yanıt (finishReason: ${fr ?? 'yok'})`)
  }
  return trimmed
}

export async function getGeminiResponse(
  userMessage: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY tanımlı değil. Google AI Studio anahtarını Vercel Environment Variables (Production) ve .env.local’a ekleyin; sonra Redeploy.'
    )
  }

  const turns = mergeToTurns(history, userMessage)
  const systemInstruction = getSystemPrompt()

  let lastErr: unknown = null
  for (const modelName of modelCandidates()) {
    try {
      return await callGeminiRest(apiKey, modelName, systemInstruction, turns)
    } catch (e) {
      lastErr = e
      const msg = e instanceof Error ? e.message : String(e)
      console.warn('[gemini] model başarısız:', modelName, msg)
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error(String(lastErr ?? 'Gemini yanıt üretemedi'))
}
