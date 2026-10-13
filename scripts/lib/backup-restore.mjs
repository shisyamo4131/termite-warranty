// Provider boundary for an offline rehearsal only. No Firebase SDK or I/O.
// A real provider requires a separately approved implementation and restore drill.
const resources = ['firestore', 'auth'];
const strategies = { firestore: 'managed-firestore-backup', auth: 'private-auth-export' };

export function createMockBackupRestoreProvider() {
  return {
    status() {
      return {
        capabilities: { realBackup: false, realRestore: false },
        // Adopted production plan, not observed configuration or backup availability.
        plannedPolicy: {
          firestore: { strategy: strategies.firestore, pitrDays: 7, schedule: 'daily', retentionDays: 30 },
          auth: { strategy: strategies.auth, schedule: 'weekly-and-after-important-changes', retentionDays: 30 },
        },
        availableBackups: [],
      };
    },
    backup(resource) {
      return { backup: mockBackupMetadata(resource) };
    },
    restore(backup) {
      return { rehearsal: true, backup, nextSteps: ['approve-real-provider', 'verify-target-and-permissions', 'perform-isolated-restore-drill'] };
    },
  };
}

export function mockBackupMetadata(resource) {
  validateResource(resource);
  return { formatVersion: 1, provider: 'mock', synthetic: true, resource, strategy: strategies[resource], id: `mock-${resource}-backup` };
}

function validateResource(resource) {
  if (!resources.includes(resource)) throw new Error('resource must be firestore or auth');
}

export function runBackupRestore(request) {
  if (!request || request.mode !== 'mock' || request.apply !== undefined) {
    throw new Error('Only explicit mode mock is supported; real/apply operations are unavailable');
  }
  const { operation, resource } = request;
  if (!['status', 'backup', 'restore'].includes(operation)) throw new Error('operation must be status, backup or restore');
  const provider = createMockBackupRestoreProvider();
  let details;
  if (operation === 'status') {
    if (resource !== undefined || request.backup !== undefined || request.rehearsal !== undefined) throw new Error('status accepts no resource or restore arguments');
    details = provider.status();
  } else {
    validateResource(resource);
    if (operation === 'backup') {
      if (request.backup !== undefined || request.rehearsal !== undefined) throw new Error('backup accepts no restore arguments');
      details = provider.backup(resource);
    } else {
      if (request.rehearsal !== true) throw new Error('restore requires explicit rehearsal');
      const backup = request.backup;
      const expected = mockBackupMetadata(resource);
      if (!backup || Object.keys(backup).length !== Object.keys(expected).length ||
          Object.entries(expected).some(([key, value]) => backup[key] !== value)) {
        throw new Error('restore requires compatible synthetic mock backup metadata for the same resource');
      }
      details = provider.restore({ ...backup });
    }
  }
  return {
    mode: 'mock', status: 'simulated', operation,
    operationPerformed: false, dataRead: false, dataWritten: false,
    message: 'Offline simulation only. No backup was created and no data was restored.',
    ...details,
  };
}
