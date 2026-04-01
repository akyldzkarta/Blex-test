export type Conversation = {
  id: string
  phone_number: string
  created_at: string
  updated_at: string
}

export type Message = {
  id: string
  conversation_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      conversations: {
        Row: {
          id: string
          phone_number: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string | null
          phone_number: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string | null
          phone_number?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          role: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string | null
          conversation_id: string
          role: string
          content: string
          created_at?: string | null
        }
        Update: {
          id?: string | null
          conversation_id?: string | null
          role?: string | null
          content?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
