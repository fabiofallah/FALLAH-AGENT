const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');

const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;

const DEFAULT_LIMITS = {
  temp: 2 * GB,
  logs: 500 * MB,
  cache: 1 * GB,
  backups: 5 * GB,
};

const DEFAULT_OPTIONS = {
  monitorIntervalMs: 30000,
  temporaryMaxAgeMs: 24 * 60 * 60 * 1000,
  zipMaxAgeMs: 2 * 60 * 60 * 1000,
};

const TEMP_DIR_NAMES = new Set(['temp', 'cache']);
const TEMP_FILE_PATTERNS = [
  /(^|[-_.])(tmp|temp|debug|qa|trace|artifact|import|export)([-_.]|$)/i,
  /\.(tmp|temp|part|cache)$/i,
  /^debugscan.*\.(js|txt|log)$/i,
  /^missionapitest.*\.(js|txt|log)$/i,
  /^test\..+/i,
];

function toPosix(relativePath) {
  return String(relativePath || '').replace(/\\/g, '/');
}

function computePercent(used, total) {
  if (!total) return 0;
  return Math.min(100, Number(((used / total) * 100).toFixed(2)));
}

function parseLimitEnvValue(value, fallback) {
  if (value == null || value === '') return fallback;
  const text = String(value).trim().toLowerCase();
  const numeric = Number(text);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;

  const match = text.match(/^(\d+(?:\.\d+)?)\s*(kb|mb|gb)$/i);
  if (!match) return fallback;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (!Number.isFinite(amount) || amount <= 0) return fallback;
  if (unit === 'kb') return Math.round(amount * 1024);
  if (unit === 'mb') return Math.round(amount * MB);
  return Math.round(amount * GB);
}

function ensurePositiveInteger(value, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.round(num);
}

class StorageManager {
  constructor(options = {}) {
    this.workspaceRoot = path.resolve(options.workspaceRoot || path.resolve(__dirname, '..', '..'));
    this.paths = {
      root: this.workspaceRoot,
      temp: path.join(this.workspaceRoot, 'temp'),
      logs: path.join(this.workspaceRoot, 'logs'),
      backups: path.join(this.workspaceRoot, 'backups'),
      cache: path.join(this.workspaceRoot, 'cache'),
      workspace: path.join(this.workspaceRoot, 'workspace'),
      projetos: path.join(this.workspaceRoot, 'workspace', 'projetos'),
      legacyProjetos: path.join(this.workspaceRoot, 'projetos'),
      src: path.join(this.workspaceRoot, 'src'),
      scripts: path.join(this.workspaceRoot, 'scripts'),
      nodeModules: path.join(this.workspaceRoot, 'node_modules'),
      packageJson: path.join(this.workspaceRoot, 'package.json'),
      packageLockJson: path.join(this.workspaceRoot, 'package-lock.json'),
      env: path.join(this.workspaceRoot, '.env'),
      officialWorkspace: path.join(this.workspaceRoot, 'FF OFICIAL BRASIL'),
    };

    this.options = {
      monitorIntervalMs: ensurePositiveInteger(options.monitorIntervalMs, DEFAULT_OPTIONS.monitorIntervalMs),
      temporaryMaxAgeMs: ensurePositiveInteger(options.temporaryMaxAgeMs, DEFAULT_OPTIONS.temporaryMaxAgeMs),
      zipMaxAgeMs: ensurePositiveInteger(options.zipMaxAgeMs, DEFAULT_OPTIONS.zipMaxAgeMs),
    };

    this.limits = {
      temp: parseLimitEnvValue(process.env.FALLAH_LIMIT_TEMP, DEFAULT_LIMITS.temp),
      logs: parseLimitEnvValue(process.env.FALLAH_LIMIT_LOGS, DEFAULT_LIMITS.logs),
      cache: parseLimitEnvValue(process.env.FALLAH_LIMIT_CACHE, DEFAULT_LIMITS.cache),
      backups: parseLimitEnvValue(process.env.FALLAH_LIMIT_BACKUPS, DEFAULT_LIMITS.backups),
      ...(options.limits || {}),
    };

    this.monitorTimer = null;
    this.lastSnapshot = null;
    this.sessionStartedAt = Date.now();
    this.runningCleanupPromise = Promise.resolve();
  }

  async start() {
    await this.ensureBaseFolders();
    await this.collectSnapshot(true);

    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
    }

    this.monitorTimer = setInterval(() => {
      this.collectSnapshot(true).catch(() => {
        // Best effort monitoring loop.
      });
    }, this.options.monitorIntervalMs);
  }

  async stop() {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }
  }

  getLimits() {
    return { ...this.limits };
  }

  updateLimits(nextLimits = {}) {
    const keys = ['temp', 'logs', 'cache', 'backups'];
    for (const key of keys) {
      if (nextLimits[key] == null) continue;
      const nextValue = Number(nextLimits[key]);
      if (!Number.isFinite(nextValue) || nextValue <= 0) {
        throw new Error(`Invalid limit for ${key}`);
      }
      this.limits[key] = Math.round(nextValue);
    }
    return this.getLimits();
  }

  async getReport(forceRefresh = false) {
    if (!forceRefresh && this.lastSnapshot) {
      return this.lastSnapshot;
    }
    return this.collectSnapshot(true);
  }

  async cleanupPreview(options = {}) {
    const includeBackups = options.includeBackups === true;
    const candidates = await this.collectCleanupCandidates({ includeBackups });
    const categoryNames = {
      temporaryFiles: 'Arquivos temporários', cache: 'Cache', logs: 'Logs',
      temporaryZips: 'ZIPs temporários', oldBuilds: 'Builds antigas', oldBackups: 'Backups antigos',
    };
    const categories = Object.entries(categoryNames).map(([id, name]) => {
      const items = candidates.filter((item) => item.category === id);
      return { id, name, optional: id === 'oldBackups', count: items.length, bytes: items.reduce((total, item) => total + item.bytes, 0), items };
    });
    return { generatedAt: new Date().toISOString(), includeBackups, categories, totalCount: candidates.length, reclaimableBytes: candidates.reduce((total, item) => total + item.bytes, 0) };
  }

  async smartCleanup(options = {}) {
    const includeBackups = options.includeBackups === true;
    if (includeBackups && options.confirmBackups !== true) throw new Error('A remoção de backups exige confirmação explícita.');
    const preview = await this.cleanupPreview({ includeBackups });
    const removed = [];
    const skipped = [];
    const errors = [];

    const run = async () => {
      for (const item of preview.categories.flatMap((category) => category.items)) {
        const normalized = path.resolve(this.workspaceRoot, item.path);
        if (this.isProtectedPath(normalized) && item.category !== 'oldBackups') {
          skipped.push({ ...item, reason: 'protected' });
          continue;
        }
        try {
          await fsExtra.remove(normalized);
          removed.push(item);
        } catch (error) {
          errors.push({ ...item, error: error.message });
        }
      }
    };

    this.runningCleanupPromise = this.runningCleanupPromise.then(run, run);
    await this.runningCleanupPromise;

    const snapshot = await this.collectSnapshot(true);
    return {
      mode: 'manual-confirmed',
      removedCount: removed.length,
      reclaimedBytes: removed.reduce((total, item) => total + item.bytes, 0),
      skippedCount: skipped.length,
      errorCount: errors.length,
      removed,
      skipped,
      errors,
      preview,
      snapshot,
    };
  }

  async collectCleanupCandidates({ includeBackups = false } = {}) {
    const context = { now: Date.now(), candidates: [] };
    await this.collectTempCandidates(this.paths.temp, { ...context, category: 'temporaryFiles' });
    await this.collectTempCandidates(this.paths.cache, { ...context, category: 'cache' });
    await this.collectRootArtifactCandidates(context);
    await this.collectLogCandidates(context);
    await this.collectOldBuildCandidates(context);
    if (includeBackups) await this.collectOldBackupCandidates(context);
    const unique = new Map();
    for (const item of context.candidates) unique.set(item.path, item);
    return [...unique.values()].sort((a, b) => b.bytes - a.bytes || a.path.localeCompare(b.path));
  }

  async measurePath(target) {
    const stats = await fsExtra.stat(target).catch(() => null);
    if (!stats) return 0;
    if (stats.isFile()) return Number(stats.size || 0);
    if (!stats.isDirectory()) return 0;
    let total = 0;
    for (const entry of await fsExtra.readdir(target, { withFileTypes: true }).catch(() => [])) {
      if (!entry.isSymbolicLink()) total += await this.measurePath(path.join(target, entry.name));
    }
    return total;
  }

  async addCleanupCandidate(context, target, category) {
    const relative = toPosix(path.relative(this.workspaceRoot, path.resolve(target)) || '.');
    context.candidates.push({ path: relative, category, bytes: await this.measurePath(target) });
  }

  async ensureBaseFolders() {
    await Promise.all([
      fsExtra.ensureDir(this.paths.temp),
      fsExtra.ensureDir(this.paths.logs),
      fsExtra.ensureDir(this.paths.backups),
      fsExtra.ensureDir(this.paths.workspace),
    ]);
  }

  isWithin(rootPath, targetPath) {
    const root = path.resolve(rootPath);
    const target = path.resolve(targetPath);
    const relative = path.relative(root, target);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  }

  isProtectedPath(targetPath) {
    const target = path.resolve(targetPath);
    const protectedDirs = [
      this.paths.src,
      this.paths.scripts,
      this.paths.workspace,
      this.paths.backups,
      this.paths.nodeModules,
      this.paths.officialWorkspace,
      this.paths.projetos,
      this.paths.legacyProjetos,
    ];

    const protectedFiles = [
      this.paths.packageJson,
      this.paths.packageLockJson,
      this.paths.env,
    ];

    if (protectedFiles.some((filePath) => path.resolve(filePath) === target)) {
      return true;
    }

    for (const directory of protectedDirs) {
      if (this.isWithin(directory, target)) {
        return true;
      }
    }
    return false;
  }

  isTempLikeName(fileName) {
    const name = String(fileName || '').toLowerCase();
    return TEMP_FILE_PATTERNS.some((pattern) => pattern.test(name));
  }

  async collectTempCandidates(baseDir, context) {
    if (!(await fsExtra.pathExists(baseDir))) return;
    const entries = await fsExtra.readdir(baseDir, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(baseDir, entry.name);
      const stats = await fsExtra.stat(absolute).catch(() => null);
      if (!stats) continue;

      const age = context.now - stats.mtimeMs;
      const expiredZip = entry.isFile() && /\.zip$/i.test(entry.name) && age >= this.options.zipMaxAgeMs;
      const expiredTemp = age >= this.options.temporaryMaxAgeMs;
      const removeNow = expiredZip || expiredTemp || this.isTempLikeName(entry.name);

      if (removeNow) {
        await this.addCleanupCandidate(context, absolute, expiredZip ? 'temporaryZips' : context.category);
      }
    }
  }

  async collectRootArtifactCandidates(context) {
    const rootEntries = await fsExtra.readdir(this.workspaceRoot, { withFileTypes: true });
    for (const entry of rootEntries) {
      const lower = entry.name.toLowerCase();
      const absolute = path.join(this.workspaceRoot, entry.name);
      if (TEMP_DIR_NAMES.has(lower)) continue;

      const isQaDebug = /(^|[-_.])(qa|debug)([-_.]|$)/i.test(entry.name);
      const isTmpArtifact = this.isTempLikeName(entry.name);
      const isOrphanZip = entry.isFile() && /\.zip$/i.test(entry.name);

      if (!(isQaDebug || isTmpArtifact || isOrphanZip)) {
        continue;
      }

      if (entry.isFile()) {
        const stats = await fsExtra.stat(absolute).catch(() => null);
        if (!stats) continue;
        const age = context.now - stats.mtimeMs;
        if (age >= this.options.temporaryMaxAgeMs) {
          await this.addCleanupCandidate(context, absolute, isOrphanZip ? 'temporaryZips' : 'temporaryFiles');
        }
      } else if (entry.isDirectory()) {
        await this.addCleanupCandidate(context, absolute, 'temporaryFiles');
      }
    }
  }

  async collectLogCandidates(context) {
    if (!(await fsExtra.pathExists(this.paths.logs))) return;
    const entries = await fsExtra.readdir(this.paths.logs, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(this.paths.logs, entry.name);
      const stats = await fsExtra.stat(absolute).catch(() => null);
      if (!stats) continue;

      const age = context.now - stats.mtimeMs;
      const isTempArtifact = this.isTempLikeName(entry.name) || /\.tmp$/i.test(entry.name);
      if (!isTempArtifact) continue;

      if (age >= this.options.temporaryMaxAgeMs) {
        await this.addCleanupCandidate(context, absolute, 'logs');
      }
    }
  }

  async collectOldBuildCandidates(context) {
    const entries = await fsExtra.readdir(this.workspaceRoot, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (!entry.isDirectory() || !/^(build|dist|release)([-_.].*)?$/i.test(entry.name)) continue;
      const absolute = path.join(this.workspaceRoot, entry.name);
      const stats = await fsExtra.stat(absolute).catch(() => null);
      if (stats && context.now - stats.mtimeMs >= 7 * 24 * 60 * 60 * 1000) await this.addCleanupCandidate(context, absolute, 'oldBuilds');
    }
  }

  async collectOldBackupCandidates(context) {
    const entries = await fsExtra.readdir(this.paths.backups, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      const absolute = path.join(this.paths.backups, entry.name);
      const stats = await fsExtra.stat(absolute).catch(() => null);
      if (stats && context.now - stats.mtimeMs >= 30 * 24 * 60 * 60 * 1000) await this.addCleanupCandidate(context, absolute, 'oldBackups');
    }
  }

  async collectSnapshot(force = false) {
    if (!force && this.lastSnapshot && Date.now() - this.lastSnapshot.collectedAtMs < 5000) {
      return this.lastSnapshot;
    }

    const accumulator = {
      workspaceBytes: 0,
      fileCount: 0,
      zipCount: 0,
      temporaryCount: 0,
      topFiles: [],
      topFolders: [],
      folderSizes: {
        temp: 0,
        logs: 0,
        backups: 0,
        cache: 0,
        workspace: 0,
        projetos: 0,
      },
    };

    await this.walkDirectory(this.workspaceRoot, '', accumulator);

    const disk = await this.getDiskUsage();
    const folders = this.buildFolderSummaries(accumulator.folderSizes);
    const health = this.buildHealthSummary({ folders, disk, workspaceBytes: accumulator.workspaceBytes });

    this.lastSnapshot = {
      collectedAt: new Date().toISOString(),
      collectedAtMs: Date.now(),
      workspace: {
        totalBytes: accumulator.workspaceBytes,
        fileCount: accumulator.fileCount,
        zipCount: accumulator.zipCount,
        temporaryCount: accumulator.temporaryCount,
      },
      folders,
      limits: this.getLimits(),
      topFiles: accumulator.topFiles,
      topFolders: accumulator.topFolders,
      disk,
      health,
    };

    return this.lastSnapshot;
  }

  buildFolderSummaries(folderSizes) {
    return {
      temp: this.toFolderSummary('temp', folderSizes.temp, this.limits.temp),
      logs: this.toFolderSummary('logs', folderSizes.logs, this.limits.logs),
      backups: this.toFolderSummary('backups', folderSizes.backups, this.limits.backups),
      cache: this.toFolderSummary('cache', folderSizes.cache, this.limits.cache),
      workspace: this.toFolderSummary('workspace', folderSizes.workspace, null),
      projetos: this.toFolderSummary('projetos', folderSizes.projetos, null),
    };
  }

  toFolderSummary(name, bytes, limitBytes) {
    return {
      name,
      bytes,
      limitBytes: limitBytes || null,
      usagePercent: limitBytes ? computePercent(bytes, limitBytes) : null,
      exceedsLimit: limitBytes ? bytes >= limitBytes : false,
    };
  }

  buildHealthSummary({ folders, disk, workspaceBytes }) {
    const alerts = [];
    let status = 'healthy';

    const limitedFolders = [folders.temp, folders.logs, folders.cache, folders.backups].filter(Boolean);
    const maxFolderPercent = limitedFolders.reduce((max, item) => Math.max(max, item.usagePercent || 0), 0);

    for (const folder of limitedFolders) {
      if (folder.exceedsLimit) {
        alerts.push(`Limite excedido em ${folder.name}.`);
      } else if ((folder.usagePercent || 0) >= 80) {
        alerts.push(`Uso elevado em ${folder.name}: ${folder.usagePercent}%.`);
      }
    }

    if (disk && Number.isFinite(disk.usedPercent)) {
      if (disk.usedPercent >= 90) {
        alerts.push('Disco em nível crítico de utilização.');
      } else if (disk.usedPercent >= 75) {
        alerts.push('Disco em nível de atenção de utilização.');
      }
    }

    if (maxFolderPercent >= 100 || (disk && disk.usedPercent >= 90)) {
      status = 'critical';
    } else if (maxFolderPercent >= 80 || (disk && disk.usedPercent >= 75)) {
      status = 'warning';
    }

    const label = status === 'critical'
      ? '🔴 Crítico'
      : status === 'warning'
        ? '🟡 Atenção'
        : '🟢 Saudável';

    return {
      status,
      label,
      alerts,
      workspaceBytes,
    };
  }

  updateTopFiles(list, nextFile) {
    list.push(nextFile);
    list.sort((a, b) => b.size - a.size);
    if (list.length > 10) list.length = 10;
  }

  updateTopFolders(list, nextFolder) {
    list.push(nextFolder);
    list.sort((a, b) => b.size - a.size);
    if (list.length > 10) list.length = 10;
  }

  async walkDirectory(absoluteDir, relativeDir, acc) {
    let folderTotal = 0;
    const entries = await fsExtra.readdir(absoluteDir, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(absoluteDir, entry.name);
      const relativePath = toPosix(path.join(relativeDir, entry.name));

      if (entry.isSymbolicLink()) {
        continue;
      }

      if (entry.isDirectory()) {
        const childSize = await this.walkDirectory(absolutePath, relativePath, acc);
        folderTotal += childSize;
        this.updateTopFolders(acc.topFolders, { path: relativePath || '.', size: childSize });
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const stats = await fsExtra.stat(absolutePath);
      const size = Number(stats.size || 0);
      folderTotal += size;
      acc.workspaceBytes += size;
      acc.fileCount += 1;

      if (/\.zip$/i.test(entry.name)) {
        acc.zipCount += 1;
      }

      const relLower = relativePath.toLowerCase();
      if (this.isTempLikeName(entry.name) || relLower.startsWith('temp/') || relLower.startsWith('cache/')) {
        acc.temporaryCount += 1;
      }

      if (relLower.startsWith('temp/')) acc.folderSizes.temp += size;
      if (relLower.startsWith('logs/')) acc.folderSizes.logs += size;
      if (relLower.startsWith('backups/')) acc.folderSizes.backups += size;
      if (relLower.startsWith('cache/')) acc.folderSizes.cache += size;
      if (relLower.startsWith('workspace/')) acc.folderSizes.workspace += size;
      if (relLower.startsWith('workspace/projetos/') || relLower.startsWith('projetos/')) {
        acc.folderSizes.projetos += size;
      }

      this.updateTopFiles(acc.topFiles, { path: relativePath, size });
    }

    return folderTotal;
  }

  async getDiskUsage() {
    try {
      if (!fs.promises || typeof fs.promises.statfs !== 'function') {
        return null;
      }
      const stat = await fs.promises.statfs(this.workspaceRoot);
      const bsize = Number(stat.bsize || 4096);
      const totalBytes = Number(stat.blocks || 0) * bsize;
      const freeBytes = Number(stat.bavail || stat.bfree || 0) * bsize;
      const usedBytes = Math.max(0, totalBytes - freeBytes);
      return {
        totalBytes,
        usedBytes,
        freeBytes,
        usedPercent: computePercent(usedBytes, totalBytes),
      };
    } catch (error) {
      return null;
    }
  }
}

const storageService = new StorageManager();

module.exports = {
  StorageManager,
  storageService,
};
