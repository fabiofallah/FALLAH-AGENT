const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const AdmZip = require('adm-zip');
const { APP_ROOT, PATHS, ensureFoundationPaths, resolveAllowedPath, readHistory, writeHistory } = require('./foundationPaths');
const comparison = require('./comparisonService');
const backups = require('./backupManagerService');

function safeName(value) { return String(value || 'patch').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'patch'; }

async function createPatch(payload = {}) {
  await ensureFoundationPaths();
  const base = resolveAllowedPath(payload.basePath, { allowedRoots: [APP_ROOT, path.dirname(APP_ROOT)] });
  const target = resolveAllowedPath(payload.targetPath, { allowedRoots: [APP_ROOT, path.dirname(APP_ROOT)] });
  const diff = await comparison.compareFolders(base, target);const id = crypto.randomUUID();const date = new Date().toISOString();
  const metadata = { id, name: payload.name || 'Patch', version: payload.version || '1.0.0', date, description: payload.description || '', author: payload.author || 'FALLAH AGENT', added: diff.added, changed: diff.different.map((item) => item.path), removed: diff.removed };
  const zip = new AdmZip();
  for (const relative of [...metadata.added, ...metadata.changed]) zip.addLocalFile(path.join(target, relative), `files/${path.dirname(relative) === '.' ? '' : path.dirname(relative)}`);
  const contentHash = crypto.createHash('sha256').update(JSON.stringify(metadata)).digest('hex');metadata.hash = contentHash;
  zip.addFile('patch.json', Buffer.from(JSON.stringify(metadata, null, 2)));
  const fileName = `${safeName(metadata.name)}-${safeName(metadata.version)}.fallah-patch.zip`;const archivePath = path.join(PATHS.patches, fileName);zip.writeZip(archivePath);
  const history = await readHistory(PATHS.patchHistory);const record = { ...metadata, fileName, status: 'created' };history.unshift(record);await writeHistory(PATHS.patchHistory, history.slice(0, 500));
  return { ...record, archivePath, summary: diff.summary };
}

async function applyPatch({ patchFile, targetPath = APP_ROOT } = {}) {
  await ensureFoundationPaths();const target = resolveAllowedPath(targetPath, { allowedRoots: [APP_ROOT] });
  const archive = resolveAllowedPath(patchFile, { allowedRoots: [APP_ROOT, path.dirname(APP_ROOT)] });const zip = new AdmZip(archive);
  const manifestEntry = zip.getEntry('patch.json');if (!manifestEntry) throw new Error('Manifesto patch.json não encontrado.');
  const manifest = JSON.parse(manifestEntry.getData().toString('utf8'));const expected = manifest.hash;const clean = { ...manifest };delete clean.hash;
  const actual = crypto.createHash('sha256').update(JSON.stringify(clean)).digest('hex');if (expected !== actual) throw new Error('Hash do Patch inválido.');
  const safetyBackup = await backups.createBackup({ sourcePath: target, name: `pre-patch-${manifest.name}`, type: 'full' });
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory || entry.entryName === 'patch.json') continue;
    if (!entry.entryName.startsWith('files/')) throw new Error('Patch contém uma entrada não autorizada.');
    const relativeName = entry.entryName.slice(6);const destination = path.resolve(target, relativeName);const relative = path.relative(target, destination);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Patch contém caminho inseguro.');
    await fs.ensureDir(path.dirname(destination));await fs.writeFile(destination, entry.getData());
  }
  for (const relativeName of manifest.removed || []) { const destination = path.resolve(target, relativeName);const relative = path.relative(target, destination);if (!relative.startsWith('..') && !path.isAbsolute(relative)) await fs.remove(destination); }
  const history = await readHistory(PATHS.patchHistory);const application = { applicationId: crypto.randomUUID(), patchId: manifest.id, name: manifest.name, version: manifest.version, date: new Date().toISOString(), status: 'applied', targetPath: target, backupId: safetyBackup.id, added: manifest.added || [] };
  history.unshift(application);await writeHistory(PATHS.patchHistory, history.slice(0, 500));return application;
}

async function rollbackPatch(applicationId) {
  const history = await readHistory(PATHS.patchHistory);const record = history.find((item) => item.applicationId === applicationId && item.backupId);
  if (!record) throw new Error('Aplicação de Patch não encontrada.');
  const restored = await backups.restoreBackup(record.backupId, record.targetPath);
  for (const relativeName of record.added || []) { const destination = path.resolve(record.targetPath, relativeName);const relative = path.relative(record.targetPath, destination);if (!relative.startsWith('..') && !path.isAbsolute(relative)) await fs.remove(destination); }
  record.status = 'rolled-back';record.rolledBackAt = new Date().toISOString();await writeHistory(PATHS.patchHistory, history);return { record, restored };
}

async function history() { await ensureFoundationPaths();return readHistory(PATHS.patchHistory); }

module.exports = { createPatch, applyPatch, rollbackPatch, history };
