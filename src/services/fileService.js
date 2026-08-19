const fs = require('fs-extra');
const path = require('path');
const { resolveWorkspacePath } = require('./pathHelper');
const MAX_EDITOR_FILE_BYTES = Number(process.env.FALLAH_EDITOR_MAX_BYTES || 10 * 1024 * 1024);

async function readFile(requestedPath) {
  const workspaceRoot = path.resolve(__dirname, '..', '..');
  const absolutePath = resolveWorkspacePath(workspaceRoot, requestedPath);
  await fs.access(absolutePath);
  const stats = await fs.stat(absolutePath);
  if (stats.size > MAX_EDITOR_FILE_BYTES) throw new Error(`Arquivo excede o limite do Editor (${Math.round(MAX_EDITOR_FILE_BYTES / 1048576)} MB).`);
  return fs.readFile(absolutePath, 'utf8');
}

async function writeFile(requestedPath, content) {
  const workspaceRoot = path.resolve(__dirname, '..', '..');
  const absolutePath = resolveWorkspacePath(workspaceRoot, requestedPath);
  if (Buffer.byteLength(String(content || ''), 'utf8') > MAX_EDITOR_FILE_BYTES) throw new Error(`Conteúdo excede o limite do Editor (${Math.round(MAX_EDITOR_FILE_BYTES / 1048576)} MB).`);
  await fs.outputFile(absolutePath, content, 'utf8');
}

module.exports = {
  readFile,
  writeFile,
};
