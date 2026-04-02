const REST_BASE =
  'https://generativelanguage.googleapis.com/v1beta'

/**
 * Gemini hesabına göre hangi modeller çalışıyor onu listeler.
 *  - BLEX_INTERNAL_SECRET doğrulaması yapar.
 *  - response: { ok, status, models[] }
 *
 * PowerShell (Vercel):
 *   $secret="secret-1234"
 *   irm -Method POST -Uri "https://blex-test.vercel.app/api/internal/test-gemini-models" `
 *     -Headers @{ "x-blex-internal-secret" = $secret }
 */
export async function POST(request: Request) {
  const expected = process.env.BLEX_INTERNAL_SECRET?.trim()
  if (!expected) {
    return Response.json({ error: 'BLEX_INTERNAL_SECRET tanımlı değil' }, { status: 404 })
  }

  const sent = request.headers.get('x-blex-internal-secret')?.trim()
  if (sent !== expected) {
    return Response.json({ error: 'yetkisiz' }, { status: 401 })
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim()
  if (!apiKey) {
    return Response.json(
      { ok: false, error: 'GEMINI_API_KEY tanımlı değil' },
      { status: 500 }
    )
  }

  const url = `${REST_BASE}/models?key=${encodeURIComponent(apiKey)}`

  const res = await fetch(url, { method: 'GET' })
  const raw = await res.text()

  if (!res.ok) {
    return Response.json(
      { ok: false, status: res.status, error: raw.slice(0, 1000) },
      { status: 500 }
    )
  }

  let data: any = null
  try {
    data = JSON.parse(raw)
  } catch {
    return Response.json(
      { ok: false, status: res.status, error: 'models listesi parse edilemedi' },
      { status: 500 }
    )
  }

  const models: string[] =
    (data?.models ?? [])
      .map((m: any) => m?.name ?? m?.id)
      .filter((x: any) => typeof x === 'string')
      .slice(0, 100) ?? []

  return Response.json({ ok: true, status: res.status, models })
}

