const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const archiverModule = require('archiver');
const AdmZip = require('adm-zip');
const { APP_ROOT, PATHS, ensureFoundationPaths, resolveAllowedPath, readHistory, writeHistory } = require('./foundationPaths');

function safeName(value) { return String(value || 'backup').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'backup'; }
const createArchiver = typeof archiverModule === 'function'
  ? (format, options) => archiverModule(format, options)
  : (format, options) => new archiverModule.ZipArchive(options);

async function createBackup({ sourcePath = APP_ROOT, name = 'backup', type = 'full' } = {}) {
  await ensureFoundationPaths();
  const source = resolveAllowedPath(sourcePath, { allowedRoots: [APP_ROOT] });
  const id = crypto.randomUUID();const createdAt = new Date().toISOString();
  const fileName = `${safeName(name)}-${createdAt.replace(/[:.]/g, '-')}.zip`;
  const destination = path.join(PATHS.backups, fileName);
  const history = await readHistory(PATHS.backupHistory);
  const previous = type === 'incremental' ? history.find((item) => item.sourcePath === source && item.status === 'ready') : null;
  const since = previous ? new Date(previous.createdAt).getTime() : 0;
  const output = fs.createWriteStream(destination);const zip = createArchiver('zip', { zlib: { level: 9 } });
  const included = [];
  const completion = new Promise((resolve, reject) => { output.on('close', resolve);output.on('error', reject);zip.on('error', reject); });
  zip.pipe(output);
  async function walk(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      if (['node_modules', '.git', 'temp', 'cache', 'backups'].includes(entry.name)) continue;
      const absolute = path.join(directory, entry.name);const relative = path.relative(source, absolute).replace(/\\/g, '/');
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile()) { const stat = await fs.stat(absolute);if (!since || stat.mtimeMs > since) { zip.file(absolute, { name: relative });included.push(relative); } }
    }
  }
  await walk(source);
  zip.append(JSON.stringify({ id, name, type, sourcePath: source, createdAt, baseBackupId: previous?.id || null, files: included }, null, 2), { name: '.fallah-backup.json' });
  await zip.finalize();await completion;
  const stat = await fs.stat(destination);const record = { id, name, type, createdAt, sourcePath: source, fileName, bytes: stat.size, files: included.length, baseBackupId: previous?.id || null, status: 'ready' };
  history.unshift(record);await writeHistory(PATHS.backupHistory, history.slice(0, 500));return { ...record, archivePath: destination };
}

async function listBackups() { await ensureFoundationPaths();return readHistory(PATHS.backupHistory); }

async function deleteBackup(id) {
  const history = await readHistory(PATHS.backupHistory);const record = history.find((item) => item.id === id);
  if (!record) throw new Error('Backup não encontrado.');
  await fs.remove(path.join(PATHS.backups, path.basename(record.fileName)));
  await writeHistory(PATHS.backupHistory, history.filter((item) => item.id !== id));return record;
}

async function restoreBackup(id, targetPath = APP_ROOT) {
  const history = await readHistory(PATHS.backupHistory);const record = history.find((item) => item.id === id);
  if (!record) throw new Error('Backup não encontrado.');
  const target = resolveAllowedPath(targetPath, { allowedRoots: [APP_ROOT] });
  const archivePath = path.join(PATHS.backups, path.basename(record.fileName));
  if (!(await fs.pathExists(archivePath))) throw new Error('Arquivo físico do backup não foi encontrado.');
  const safety = await createBackup({ sourcePath: target, name: `pre-restore-${record.name}`, type: 'full' });
  const zip = new AdmZip(archivePath);
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory || entry.entryName === '.fallah-backup.json') continue;
    const destination = path.resolve(target, entry.entryName);const relative = path.relative(target, destination);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Backup contém caminho inseguro.');
    await fs.ensureDir(path.dirname(destination));await fs.writeFile(destination, entry.getData());
  }
  return { restored: record, safetyBackup: safety };
}

module.exports = { createBackup, listBackups, deleteBackup, restoreBackup };
