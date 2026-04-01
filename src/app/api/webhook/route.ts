import { createAdminClient } from '@/lib/supabase/server'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { getAIResponse } from '@/lib/openai'

/** Vercel Hobby: en fazla ~10s; Pro’da 60’a kadar çıkar. Yavaş model + soğuk başlangıçta yanıt yetişmezse süreyi yükselt. */
export const maxDuration = 60

// GET /api/webhook — Meta webhook verification challenge
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('[webhook] Verification successful')
    return new Response(challenge, { status: 200 })
  }

  console.error('[webhook] Verification failed — token mismatch or wrong mode')
  return new Response('Forbidden', { status: 403 })
}

// POST /api/webhook — Receive incoming WhatsApp messages
export async function POST(request: Request) {
  console.log('[webhook] POST received')

  const body = await request.json()

  // Navigate Meta's nested payload structure
  const entry = body?.entry?.[0]
  const change = entry?.changes?.[0]
  const value = change?.value
  const message = value?.messages?.[0]

  // Ignore non-text events (status updates, delivery receipts, etc.)
  if (!message || message.type !== 'text') {
    console.log('[webhook] Ignoring non-text event')
    return Response.json({ status: 'ignored' })
  }

  const phoneNumber: string = message.from
  const messageText: string = message.text.body

  console.log(`[webhook] Message from ${phoneNumber}: ${messageText}`)

  const adminSupabase = createAdminClient()

  // 1. Upsert conversation — one row per phone number
  const { data: conv, error: convErr } = await adminSupabase
    .from('conversations')
    .upsert({ phone_number: phoneNumber }, { onConflict: 'phone_number' })
    .select()
    .single()

  if (convErr || !conv) {
    console.error('[webhook] conversations upsert error:', convErr)
    return Response.json({ error: 'db error' }, { status: 500 })
  }

  // 2. Fetch last 10 messages for conversational context
  const { data: historyRows, error: histErr } = await adminSupabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conv.id)
    .order('created_at', { ascending: false })
    .limit(10)

  if (histErr) {
    console.error('[webhook] history fetch error:', histErr)
  }

  const history = (historyRows ?? [])
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))
    .reverse()

  // 3. Store user message
  const { error: userMsgErr } = await adminSupabase
    .from('messages')
    .insert({ conversation_id: conv.id, role: 'user', content: messageText })

  if (userMsgErr) {
    console.error('[webhook] user message insert error:', userMsgErr)
  }

  // 4. Get AI response from OpenAI GPT-4
  let aiText = ''
  try {
    aiText = await getAIResponse(messageText, history)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const status =
      err && typeof err === 'object' && 'status' in err
        ? String((err as { status: unknown }).status)
        : ''
    console.error(
      '[webhook] OpenAI error:',
      msg,
      status ? `http=${status}` : '',
      err
    )
    aiText = "Thank you for reaching out! I'm experiencing a brief issue but will get back to you shortly."
  }

  // 5. Store AI response
  const { error: aiMsgErr } = await adminSupabase
    .from('messages')
    .insert({ conversation_id: conv.id, role: 'assistant', content: aiText })

  if (aiMsgErr) {
    console.error('[webhook] assistant message insert error:', aiMsgErr)
  }

  // 6. Send reply via WhatsApp Cloud API
  try {
    await sendWhatsAppMessage(phoneNumber, aiText)
  } catch (err) {
    console.error(
      '[webhook] WhatsApp send error:',
      err instanceof Error ? err.message : err
    )
  }

  return Response.json({ status: 'ok' })
}
