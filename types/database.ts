export type Document = {
  id: string
  user_id: string
  title: string
  slug: string | null
  is_public: boolean
  created_at: string
  updated_at: string
}

export type DocumentInsert = Omit<Document, 'id' | 'created_at' | 'updated_at'>
export type DocumentUpdate = Partial<Omit<Document, 'id' | 'user_id' | 'created_at'>>
