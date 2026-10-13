// Only independent fixture work belongs here, never the operations under test.
export async function fixtureTasks(tasks, limit = 4) {
  if (!Array.isArray(tasks) || tasks.some(task => typeof task !== 'function') || !Number.isInteger(limit) || limit < 1 || limit > 4) {
    throw new Error('Invalid fixture task batch.')
  }
  for (let offset = 0; offset < tasks.length; offset += limit) {
    const results = await Promise.allSettled(tasks.slice(offset, offset + limit).map(task => Promise.resolve().then(task)))
    const failures = results.filter(result => result.status === 'rejected').map(result => result.reason)
    if (failures.length) throw new AggregateError(failures, 'Fixture preparation failed; all started work has settled.')
  }
}
