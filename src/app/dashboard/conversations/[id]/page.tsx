import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ConversationSidebar from '@/components/ConversationSidebar'
import MessageThread, { type Message } from '@/components/MessageThread'
import type { Conversation } from '@/components/ConversationSidebar'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ConversationPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  // Fetch all conversations for sidebar
  const { data: conversations } = await supabase
    .from('conversations')
    .select('*')
    .order('updated_at', { ascending: false })

  // Fetch the active conversation
  const { data: conversation } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .single()

  if (!conversation) {
    notFound()
  }

  // Fetch messages for this conversation
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  return (
    <>
      <ConversationSidebar
        initialConversations={(conversations ?? []) as Conversation[]}
        activeId={id}
      />
      <MessageThread
        conversationId={id}
        phoneNumber={conversation.phone_number}
        initialMessages={(messages ?? []) as Message[]}
      />
    </>
  )
}
