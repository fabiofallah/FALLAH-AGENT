const fs = require('fs-extra');
const path = require('path');
const { resolveWorkspacePath } = require('./pathHelper');

const IGNORED_NAMES = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', 'tmp', 'cache']);

function shouldIgnore(entryName, includeSystemFiles) {
  return !includeSystemFiles && IGNORED_NAMES.has(String(entryName || '').toLowerCase());
}

function validateNodeName(name) {
  const value = String(name || '').trim();
  if (!value || value === '.' || value === '..' || path.basename(value) !== value || /[\\/]/.test(value)) {
    throw new Error('Nome de arquivo ou pasta inválido.');
  }
  return value;
}

function requireNonRootPath(workspaceRoot, requestedPath) {
  const target = resolveWorkspacePath(workspaceRoot, requestedPath);
  if (target === path.resolve(workspaceRoot)) throw new Error('A raiz do projeto não pode ser alterada ou excluída.');
  return target;
}

async function readEntryMeta(absolutePath, relativePath, name, type) {
  const stats = await fs.stat(absolutePath);
  const permissions = `0${(stats.mode & 0o777).toString(8)}`;
  const owner = process.env.USERNAME || process.env.USER || 'desconhecido';
  let hasChildren = false;
  let childFileCount = 0;
  let childDirectoryCount = 0;
  if (type === 'directory') {
    try {
      const children = await fs.readdir(absolutePath, { withFileTypes: true });
      hasChildren = children.length > 0;
      childDirectoryCount = children.filter((entry) => entry.isDirectory()).length;
      childFileCount = children.filter((entry) => entry.isFile()).length;
    } catch (error) {
      hasChildren = false;
    }
  }
  return {
    name,
    path: relativePath,
    type,
    size: type === 'file' ? stats.size : 0,
    createdAt: stats.birthtime.toISOString(),
    modifiedAt: stats.mtime.toISOString(),
    permissions,
    owner,
    hasChildren,
    childFileCount,
    childDirectoryCount,
  };
}

async function listDirectory(requestedPath = '', includeSystemFiles = false) {
  const workspaceRoot = path.resolve(__dirname, '..', '..');
  const folder = resolveWorkspacePath(workspaceRoot, requestedPath);
  const folderStats = await fs.stat(folder);
  const entries = await fs.readdir(folder, { withFileTypes: true });

  const listing = [];
  for (const entry of entries) {
    if (shouldIgnore(entry.name, includeSystemFiles)) {
      continue;
    }
    const relativePath = path.join(requestedPath, entry.name).replace(/\\/g, '/');
    const absolutePath = resolveWorkspacePath(workspaceRoot, relativePath);
    const type = entry.isDirectory() ? 'directory' : 'file';
    const meta = await readEntryMeta(absolutePath, relativePath, entry.name, type);
    listing.push(meta);
  }

  listing.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const baseName = requestedPath ? path.basename(requestedPath) : 'Workspace';
  const directory = {
    name: baseName,
    path: requestedPath || '',
    type: 'directory',
    size: 0,
    createdAt: folderStats.birthtime.toISOString(),
    modifiedAt: folderStats.mtime.toISOString(),
    permissions: `0${(folderStats.mode & 0o777).toString(8)}`,
    owner: process.env.USERNAME || process.env.USER || 'desconhecido',
    totalItems: listing.length,
    totalFiles: listing.filter((item) => item.type === 'file').length,
    totalDirectories: listing.filter((item) => item.type === 'directory').length,
  };

  return { directory, listing };
}

async function workspaceTree(requestedPath = '', includeSystemFiles = false) {
  const workspaceRoot = path.resolve(__dirname, '..', '..');
  const folder = resolveWorkspacePath(workspaceRoot, requestedPath || '');
  const entries = await fs.readdir(folder, { withFileTypes: true });
  const tree = [];

  for (const entry of entries) {
    if (shouldIgnore(entry.name, includeSystemFiles)) {
      continue;
    }
    const relativePath = path.join(requestedPath || '', entry.name).replace(/\\/g, '/');
    const absolutePath = resolveWorkspacePath(workspaceRoot, relativePath);
    const type = entry.isDirectory() ? 'directory' : 'file';
    const meta = await readEntryMeta(absolutePath, relativePath, entry.name, type);
    tree.push(meta);
  }

  tree.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return tree;
}

async function createNode(type, basePath, name) {
  const workspaceRoot = path.resolve(__dirname, '..', '..');
  const parent = resolveWorkspacePath(workspaceRoot, basePath || '');
  const safeName = validateNodeName(name);
  const targetPath = resolveWorkspacePath(workspaceRoot, path.relative(workspaceRoot, path.join(parent, safeName)));
  if (type === 'folder') {
    await fs.ensureDir(targetPath);
  } else {
    await fs.ensureFile(targetPath);
  }
}

async function renamePath(targetPath, newName) {
  const workspaceRoot = path.resolve(__dirname, '..', '..');
  const source = requireNonRootPath(workspaceRoot, targetPath);
  const destination = resolveWorkspacePath(workspaceRoot, path.join(path.dirname(targetPath), validateNodeName(newName)));
  await fs.move(source, destination, { overwrite: false });
}

async function deletePath(targetPath) {
  const workspaceRoot = path.resolve(__dirname, '..', '..');
  const target = requireNonRootPath(workspaceRoot, targetPath);
  await fs.remove(target);
}

async function pasteNode(item, destinationPath) {
  const workspaceRoot = path.resolve(__dirname, '..', '..');
  if (!item || !item.path || !item.type) {
    throw new Error('Item inválido para colar.');
  }
  const destinationFolder = resolveWorkspacePath(workspaceRoot, destinationPath || '');
  const source = requireNonRootPath(workspaceRoot, item.path);
  const baseName = path.basename(item.path);
  const parsed = path.parse(baseName);
  let candidateName = baseName;
  let idx = 1;
  let target = path.join(destinationFolder, candidateName);

  while (await fs.pathExists(target)) {
    candidateName = item.type === 'directory'
      ? `${parsed.name}-copy${idx}`
      : `${parsed.name}-copy${idx}${parsed.ext}`;
    target = path.join(destinationFolder, candidateName);
    idx += 1;
  }

  if (item.action === 'move') {
    await fs.move(source, target, { overwrite: false });
    return;
  }
  await fs.copy(source, target, { overwrite: false, errorOnExist: true });
}

async function duplicatePath(targetPath) {
  const workspaceRoot = path.resolve(__dirname, '..', '..');
  const source = requireNonRootPath(workspaceRoot, targetPath);
  const parsed = path.parse(targetPath);
  let copyName = `${parsed.name}-copy${parsed.ext}`;
  let destination = resolveWorkspacePath(workspaceRoot, path.join(parsed.dir, copyName));
  let idx = 1;
  while (await fs.pathExists(destination)) {
    copyName = `${parsed.name}-copy${idx}${parsed.ext}`;
    destination = resolveWorkspacePath(workspaceRoot, path.join(parsed.dir, copyName));
    idx += 1;
  }
  await fs.copy(source, destination);
}

module.exports = {
  listDirectory,
  workspaceTree,
  createNode,
  renamePath,
  deletePath,
  pasteNode,
  duplicatePath,
};
