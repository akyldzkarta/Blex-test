import { getGeminiResponse } from '@/lib/gemini'

/**
 * Production’da Gemini + Vercel env doğrulama.
 * 1) Vercel’e BLEX_INTERNAL_SECRET ve GEMINI_API_KEY ekleyin, redeploy.
 * 2) PowerShell: irm -Method POST -Uri "https://SİTE/api/internal/test-gemini" -Headers @{ "x-blex-internal-secret" = "SİZİN_SECRET" }
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

  const keyPresent = Boolean(process.env.GEMINI_API_KEY?.trim())
  if (!keyPresent) {
    return Response.json({
      ok: false,
      error:
        'Sunucuda GEMINI_API_KEY yok — Vercel Environment Variables → Production → ekleyip Redeploy.',
    })
  }

  try {
    const reply = await getGeminiResponse(
      'Yanıt olarak tek kelime yaz: Tamam',
      []
    )
    return Response.json({
      ok: true,
      replyPreview: reply.slice(0, 300),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ ok: false, error: msg })
  }
}
