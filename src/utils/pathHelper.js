const path = require('path');

function resolveWorkspacePath(workspaceRoot, requestedPath = '') {
  const normalizedWorkspace = path.resolve(workspaceRoot);
  const target = path.resolve(normalizedWorkspace, requestedPath || '.');
  const relative = path.relative(normalizedWorkspace, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Requested path is outside the workspace.');
  }
  return target;
}

module.exports = { resolveWorkspacePath };
