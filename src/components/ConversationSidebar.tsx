'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
export type Conversation = {
  id: string
  phone_number: string
  created_at: string
  updated_at: string
}

interface Props {
  initialConversations: Conversation[]
  activeId: string | null
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatPhone(phone: string) {
  // Show last 10 digits with country code prefix
  if (phone.length > 10) {
    return `+${phone.slice(0, phone.length - 10)} ${phone.slice(-10, -7)} ${phone.slice(-7, -4)} ${phone.slice(-4)}`
  }
  return phone
}

export default function ConversationSidebar({ initialConversations, activeId }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('conversations-sidebar')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations' },
        (payload) => {
          setConversations((prev) => [payload.new as Conversation, ...prev])
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        (payload) => {
          setConversations((prev) => {
            const updated = prev.map((c) =>
              c.id === (payload.new as Conversation).id ? (payload.new as Conversation) : c
            )
            // Re-sort by updated_at descending
            return [...updated].sort(
              (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            )
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <aside className="w-72 flex-shrink-0 bg-[#1a1a1a] border-r border-[#2e2e2e] flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-4 border-b border-[#2e2e2e]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#075e54] flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#25d366]">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Blex</h1>
            <p className="text-xs text-[#a1a1aa]">Dental AI Agent</p>
          </div>
        </div>
      </div>

      {/* Conversations Count */}
      <div className="px-4 py-2.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">
          Conversations
        </span>
        <span className="text-xs bg-[#242424] text-[#a1a1aa] px-2 py-0.5 rounded-full">
          {conversations.length}
        </span>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-[#555]">No conversations yet</p>
            <p className="text-xs text-[#444] mt-1">
              Messages will appear here when patients contact you on WhatsApp
            </p>
          </div>
        ) : (
          <ul>
            {conversations.map((conv) => {
              const isActive = conv.id === activeId
              return (
                <li key={conv.id}>
                  <Link
                    href={`/dashboard/conversations/${conv.id}`}
                    className={`flex items-center gap-3 px-4 py-3 border-b border-[#2e2e2e]/50 hover:bg-[#242424] transition-colors ${
                      isActive ? 'bg-[#242424] border-l-2 border-l-[#25d366]' : ''
                    }`}
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-[#075e54] flex items-center justify-center flex-shrink-0 text-sm font-semibold text-white">
                      {conv.phone_number.slice(-2)}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-medium text-white truncate">
                          {formatPhone(conv.phone_number)}
                        </span>
                        <span className="text-xs text-[#555] flex-shrink-0">
                          {formatTime(conv.updated_at)}
                        </span>
                      </div>
                      <p className="text-xs text-[#a1a1aa] mt-0.5">
                        WhatsApp conversation
                      </p>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#2e2e2e]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#25d366] animate-pulse" />
          <span className="text-xs text-[#a1a1aa]">Live updates active</span>
        </div>
      </div>
    </aside>
  )
}
