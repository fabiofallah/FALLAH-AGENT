const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { resolveWorkspacePath } = require('./pathHelper');

const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..');
const MISSIONS_FOLDER = path.join(WORKSPACE_ROOT, 'workspace', 'missions');
const VALID_STATUSES = ['pending', 'running', 'completed', 'failed'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

function ensureMissionsFolder() {
  return fs.ensureDir(MISSIONS_FOLDER);
}

function validateMissionId(id) {
  if (!id || typeof id !== 'string' || !/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new Error('Identificador de missão inválido.');
  }
  const missionFile = path.resolve(MISSIONS_FOLDER, `${id}.json`);
  if (!missionFile.startsWith(MISSIONS_FOLDER)) {
    throw new Error('Identificador de missão inválido.');
  }
  return missionFile;
}

function validatePayload(payload, allowEmpty = false) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Dados da missão inválidos.');
  }
  const title = String(payload.title || '').trim();
  if (!title && !allowEmpty) {
    throw new Error('O título da missão é obrigatório.');
  }
  if (title.length > 200) {
    throw new Error('O título da missão deve ter no máximo 200 caracteres.');
  }
  const description = String(payload.description || '').trim();
  if (description.length > 2000) {
    throw new Error('A descrição da missão deve ter no máximo 2.000 caracteres.');
  }
  const category = payload.category ? String(payload.category).trim() : 'General';
  const priority = payload.priority ? String(payload.priority).toLowerCase() : 'medium';
  if (!VALID_PRIORITIES.includes(priority)) {
    throw new Error(`Priority must be one of: ${VALID_PRIORITIES.join(', ')}`);
  }
  return { title, description, category, priority };
}

function validateStatus(status) {
  if (!status || typeof status !== 'string' || !VALID_STATUSES.includes(status)) {
    throw new Error(`Status must be one of: ${VALID_STATUSES.join(', ')}`);
  }
  return status;
}

function validateProgress(progress) {
  if (progress === undefined || progress === null) {
    return undefined;
  }
  const value = Number(progress);
  if (Number.isNaN(value) || value < 0 || value > 100) {
    throw new Error('O progresso deve ser um número entre 0 e 100.');
  }
  return value;
}

async function missionFilePath(id) {
  await ensureMissionsFolder();
  return validateMissionId(id);
}

async function loadMission(id) {
  const missionPath = await missionFilePath(id);
  if (!(await fs.pathExists(missionPath))) {
    throw new Error('Missão não encontrada.');
  }
  return fs.readJson(missionPath);
}

async function saveMission(mission) {
  await ensureMissionsFolder();
  const missionPath = validateMissionId(mission.id);
  return fs.writeJson(missionPath, mission, { spaces: 2 });
}

async function listMissions(options = {}) {
  await ensureMissionsFolder();
  const files = await fs.readdir(MISSIONS_FOLDER);
  const missions = [];
  for (const file of files) {
    if (!file.toLowerCase().endsWith('.json')) continue;
    try {
      const mission = await fs.readJson(path.join(MISSIONS_FOLDER, file));
      missions.push(mission);
    } catch (error) {
      // ignore invalid JSON files
    }
  }
  const sorted = missions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  if (!options.paginated) return sorted;
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 25));
  const search = String(options.search || '').trim().toLowerCase();
  const filtered = search ? sorted.filter((mission) => [mission.title, mission.description, mission.category].some((value) => String(value || '').toLowerCase().includes(search))) : sorted;
  return { items: filtered.slice((page - 1) * limit, page * limit), pagination: { page, limit, total: filtered.length, pages: Math.max(1, Math.ceil(filtered.length / limit)) } };
}

async function createMission(payload) {
  const { title, description, category, priority } = validatePayload(payload);
  await ensureMissionsFolder();
  const id = crypto.randomUUID().replace(/[^A-Za-z0-9_-]/g, '-');
  const timestamp = new Date().toISOString();
  const mission = {
    id,
    title,
    description,
    category,
    priority,
    status: 'pending',
    progress: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
    errorMessage: null,
    logs: [],
  };
  await saveMission(mission);
  return mission;
}

async function updateMissionStatus(id, changes = {}) {
  const mission = await loadMission(id);
  let updated = false;

  if (changes.status !== undefined) {
    mission.status = validateStatus(changes.status);
    updated = true;
  }

  if (changes.progress !== undefined) {
    mission.progress = validateProgress(changes.progress);
    updated = true;
  }

  if (changes.errorMessage !== undefined) {
    mission.errorMessage = changes.errorMessage ? String(changes.errorMessage).trim() : null;
    updated = true;
  }

  if (changes.logEntry !== undefined) {
    const entry = String(changes.logEntry || '').trim();
    if (entry) {
      mission.logs.push({ timestamp: new Date().toISOString(), message: entry });
      updated = true;
    }
  }

  if (changes.logs !== undefined && Array.isArray(changes.logs)) {
    for (const logEntry of changes.logs) {
      if (typeof logEntry === 'string' && logEntry.trim()) {
        mission.logs.push({ timestamp: new Date().toISOString(), message: logEntry.trim() });
        updated = true;
      }
    }
  }

  if (!updated) {
    throw new Error('Nenhuma atualização válida foi informada.');
  }

  mission.updatedAt = new Date().toISOString();
  if (mission.status === 'completed' && mission.progress < 100) {
    mission.progress = 100;
  }

  await saveMission(mission);
  return mission;
}

async function editMission(id, payload) {
  const mission = await loadMission(id);
  const { title, description, category, priority } = validatePayload(payload, true);
  if (title) mission.title = title;
  if (description) mission.description = description;
  if (category) mission.category = category;
  if (priority) mission.priority = priority;
  mission.updatedAt = new Date().toISOString();
  await saveMission(mission);
  return mission;
}

async function updateProgress(id, progress) {
  const mission = await loadMission(id);
  mission.progress = validateProgress(progress);
  mission.updatedAt = new Date().toISOString();
  await saveMission(mission);
  return mission;
}

async function appendLogs(id, logEntry) {
  if (!logEntry || typeof logEntry !== 'string') {
    throw new Error('O registro de log deve conter texto.');
  }
  const mission = await loadMission(id);
  mission.logs.push({ timestamp: new Date().toISOString(), message: logEntry.trim() });
  mission.updatedAt = new Date().toISOString();
  await saveMission(mission);
  return mission;
}

async function deleteMission(id) {
  const missionPath = await missionFilePath(id);
  if (!(await fs.pathExists(missionPath))) {
    throw new Error('Missão não encontrada.');
  }
  await fs.remove(missionPath);
}

module.exports = {
  createMission,
  listMissions,
  loadMission,
  updateMissionStatus,
  updateProgress,
  appendLogs,
  editMission,
  deleteMission,
};
