const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const AdmZip = require('adm-zip');
const { APP_ROOT, resolveAllowedPath } = require('./foundationPaths');

const DEFAULT_IGNORES = new Set(['node_modules', '.git', 'temp', 'cache', 'dist', 'release', 'release-final', 'release-official', 'release-delivery', 'FALLAH_AGENT_V2_DESKTOP_FOUNDATION', 'ENTREGA_DESKTOP_FOUNDATION_V2']);

function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function hashFile(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    fs.createReadStream(file).on('data', (chunk) => hash.update(chunk)).on('error', reject).on('end', () => resolve(hash.digest('hex')));
  });
}

async function directoryIndex(root, options = {}) {
  const result = new Map();
  const ignores = new Set([...(options.ignores || DEFAULT_IGNORES)]);
  async function walk(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      if (ignores.has(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(root, absolute).replace(/\\/g, '/');
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) await walk(absolute).catch((error) => { if (error.code !== 'ENOENT') throw error; });
      else if (entry.isFile()) {
        try { const stat = await fs.stat(absolute);result.set(relative, { path: relative, size: stat.size, hash: await hashFile(absolute) }); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
      }
    }
  }
  await walk(root);
  return result;
}

function compareIndexes(left, right) {
  const equal = [];const different = [];const added = [];const removed = [];
  for (const [name, item] of left) {
    if (!right.has(name)) removed.push(name);
    else if (right.get(name).hash === item.hash) equal.push(name);
    else different.push({ path: name, left: item, right: right.get(name) });
  }
  for (const name of right.keys()) if (!left.has(name)) added.push(name);
  return { equal, different, added, removed, summary: { equal: equal.length, different: different.length, added: added.length, removed: removed.length } };
}

async function compareFolders(leftPath, rightPath) {
  const left = resolveAllowedPath(leftPath, { allowedRoots: [APP_ROOT, path.dirname(APP_ROOT)] });
  const right = resolveAllowedPath(rightPath, { allowedRoots: [APP_ROOT, path.dirname(APP_ROOT)] });
  if (!(await fs.stat(left)).isDirectory() || !(await fs.stat(right)).isDirectory()) throw new Error('A comparação de pastas exige dois diretórios.');
  return { type: 'folders', left, right, ...compareIndexes(await directoryIndex(left), await directoryIndex(right)) };
}

async function compareFiles(leftPath, rightPath) {
  const left = resolveAllowedPath(leftPath, { allowedRoots: [APP_ROOT, path.dirname(APP_ROOT)] });
  const right = resolveAllowedPath(rightPath, { allowedRoots: [APP_ROOT, path.dirname(APP_ROOT)] });
  const [leftStat, rightStat] = await Promise.all([fs.stat(left), fs.stat(right)]);
  if (!leftStat.isFile() || !rightStat.isFile()) throw new Error('A comparação exige dois arquivos.');
  const [leftHash, rightHash] = await Promise.all([hashFile(left), hashFile(right)]);
  return { type: 'files', left, right, equal: leftHash === rightHash, leftHash, rightHash, leftBytes: leftStat.size, rightBytes: rightStat.size };
}

function zipIndex(zipPath) {
  const zip = new AdmZip(zipPath);const result = new Map();
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const name = String(entry.entryName).replace(/\\/g, '/');
    const data = entry.getData();
    result.set(name, { path: name, size: data.length, hash: hashBuffer(data) });
  }
  return result;
}

async function compareZips(leftPath, rightPath) {
  const left = resolveAllowedPath(leftPath, { allowedRoots: [APP_ROOT, path.dirname(APP_ROOT)] });
  const right = resolveAllowedPath(rightPath, { allowedRoots: [APP_ROOT, path.dirname(APP_ROOT)] });
  if (path.extname(left).toLowerCase() !== '.zip' || path.extname(right).toLowerCase() !== '.zip') throw new Error('Selecione dois arquivos ZIP.');
  return { type: 'zips', left, right, ...compareIndexes(zipIndex(left), zipIndex(right)) };
}

module.exports = { hashFile, directoryIndex, compareIndexes, compareFolders, compareFiles, compareZips };
