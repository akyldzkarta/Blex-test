'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
export type Message = {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

interface Props {
  conversationId: string
  phoneNumber: string
  initialMessages: Message[]
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function formatPhone(phone: string) {
  if (phone.length > 10) {
    return `+${phone.slice(0, phone.length - 10)} ${phone.slice(-10, -7)} ${phone.slice(-7, -4)} ${phone.slice(-4)}`
  }
  return phone
}

function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[72%] px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-[#075e54] text-white rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl'
            : 'bg-[#242424] text-[#f5f5f5] rounded-tl-sm rounded-tr-2xl rounded-bl-2xl rounded-br-2xl'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <p
          className={`text-[10px] mt-1 text-right ${
            isUser ? 'text-[#a7d9c0]' : 'text-[#666]'
          }`}
        >
          {formatTime(message.created_at)}
          {!isUser && (
            <span className="ml-1.5 text-[#25d366]">Blex</span>
          )}
        </p>
      </div>
    </div>
  )
}

export default function MessageThread({ conversationId, phoneNumber, initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Subscribe to new messages for this conversation
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#0f0f0f]">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[#2e2e2e] bg-[#1a1a1a]">
        <div className="w-9 h-9 rounded-full bg-[#075e54] flex items-center justify-center flex-shrink-0 text-sm font-semibold text-white">
          {phoneNumber.slice(-2)}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">
            {formatPhone(phoneNumber)}
          </h2>
          <p className="text-xs text-[#a1a1aa]">
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#25d366]" />
          <span className="text-xs text-[#a1a1aa]">Live</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-[#555]">No messages yet</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
          </>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
