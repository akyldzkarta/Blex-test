/** Meta istemez: +, boşluk; genelde sadece ülke kodu + numara rakamları. */
function normalizeWhatsAppTo(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) {
    throw new Error('Geçersiz alıcı numarası (rakam yok)')
  }
  return digits
}

const GRAPH_VERSIONS = ['v21.0', 'v20.0', 'v19.0', 'v18.0'] as const

export type WhatsAppSendResult = {
  graphVersion: string
  messageId?: string
  raw: unknown
}

/**
 * Cloud API — meta bazen yeni sürümde 400 verir; birkaç vX.Y denenir.
 * İstersen: WHATSAPP_GRAPH_VERSION=v19.0 ile tek sürüm sabitle.
 */
export async function sendWhatsAppMessage(
  to: string,
  text: string
): Promise<WhatsAppSendResult> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim()

  if (!phoneNumberId || !accessToken) {
    throw new Error(
      'WHATSAPP_PHONE_NUMBER_ID veya WHATSAPP_ACCESS_TOKEN eksik (Vercel env kontrol edin).'
    )
  }

  const recipient = normalizeWhatsAppTo(to)
  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipient,
    type: 'text',
    text: {
      preview_url: false,
      body: text.slice(0, 4096),
    },
  }

  const pinned = process.env.WHATSAPP_GRAPH_VERSION?.trim()
  const versionsToTry = pinned
    ? [pinned, ...GRAPH_VERSIONS.filter((v) => v !== pinned)]
    : [...GRAPH_VERSIONS]

  let lastErr = ''
  for (const ver of versionsToTry) {
    const url = `https://graph.facebook.com/${ver}/${phoneNumberId}/messages`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const rawText = await res.text()
    let rawJson: unknown = rawText
    try {
      rawJson = JSON.parse(rawText) as Record<string, unknown>
    } catch {
      /* metin yanıt */
    }

    if (res.ok) {
      const j = rawJson as {
        messages?: Array<{ id?: string }>
      }
      const messageId = j.messages?.[0]?.id
      console.log('[whatsapp] gönderildi', { ver, messageId, to: recipient })
      return { graphVersion: ver, messageId, raw: rawJson }
    }

    const errObj = rawJson as { error?: { message?: string; code?: number } }
    const msg = errObj?.error?.message ?? rawText.slice(0, 500)
    lastErr = `${ver} → ${res.status}: ${msg}`
    console.warn('[whatsapp] deneme başarısız', lastErr)
  }

  throw new Error(`WhatsApp API (tüm sürümler): ${lastErr}`)
}
