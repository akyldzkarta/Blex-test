/** Meta istemez: +, boşluk; genelde sadece ülke kodu + numara rakamları. */
function normalizeWhatsAppTo(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) {
    throw new Error('Geçersiz alıcı numarası (rakam yok)')
  }
  return digits
}

export async function sendWhatsAppMessage(
  to: string,
  text: string
): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim()

  if (!phoneNumberId || !accessToken) {
    throw new Error(
      'WHATSAPP_PHONE_NUMBER_ID veya WHATSAPP_ACCESS_TOKEN eksik (Vercel env kontrol edin).'
    )
  }

  const recipient = normalizeWhatsAppTo(to)
  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`

  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipient,
    type: 'text',
    text: { preview_url: false, body: text },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errBody = await res.text()
    console.error('[whatsapp] Graph API', res.status, errBody)
    throw new Error(`WhatsApp API error ${res.status}: ${errBody}`)
  }
}
