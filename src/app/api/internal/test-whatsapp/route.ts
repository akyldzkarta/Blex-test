import { sendWhatsAppMessage } from '@/lib/whatsapp'

/**
 * Meta Cloud API’nin gerçekten mesaj atabildiğini test eder.
 * Body JSON: { "to": "905551234567" } — ülke kodu ile, WhatsApp’ta sana yazan numarayla aynı format.
 *
 * PowerShell:
 * $body = '{"to":"905551234567"}'
 * irm -Method POST -Uri "https://SİTE/api/internal/test-whatsapp" -Headers @{ "x-blex-internal-secret"="SECRET"; "Content-Type"="application/json" } -Body $body
 */
export async function POST(request: Request) {
  const expected = process.env.BLEX_INTERNAL_SECRET?.trim()
  if (!expected) {
    return Response.json({ error: 'BLEX_INTERNAL_SECRET tanımlı değil' }, { status: 404 })
  }
  if (request.headers.get('x-blex-internal-secret')?.trim() !== expected) {
    return Response.json({ error: 'yetkisiz' }, { status: 401 })
  }

  let body: { to?: string }
  try {
    body = (await request.json()) as { to?: string }
  } catch {
    return Response.json({ error: 'JSON body gerekli: { "to": "9055..." }' }, { status: 400 })
  }

  const to = body.to?.trim()
  if (!to) {
    return Response.json({ error: '"to" zorunlu' }, { status: 400 })
  }

  try {
    const r = await sendWhatsAppMessage(
      to,
      'Blex test — bu mesajı API test endpoint’inden gönderdik. Görüyorsan WhatsApp Cloud API çalışıyor.'
    )
    return Response.json({ ok: true, ...r })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return Response.json({ ok: false, error: msg })
  }
}
