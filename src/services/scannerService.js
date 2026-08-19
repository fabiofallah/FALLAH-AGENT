const fs = require('fs-extra');
const path = require('path');

const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..');
const IGNORE_NAMES = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', 'temp']);
const IGNORE_PREFIXES = ['PATCH_', 'backups'];
const MAX_INDEX_FILE_BYTES = Number(process.env.FALLAH_SCANNER_MAX_FILE_BYTES || 2 * 1024 * 1024);

const scanState = {
  status: 'idle',
  progress: 0,
  stats: { folders: 0, files: 0, size: 0 },
  technologies: [],
  summary: {},
  tree: [],
  index: [],
  error: null,
  startedAt: null,
  finishedAt: null,
};

let scanPromise = null;
let cancelRequested = false;

function throwIfCancelled() {
  if (cancelRequested) {
    throw new Error('Varredura cancelada.');
  }
}

function resetScanState() {
  cancelRequested = false;
  scanState.status = 'scanning';
  scanState.progress = 0;
  scanState.stats = { folders: 0, files: 0, size: 0 };
  scanState.technologies = [];
  scanState.summary = {};
  scanState.tree = [];
  scanState.index = [];
  scanState.error = null;
  scanState.startedAt = new Date().toISOString();
  scanState.finishedAt = null;
}

function normalizeRelativePath(relativePath) {
  return relativePath.replace(/\\/g, '/');
}

function getPackageManager() {
  if (fs.existsSync(path.join(WORKSPACE_ROOT, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(WORKSPACE_ROOT, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(WORKSPACE_ROOT, 'bun.lockb'))) return 'bun';
  if (fs.existsSync(path.join(WORKSPACE_ROOT, 'package-lock.json'))) return 'npm';
  return 'npm';
}

function detectTechnologies(technologySet, packageJson, fileCounts) {
  const technologies = new Set();
  if (technologySet.has('node')) technologies.add('Node.js');
  if (fileCounts.javascript) technologies.add('JavaScript');
  if (fileCounts.typescript) technologies.add('TypeScript');
  if (fileCounts.html) technologies.add('HTML');
  if (fileCounts.css) technologies.add('CSS');
  if (fileCounts.json) technologies.add('JSON');
  if (fileCounts.markdown) technologies.add('Markdown');
  if (fileCounts.python) technologies.add('Python');
  if (technologySet.has('electron')) technologies.add('Electron');
  if (technologySet.has('express')) technologies.add('Express');
  if (technologySet.has('react')) technologies.add('React');
  if (technologySet.has('vue')) technologies.add('Vue');
  if (technologySet.has('git')) technologies.add('Git');
  if (technologySet.has('docker')) technologies.add('Docker');
  return Array.from(technologies);
}

function analyzeFileContent(content, extension, filePath) {
  const imports = [];
  const exports = [];
  const functions = [];
  const classes = [];
  const interfaces = [];
  const routes = [];
  const components = [];

  const importRegex = /(?:import\s+(?:[^'"\n]+?\s+from\s+)?['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g;
  const exportRegex = /(?:\bexport\s+(?:default\s+)?(?:const|let|var|function|class|interface|type)|module\.exports|exports\.)/g;
  const functionRegex = /(?:function\s+([A-Za-z_\$][A-Za-z0-9_\$]*)\s*\(|const\s+([A-Z][A-Za-z0-9_\$]*)\s*=\s*\(?[^\n]*\)?\s*=>|let\s+([A-Z][A-Za-z0-9_\$]*)\s*=\s*\(?[^\n]*\)?\s*=>)/g;
  const classRegex = /class\s+([A-Za-z_\$][A-Za-z0-9_\$]*)/g;
  const interfaceRegex = /interface\s+([A-Za-z_\$][A-Za-z0-9_\$]*)/g;
  const routeRegex = /\b(?:app|router)\.(get|post|put|delete|patch|all|use)\s*\(/g;
  const apiRegex = /\bfetch\s*\(|axios\.(get|post|put|delete|patch)/g;
  const componentRegex = /(?:function\s+([A-Z][A-Za-z0-9_\$]*)\s*\(|const\s+([A-Z][A-Za-z0-9_\$]*)\s*=\s*\(?[^\n]*\)?\s*=>\s*\{)/g;

  let match;
  while ((match = importRegex.exec(content))) {
    const source = match[1] || match[2];
    if (source) imports.push(source);
  }
  while ((match = exportRegex.exec(content))) {
    exports.push(match[0]);
  }
  while ((match = functionRegex.exec(content))) {
    const name = match[1] || match[2] || match[3];
    if (name) functions.push(name);
  }
  while ((match = classRegex.exec(content))) {
    classes.push(match[1]);
  }
  while ((match = interfaceRegex.exec(content))) {
    interfaces.push(match[1]);
  }
  while ((match = routeRegex.exec(content))) {
    routes.push(match[0]);
  }
  while ((match = apiRegex.exec(content))) {
    routes.push(match[0]);
  }
  while ((match = componentRegex.exec(content))) {
    const name = match[1] || match[2];
    if (name) components.push(name);
  }

  return { imports, exports, functions, classes, interfaces, routes, components };
}

function hasModuleImport(content, moduleName) {
  const escaped = String(moduleName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const requirePattern = new RegExp(`^\\s*(?:const|let|var)\\s+[^\\n=]+?=\\s*require\\(['"]${escaped}['"]\\)`, 'm');
  const importPattern = new RegExp(`^\\s*import(?:\\s+[^\\n]+?\\s+from)?\\s*['"]${escaped}['"]`, 'm');
  return requirePattern.test(content) || importPattern.test(content);
}

function buildSummary(packageJson, fileCounts, technologySet, detectedFrameworks, tree) {
  const scripts = (packageJson && packageJson.scripts) || {};
  const entryPoints = [];
  if (packageJson?.main) entryPoints.push(packageJson.main);
  if (scripts.start) entryPoints.push('npm start');
  if (scripts.build) entryPoints.push('npm run build');
  if (fs.existsSync(path.join(WORKSPACE_ROOT, 'src', 'index.js'))) entryPoints.push('src/index.js');
  if (fs.existsSync(path.join(WORKSPACE_ROOT, 'src', 'main.ts'))) entryPoints.push('src/main.ts');
  if (fs.existsSync(path.join(WORKSPACE_ROOT, 'public', 'index.html'))) entryPoints.push('public/index.html');
  if (tree.length === 0 && packageJson?.name) entryPoints.push(packageJson.name);

  const buildScripts = {};
  ['build', 'start', 'dev', 'test'].forEach((script) => {
    if (scripts[script]) buildScripts[script] = scripts[script];
  });

  return {
    projectName: (packageJson && packageJson.name) || path.basename(WORKSPACE_ROOT),
    technologies: detectTechnologies(technologySet, packageJson, fileCounts),
    frameworks: Array.from(detectedFrameworks),
    packageManager: getPackageManager(),
    entryPoints: Array.from(new Set(entryPoints)),
    buildScripts,
    totalFiles: fileCounts.files,
    totalFolders: fileCounts.folders,
    statistics: {
      files: fileCounts.files,
      folders: fileCounts.folders,
      totalBytes: fileCounts.size,
      indexedFiles: scanState.index.length,
    },
  };
}

async function loadPackageJson() {
  const packagePath = path.join(WORKSPACE_ROOT, 'package.json');
  if (await fs.pathExists(packagePath)) {
    return fs.readJson(packagePath);
  }
  return null;
}

function isIgnoredName(name) {
  return IGNORE_NAMES.has(name) || IGNORE_PREFIXES.some((prefix) => String(name).toLowerCase().startsWith(prefix.toLowerCase()));
}

function updateProgress(processed, total) {
  if (!total || total <= 0) return;
  scanState.progress = Math.min(99, Math.floor((processed / total) * 100));
}

async function countWorkspaceItems(directory) {
  throwIfCancelled();
  let total = 0;
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    throwIfCancelled();
    if (isIgnoredName(entry.name)) continue;
    total += 1;
    if (entry.isDirectory()) {
      total += await countWorkspaceItems(path.join(directory, entry.name));
    }
  }
  return total;
}

async function scanDirectory(directory, relativePath, fileCounts, technologySet, detectedFrameworks, totalItems, processed) {
  throwIfCancelled();
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const tree = [];

  for (const entry of entries) {
    throwIfCancelled();
    if (isIgnoredName(entry.name)) continue;
    const entryRelPath = normalizeRelativePath(path.join(relativePath, entry.name));
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      fileCounts.folders += 1;
      processed.count += 1;
      updateProgress(processed.count, totalItems);
      const children = await scanDirectory(entryPath, entryRelPath, fileCounts, technologySet, detectedFrameworks, totalItems, processed);
      tree.push({ name: entry.name, path: entryRelPath, type: 'folder', children });
    } else {
      const stats = await fs.stat(entryPath);
      fileCounts.files += 1;
      fileCounts.size += stats.size;
      processed.count += 1;
      updateProgress(processed.count, totalItems);
      const extension = path.extname(entry.name).toLowerCase();
      if (extension === '.js' || extension === '.jsx') fileCounts.javascript = true;
      if (extension === '.ts' || extension === '.tsx') fileCounts.typescript = true;
      if (extension === '.html') fileCounts.html = true;
      if (extension === '.css') fileCounts.css = true;
      if (extension === '.json') fileCounts.json = true;
      if (extension === '.md' || extension === '.markdown') fileCounts.markdown = true;
      if (extension === '.py') fileCounts.python = true;

      const fileEntry = { name: entry.name, path: entryRelPath, type: 'file', size: stats.size };
      tree.push(fileEntry);

      const content = stats.size <= MAX_INDEX_FILE_BYTES ? await fs.readFile(entryPath, 'utf8').catch(() => '') : '';
      if (extension === '.js' || extension === '.jsx' || extension === '.ts' || extension === '.tsx' || extension === '.py' || extension === '.html' || extension === '.css' || extension === '.json' || extension === '.md' || extension === '.markdown') {
        const codeIndex = analyzeFileContent(content, extension, entryRelPath);
        if (codeIndex.imports.length || codeIndex.exports.length || codeIndex.functions.length || codeIndex.classes.length || codeIndex.interfaces.length || codeIndex.routes.length || codeIndex.components.length) {
          scanState.index.push({ path: entryRelPath, ...codeIndex });
        }
      }

      if (hasModuleImport(content, 'react')) {
        detectedFrameworks.add('React');
        technologySet.add('react');
      }
      if (hasModuleImport(content, 'vue')) {
        detectedFrameworks.add('Vue');
        technologySet.add('vue');
      }
      if (hasModuleImport(content, 'electron')) {
        technologySet.add('electron');
      }
      if (hasModuleImport(content, 'express')) {
        detectedFrameworks.add('Express');
        technologySet.add('express');
      }
    }
  }

  tree.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return tree;
}

async function scanWorkspace() {
  const packageJson = await loadPackageJson();
  const technologySet = new Set();
  const detectedFrameworks = new Set();
  const fileCounts = { javascript: false, typescript: false, html: false, css: false, json: false, markdown: false, python: false, files: 0, folders: 0, size: 0 };

  if (packageJson) {
    technologySet.add('node');
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    Object.keys(deps || {}).forEach((dep) => {
      const normalized = dep.toLowerCase();
      if (normalized.includes('electron')) technologySet.add('electron');
      if (normalized.includes('express')) technologySet.add('express');
      if (normalized === 'react' || normalized.startsWith('react-')) technologySet.add('react');
      if (normalized === 'vue' || normalized.startsWith('vue-')) technologySet.add('vue');
      if (normalized === 'typescript') fileCounts.typescript = true;
    });
  }

  if (await fs.pathExists(path.join(WORKSPACE_ROOT, '.git'))) technologySet.add('git');
  const dockerFiles = ['Dockerfile', 'docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'];
  if ((await Promise.all(dockerFiles.map((name) => fs.pathExists(path.join(WORKSPACE_ROOT, name))))).some(Boolean)) technologySet.add('docker');
  const pythonFiles = ['requirements.txt', 'pyproject.toml', 'Pipfile', 'setup.py'];
  if ((await Promise.all(pythonFiles.map((name) => fs.pathExists(path.join(WORKSPACE_ROOT, name))))).some(Boolean)) fileCounts.python = true;

  const totalItems = await countWorkspaceItems(WORKSPACE_ROOT);
  const processed = { count: 0 };
  scanState.tree = await scanDirectory(WORKSPACE_ROOT, '', fileCounts, technologySet, detectedFrameworks, totalItems, processed);
  scanState.stats = { folders: fileCounts.folders, files: fileCounts.files, size: fileCounts.size };
  scanState.technologies = detectTechnologies(technologySet, packageJson, fileCounts);
  scanState.summary = buildSummary(packageJson, fileCounts, technologySet, detectedFrameworks, scanState.tree);
}

async function startScan() {
  if (scanState.status === 'scanning' && scanPromise) {
    return scanPromise;
  }
  resetScanState();
  scanPromise = scanWorkspace()
    .then(() => {
      if (cancelRequested) {
        scanState.status = 'cancelled';
        scanState.finishedAt = new Date().toISOString();
        return scanState;
      }
      scanState.status = 'complete';
      scanState.progress = 100;
      scanState.finishedAt = new Date().toISOString();
      return scanState;
    })
    .catch((error) => {
      const message = error.message || String(error);
      if (message.toLowerCase().includes('cancelada') || message.toLowerCase().includes('cancelled')) {
        scanState.status = 'cancelled';
        scanState.error = null;
      } else {
        scanState.status = 'failed';
        scanState.error = message;
      }
      scanState.finishedAt = new Date().toISOString();
      return scanState;
    });
  return scanPromise;
}

function cancelScan() {
  if (scanState.status !== 'scanning') {
    return false;
  }
  cancelRequested = true;
  return true;
}

function getScanState() {
  return scanState;
}

function getTree() {
  if (scanState.status === 'idle') {
    throw new Error('Nenhuma varredura foi executada ainda.');
  }
  return scanState.tree;
}

function getSummary() {
  if (scanState.status === 'idle') {
    throw new Error('Nenhuma varredura foi executada ainda.');
  }
  return scanState.summary;
}

function getIndex() {
  if (scanState.status === 'idle') {
    throw new Error('Nenhuma varredura foi executada ainda.');
  }
  return scanState.index;
}

module.exports = {
  startScan,
  cancelScan,
  getScanState,
  getTree,
  getSummary,
  getIndex,
};
