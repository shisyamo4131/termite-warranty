import {createHash} from 'node:crypto'
import {groupWarrantyLimit} from '../../src/domain/group-warranty-limit.mjs'

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
export function planGroupWarrantyLimits({groups, companies, properties}, assignments) {
  const byId = new Map(groups.map(g => [g.id,g]))
  const updates = []
  for (const assignment of assignments) {
    const group = byId.get(assignment.id)
    if (!group || group.name !== assignment.name || group.prefix !== assignment.prefix || group.fiscalStartMonth !== assignment.fiscalStartMonth) throw Error('GROUP_IDENTITY_MISMATCH')
    const limit = groupWarrantyLimit(assignment)
    if (group.maxWarrantyYears !== undefined && group.maxWarrantyYears !== limit) throw Error('EXISTING_LIMIT_CONFLICT')
    if (group.maxWarrantyYears === undefined) updates.push({id:group.id,maxWarrantyYears:limit})
    byId.set(group.id,{...group,maxWarrantyYears:limit})
  }
  for (const group of byId.values()) groupWarrantyLimit(group)
  return {updates,groups:groups.length,properties:properties.length,
    beforeDigest:digest({groups,companies,properties}),propertiesDigest:digest(properties)}
}

export async function supplementGroupWarrantyLimits(db, assignments, {expectedDigest, apply=false,requireNormal=false}={}) {
  return db.runTransaction(async tx => {
    if(requireNormal){
      const access=(await tx.get(db.doc('_recovery/access'))).data()
      if(access?.phase!=='normal' || access?.databaseId!=='(default)' || access?.controlDatabaseId!=='recovery-control')throw Error('NORMAL_RUNTIME_REQUIRED')
    }
    const image={}
    for (const [key,collection] of [['groups','warrantyGroups'],['companies','constructionCompanies'],['properties','propertyWarranties']]) {
      image[key]=(await tx.get(db.collection(collection))).docs.map(d=>({...d.data(),id:d.id})).sort((a,b)=>a.id.localeCompare(b.id))
    }
    const plan=planGroupWarrantyLimits(image,assignments)
    if (apply) {
      if (!expectedDigest || expectedDigest!==plan.beforeDigest) throw Error('MIGRATION_INPUT_CHANGED')
      for (const update of plan.updates) tx.update(db.doc('warrantyGroups/'+update.id),{maxWarrantyYears:update.maxWarrantyYears})
    }
    return plan
  })
}
