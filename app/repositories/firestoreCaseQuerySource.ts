import { collection, doc, onSnapshot, type Firestore } from 'firebase/firestore'
import type { MasterCollection, QueryDocument } from '../types/prototype-data.ts'
import { documentsFromSnapshot } from './masterCatalogRepository.ts'

type Unsubscribe = () => void
type DocumentsCallback = (documents: QueryDocument[]) => void
type DocumentCallback = (document: QueryDocument | null) => void
type ErrorCallback = (error: unknown) => void

export interface CaseQuerySource {
  subscribeMaster(name: MasterCollection, onDocuments: DocumentsCallback, onError: ErrorCallback): Unsubscribe
  subscribeCases(onDocuments: DocumentsCallback, onError: ErrorCallback): Unsubscribe
  subscribeCase(caseId: string, onDocument: DocumentCallback, onError: ErrorCallback): Unsubscribe
  subscribeWarranties(caseId: string, onDocuments: DocumentsCallback, onError: ErrorCallback): Unsubscribe
}

export const createFirestoreCaseQuerySource = (firestore: Firestore): CaseQuerySource => ({
  subscribeMaster(name, onDocuments, onError) {
    return onSnapshot(
      collection(firestore, name),
      snapshot => onDocuments(documentsFromSnapshot(snapshot.docs)),
      onError,
    )
  },
  subscribeCases(onDocuments, onError) {
    return onSnapshot(
      collection(firestore, 'cases'),
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
