import type { MasterFormDraft, MasterType, MasterWriteFields } from '../../src/domain/master-form.mjs'

interface MasterIdentifier {
  id: string
}

export function submitMasterCreate(options: {
  form: MasterFormDraft
  createMaster: (fields: MasterWriteFields) => Promise<MasterIdentifier>
  afterSuccess: (payload: { masterType: MasterType; id: string }) => void | Promise<void>
}): Promise<MasterIdentifier>

export function submitMasterUpdate(options: {
  id: string
  form: MasterFormDraft
  updateMaster: (id: string, fields: MasterWriteFields) => Promise<MasterIdentifier>
  afterSuccess: () => void | Promise<void>
}): Promise<MasterIdentifier>
