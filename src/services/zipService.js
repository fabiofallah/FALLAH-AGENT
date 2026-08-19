const fs = require('fs-extra');
const path = require('path');
const archiverModule = require('archiver');
const AdmZip = require('adm-zip');
const { resolveWorkspacePath } = require('./pathHelper');

const ZIP_TEMP_FOLDER = path.resolve(__dirname, '..', '..', 'temp');
const ZIP_TIMEOUT_MS = 120000;
const MB = 1024 * 1024;
const GB = 1024 * 1024 * 1024;
const MAX_ZIP_BYTES = Number(process.env.FALLAH_ZIP_MAX_BYTES || 2 * GB);
const ZIP_ABNORMAL_RATIO = Number(process.env.FALLAH_ZIP_ABNORMAL_RATIO || 1.35);
const ZIP_ABNORMAL_MIN_SOURCE_BYTES = Number(process.env.FALLAH_ZIP_ABNORMAL_MIN_SOURCE_BYTES || 5 * MB);
const MAX_IMPORT_COMPRESSED_BYTES = Number(process.env.FALLAH_ZIP_IMPORT_MAX_COMPRESSED_BYTES || 100 * MB);
const MAX_IMPORT_UNCOMPRESSED_BYTES = Number(process.env.FALLAH_ZIP_IMPORT_MAX_UNCOMPRESSED_BYTES || 1024 * MB);
const MAX_IMPORT_ENTRIES = Number(process.env.FALLAH_ZIP_IMPORT_MAX_ENTRIES || 5000);
const MAX_IMPORT_RATIO = Number(process.env.FALLAH_ZIP_IMPORT_MAX_RATIO || 100);
const PERMANENT_EXCLUSIONS = [
  'temp',
  'temp/**',
  'cache',
  'cache/**',
  'logs',
  'logs/**',
  '.git',
  '.git/**',
  'node_modules',
  'node_modules/**',
  '**/*.tmp',
  '**/*.temp',
  '**/*.part',
];

const createArchiver = typeof archiverModule === 'function'
  ? (format, options) => archiverModule(format, options)
  : (format, options) => {
      if (format !== 'zip') {
        throw new Error(`Unsupported archive format: ${format}`);
      }
      return new archiverModule.ZipArchive(options);
    };

function createZipError(message, statusCode = 500, code = 'ZIP_ERROR') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function normalizeZipEntryPath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function shouldSkipForZip(relativePath) {
  const normalized = normalizeZipEntryPath(relativePath).toLowerCase();
  if (!normalized) return false;
  if (normalized === 'temp' || normalized.startsWith('temp/')) return true;
  if (normalized === 'cache' || normalized.startsWith('cache/')) return true;
  if (normalized === 'logs' || normalized.startsWith('logs/')) return true;
  if (normalized === '.git' || normalized.startsWith('.git/')) return true;
  if (normalized === 'node_modules' || normalized.startsWith('node_modules/')) return true;
  if (normalized.endsWith('.tmp') || normalized.endsWith('.temp') || normalized.endsWith('.part')) return true;
  return false;
}

async function estimateSourceSize(sourcePath, workspaceRoot, archivePath) {
  const sourceStat = await fs.stat(sourcePath);
  if (sourceStat.isFile()) {
    return sourceStat.size;
  }

  let total = 0;

  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(dir, entry.name);
      if (absolute === archivePath) {
        continue;
      }
      const relativeToWorkspace = normalizeZipEntryPath(path.relative(workspaceRoot, absolute));
      if (shouldSkipForZip(relativeToWorkspace)) {
        continue;
      }
      if (entry.isDirectory()) {
        await walk(absolute);
        continue;
      }
      if (entry.isFile()) {
        const stats = await fs.stat(absolute);
        total += Number(stats.size || 0);
      }
    }
  }

  await walk(path.resolve(sourcePath));
  return total;
}

function detectAbnormalGrowth(currentBytes, sourceBytes, maxAllowedBytes) {
  if (currentBytes > maxAllowedBytes) {
    return true;
  }
  if (sourceBytes >= ZIP_ABNORMAL_MIN_SOURCE_BYTES && currentBytes > sourceBytes * ZIP_ABNORMAL_RATIO) {
    return true;
  }
  return false;
}

async function createZip(requestedPath = '', options = {}) {
  const workspaceRoot = path.resolve(options.workspaceRoot || path.resolve(__dirname, '..', '..'));
  const tempFolder = path.resolve(options.tempFolder || ZIP_TEMP_FOLDER);
  const sourcePath = resolveWorkspacePath(workspaceRoot, requestedPath || '.');
  const timestamp = Date.now();
  const archiveName = `fallah-agent-${timestamp}.zip`;
  const archivePath = path.join(tempFolder, archiveName);

  await fs.ensureDir(tempFolder);
  const sourceStat = await fs.stat(sourcePath);
  const sourceBytes = await estimateSourceSize(sourcePath, workspaceRoot, archivePath);
  const maxAllowedBytes = Math.max(5 * MB, Math.min(MAX_ZIP_BYTES, Math.max(sourceBytes * 2, 50 * MB)));

  return new Promise(async (resolve, reject) => {
    const output = fs.createWriteStream(archivePath);
    const archive = createArchiver('zip', { zlib: { level: 9 } });
    let settled = false;
    let inactivityTimer = null;
    let growthGuardInFlight = false;

    const cleanupArchiveFile = async () => {
      await fs.remove(archivePath).catch(() => {});
    };

    const resetTimeout = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(async () => {
        await settle(createZipError('Tempo limite excedido ao gerar o arquivo ZIP.', 504, 'ZIP_TIMEOUT'));
      }, ZIP_TIMEOUT_MS);
    };

    const settle = async (error, payload = null) => {
      if (settled) return;
      settled = true;
      if (inactivityTimer) clearTimeout(inactivityTimer);
      archive.removeAllListeners();
      output.removeAllListeners();
      if (error) {
        archive.destroy();
        output.destroy();
        await cleanupArchiveFile();
        reject(error);
        return;
      }
      resolve(payload);
    };

    const runGrowthGuard = async () => {
      if (growthGuardInFlight || settled) return;
      growthGuardInFlight = true;
      try {
        const stats = await fs.stat(archivePath).catch(() => null);
        if (!stats) return;
        const currentBytes = Number(stats.size || 0);
        if (detectAbnormalGrowth(currentBytes, sourceBytes, maxAllowedBytes)) {
          await settle(createZipError('Crescimento anormal detectado durante a exportação ZIP. Operação abortada por segurança.', 422, 'ZIP_ABNORMAL_GROWTH'));
        }
      } finally {
        growthGuardInFlight = false;
      }
    };

    const sourceRelative = normalizeZipEntryPath(path.relative(workspaceRoot, sourcePath));
    const nameInZip = path.basename(sourcePath);
    if (sourceRelative && shouldSkipForZip(sourceRelative)) {
      await settle(createZipError('Origem bloqueada por política de segurança de exportação.', 400, 'ZIP_SOURCE_EXCLUDED'));
      return;
    }

    resetTimeout();

    output.on('error', async (err) => settle(err));
    output.on('close', async () => {
      try {
        const validation = validateZipArchive(archivePath);
        if (detectAbnormalGrowth(validation.bytes, sourceBytes, maxAllowedBytes)) {
          throw createZipError('Arquivo ZIP final com crescimento anormal. Exportação abortada por segurança.', 422, 'ZIP_ABNORMAL_GROWTH_FINAL');
        }
        await settle(null, { archiveName, ...validation });
      } catch (validationError) {
        await settle(validationError);
      }
    });

    archive.on('error', async (err) => settle(err));
    archive.on('warning', (warning) => {
      if (warning && warning.code !== 'ENOENT') {
        settle(warning);
      }
    });

    archive.on('progress', resetTimeout);
    archive.on('entry', resetTimeout);
    archive.on('progress', runGrowthGuard);
    archive.on('entry', runGrowthGuard);

    archive.pipe(output);

    if (sourceStat.isDirectory()) {
      const children = await fs.readdir(sourcePath);
      if (children.length === 0) {
        archive.append('', { name: normalizeZipEntryPath(path.posix.join(nameInZip, '.keep')) });
      } else if (sourcePath === workspaceRoot) {
        archive.glob('**/*', {
          cwd: sourcePath,
          dot: true,
          ignore: PERMANENT_EXCLUSIONS,
        }, {
          prefix: '',
        });
      } else {
        const relativeArchivePath = normalizeZipEntryPath(path.relative(sourcePath, archivePath));
        archive.glob('**/*', {
          cwd: sourcePath,
          dot: true,
          ignore: [...PERMANENT_EXCLUSIONS, relativeArchivePath],
        }, {
          prefix: nameInZip,
        });
      }
    } else if (sourceStat.isFile()) {
      archive.file(sourcePath, { name: nameInZip });
    } else {
      await settle(createZipError('O caminho selecionado não é um arquivo ou uma pasta válida.', 400, 'ZIP_INVALID_SOURCE'));
      return;
    }

    archive.finalize().catch((finalizeError) => settle(finalizeError));
  });
}

function validateZipArchive(archivePath) {
  const zip = new AdmZip(archivePath);
  const entries = zip.getEntries();
  if (!entries || entries.length === 0) {
    throw createZipError('O arquivo ZIP criado não contém entradas válidas.', 500, 'ZIP_EMPTY_OUTPUT');
  }
  return {
    entriesCount: entries.length,
    bytes: fs.statSync(archivePath).size,
  };
}

function resolveZipPath(archiveName) {
  if (!archiveName || archiveName.includes('..')) {
    throw new Error('Nome de arquivo ZIP inválido.');
  }
  const archivePath = path.resolve(ZIP_TEMP_FOLDER, archiveName);
  if (!archivePath.startsWith(ZIP_TEMP_FOLDER)) {
    throw new Error('O arquivo ZIP está fora da pasta permitida.');
  }
  return archivePath;
}

async function importZip(fileName, base64Data, options = {}) {
  const workspaceRoot = path.resolve(options.workspaceRoot || path.resolve(__dirname, '..', '..'));
  const safeFileName = path.basename(String(fileName || ''));
  if (safeFileName !== String(fileName || '') || !safeFileName.toLowerCase().endsWith('.zip')) {
    throw new Error('Somente arquivos .zip são permitidos.');
  }
  const buffer = Buffer.from(base64Data, 'base64');
  if (!buffer.length) {
    throw new Error('Conteúdo ZIP inválido.');
  }
  if (buffer.length > MAX_IMPORT_COMPRESSED_BYTES) throw new Error('ZIP compactado excede o limite permitido.');
  const importPath = path.join(ZIP_TEMP_FOLDER, `import-${Date.now()}-${safeFileName}`);
  await fs.ensureDir(ZIP_TEMP_FOLDER);
  await fs.writeFile(importPath, buffer);
  try {
    const zip = new AdmZip(importPath);
    const entries = zip.getEntries();
    if (!entries || entries.length === 0) {
      throw new Error('O arquivo ZIP está vazio.');
    }
    if (entries.length > MAX_IMPORT_ENTRIES) throw new Error('ZIP contém arquivos demais.');

    let uncompressedBytes = 0;
    const conflicts = [];
    for (const entry of entries) {
      const normalized = path.normalize(entry.entryName || '').replace(/^([/\\])+/, '');
      if (!normalized || normalized.includes('..')) {
        throw new Error('O arquivo ZIP contém caminhos inválidos.');
      }
      const destination = path.resolve(workspaceRoot, normalized);
      const relative = path.relative(workspaceRoot, destination);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error('O arquivo ZIP contém caminhos inseguros.');
      }
      const entryBytes = Number(entry.header?.size || 0);
      uncompressedBytes += entryBytes;
      if (uncompressedBytes > MAX_IMPORT_UNCOMPRESSED_BYTES) throw new Error('ZIP descompactado excede o limite permitido.');
      if (await fs.pathExists(destination)) conflicts.push(normalized.replace(/\\/g, '/'));
    }

    const ratio = uncompressedBytes / Math.max(buffer.length, 1);
    if (uncompressedBytes > 10 * MB && ratio > MAX_IMPORT_RATIO) throw new Error('ZIP rejeitado por taxa de compressão anormal.');
    if (conflicts.length && options.allowOverwrite !== true) {
      const error = new Error(`A importação sobrescreverá ${conflicts.length} item(ns). Confirme para continuar.`);
      error.code = 'ZIP_OVERWRITE_CONFIRMATION_REQUIRED';
      error.conflicts = conflicts.slice(0, 100);
      throw error;
    }

    zip.extractAllTo(workspaceRoot, true);
    return { entriesCount: entries.length, uncompressedBytes, overwritten: conflicts.length };
  } finally {
    await fs.remove(importPath);
  }
}

module.exports = {
  createZip,
  resolveZipPath,
  importZip,
  shouldSkipForZip,
};
