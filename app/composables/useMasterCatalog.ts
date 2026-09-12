import {
  createFirestoreMasterCatalogSource,
  emptyMasterCatalog,
  loadAllMasterCatalog,
  selectActiveMasters,
} from '../repositories/masterCatalogRepository.ts'

export const useMasterCatalog = () => {
  const { $firebase } = useNuxtApp()
  const source = createFirestoreMasterCatalogSource($firebase.firestore)
  return {
    activeMasters: selectActiveMasters,
    emptyMasterCatalog,
    loadAllMasters: () => loadAllMasterCatalog(source),
  }
}
