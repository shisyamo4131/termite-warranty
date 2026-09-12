import {
  documentId,
  limit,
  orderBy,
  query,
  startAfter,
  type Query,
} from 'firebase/firestore'
import type { ListCursor, QueryDocument } from '../types/prototype-data.ts'

export const DEFAULT_LIST_LIMIT = 20
export const REFERENCE_QUERY_CHUNK_SIZE = 10

export const createBoundedListQuery = (reference: Query, cursor?: ListCursor) => {
  if (cursor && (!cursor.id || !cursor.updatedAt)) throw new Error('一覧カーソルが不正です。')
  return query(
    reference,
    orderBy('updatedAt', 'desc'),
    orderBy(documentId(), 'desc'),
    ...(cursor ? [startAfter(cursor.updatedAt, cursor.id)] : []),
    limit(DEFAULT_LIST_LIMIT),
  )
}

export const listCursorFromDocuments = (documents: QueryDocument[]): ListCursor | null => {
  if (documents.length < DEFAULT_LIST_LIMIT) return null
  const last = documents.at(-1)
  if (!last?.id || !last.data.updatedAt) throw new Error('一覧カーソルを作成できませんでした。')
  return { id: last.id, updatedAt: last.data.updatedAt }
}
