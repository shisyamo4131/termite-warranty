import { createMeasuredFirestore } from '../utils/firestoreMetrics.ts'
const { onSnapshot } = createMeasuredFirestore('caseQuery')
import { collection, doc, documentId, query, where, type Firestore } from 'firebase/firestore'
import type { ListCursor, MasterCollection, QueryDocument } from '../types/prototype-data.ts'
import { createBoundedListQuery, REFERENCE_QUERY_CHUNK_SIZE } from './boundedListQuery.ts'
import { documentsFromSnapshot } from './masterCatalogRepository.ts'

type Unsubscribe = () => void
type DocumentsCallback = (documents: QueryDocument[]) => void
type DocumentCallback = (document: QueryDocument | null) => void
type ErrorCallback = (error: unknown) => void

export interface CaseQuerySource {
  subscribeMaster(name: MasterCollection, onDocuments: DocumentsCallback, onError: ErrorCallback, cursor?: ListCursor, complete?: boolean): Unsubscribe
  subscribeMastersByIds(name: MasterCollection, ids: string[], onDocuments: DocumentsCallback, onError: ErrorCallback): Unsubscribe
  subscribeCases(onDocuments: DocumentsCallback, onError: ErrorCallback, cursor?: ListCursor, complete?: boolean): Unsubscribe
  subscribeCase(caseId: string, onDocument: DocumentCallback, onError: ErrorCallback): Unsubscribe
  subscribeWarranties(caseId: string, onDocuments: DocumentsCallback, onError: ErrorCallback): Unsubscribe
}

export const createFirestoreCaseQuerySource = (firestore: Firestore): CaseQuerySource => ({
  subscribeMaster(name, onDocuments, onError, cursor, complete = false) {
    if (complete) throw new Error('旧一覧の全件取得は利用できません。')
    const masterQuery = createBoundedListQuery(collection(firestore, name), cursor)
    return onSnapshot(
      masterQuery,
      snapshot => onDocuments(documentsFromSnapshot(snapshot.docs)),
      onError,
    )
  },
  subscribeMastersByIds(name, ids, onDocuments, onError) {
    const uniqueIds = [...new Set(ids)]
    if (uniqueIds.length === 0) {
      onDocuments([])
      return () => {}
    }
    if (uniqueIds.length > REFERENCE_QUERY_CHUNK_SIZE) throw new Error('参照マスターの取得件数が上限を超えています。')
    return onSnapshot(
      query(collection(firestore, name), where(documentId(), 'in', uniqueIds)),
      snapshot => onDocuments(documentsFromSnapshot(snapshot.docs)),
      onError,
    )
  },
  subscribeCases(onDocuments, onError, cursor, complete = false) {
    if (complete) throw new Error('旧一覧の全件取得は利用できません。')
    return onSnapshot(
      createBoundedListQuery(collection(firestore, 'cases'), cursor),
      snapshot => onDocuments(documentsFromSnapshot(snapshot.docs)),
      onError,
    )
  },
  subscribeCase(caseId, onDocument, onError) {
    return onSnapshot(
      doc(firestore, 'cases', caseId),
      snapshot => onDocument(snapshot.exists()
        ? { id: snapshot.id, data: snapshot.data() as Record<string, unknown> }
        : null),
      onError,
    )
  },
  subscribeWarranties(caseId, onDocuments, onError) {
    return onSnapshot(
      collection(firestore, 'cases', caseId, 'appliedWarranties'),
      snapshot => onDocuments(documentsFromSnapshot(snapshot.docs)),
      onError,
    )
  },
})
