const tabs = document.querySelectorAll('nav button');
const sections = document.querySelectorAll('main section');
const statusText = document.getElementById('statusText');
const rootPath = document.getElementById('rootPath');
const smartCleanupButton = document.getElementById('smartCleanupButton');
const cleanupPreviewPanel = document.getElementById('cleanupPreviewPanel');
const cleanupIncludeBackups = document.getElementById('cleanupIncludeBackups');
const cleanupPreviewSummary = document.getElementById('cleanupPreviewSummary');
const cleanupPreviewCategories = document.getElementById('cleanupPreviewCategories');
const confirmSmartCleanup = document.getElementById('confirmSmartCleanup');
const cancelSmartCleanup = document.getElementById('cancelSmartCleanup');
const healthDiskUsage = document.getElementById('healthDiskUsage');
const healthWorkspaceUsage = document.getElementById('healthWorkspaceUsage');
const healthTempUsage = document.getElementById('healthTempUsage');
const healthLogsUsage = document.getElementById('healthLogsUsage');
const healthCacheUsage = document.getElementById('healthCacheUsage');
const healthBackupsUsage = document.getElementById('healthBackupsUsage');
const healthWorkspaceFolderUsage = document.getElementById('healthWorkspaceFolderUsage');
const healthProjectsUsage = document.getElementById('healthProjectsUsage');
const healthFileCount = document.getElementById('healthFileCount');
const healthZipCount = document.getElementById('healthZipCount');
const healthTemporaryCount = document.getElementById('healthTemporaryCount');
const healthStatus = document.getElementById('healthStatus');
const healthTopFiles = document.getElementById('healthTopFiles');
const healthTopFolders = document.getElementById('healthTopFolders');
const healthAlerts = document.getElementById('healthAlerts');
const projectTree = document.getElementById('projectTree');
const fileList = document.getElementById('fileList');
const refreshExplorer = document.getElementById('refreshExplorer');
const explorerSearch = document.getElementById('explorerSearch');
const clearExplorerSearch = document.getElementById('clearExplorerSearch');
const showSystemFiles = document.getElementById('showSystemFiles');
const newFile = document.getElementById('newFile');
const newFolder = document.getElementById('newFolder');
const explorerBreadcrumb = document.getElementById('explorerBreadcrumb');
const explorerStatusText = document.getElementById('explorerStatusText');
const explorerFolderSummary = document.getElementById('explorerFolderSummary');
const explorerNewFile = document.getElementById('explorerNewFile');
const explorerNewFolder = document.getElementById('explorerNewFolder');
const explorerEmptyState = document.getElementById('explorerEmptyState');
const explorerLoader = document.getElementById('explorerLoader');
const explorerContextMenu = document.getElementById('explorerContextMenu');
const explorerTableHeaders = document.querySelectorAll('.explorer-table th[data-sort-key]');
const favoriteList = document.getElementById('favoriteList');
const recentList = document.getElementById('recentList');
const sidebarResize = document.getElementById('sidebarResize');
const editorPath = document.getElementById('editorPath');
const loadFile = document.getElementById('loadFile');
const editorTabs = document.getElementById('editorTabs');
const editorContainer = document.getElementById('editorContainer');
const findFile = document.getElementById('findFile');
const replaceFile = document.getElementById('replaceFile');
const zoomIn = document.getElementById('zoomIn');
const zoomOut = document.getElementById('zoomOut');
const saveFile = document.getElementById('saveFile');
const saveAsFile = document.getElementById('saveAsFile');
const editorMessage = document.getElementById('editorMessage');
const editorStatus = document.getElementById('editorStatus');
const zipPath = document.getElementById('zipPath');
const createZip = document.getElementById('createZip');
const exportProjectZip = document.getElementById('exportProjectZip');
const zipImportFile = document.getElementById('zipImportFile');
const selectZipImportFile = document.getElementById('selectZipImportFile');
const importZip = document.getElementById('importZip');
const zipResult = document.getElementById('zipResult');
const terminalCommand = document.getElementById('terminalCommand');
const runCommand = document.getElementById('runCommand');
const cancelTerminal = document.getElementById('cancelTerminal');
const clearTerminal = document.getElementById('clearTerminal');
const terminalOutput = document.getElementById('terminalOutput');
const chatHistory = document.getElementById('chatHistory');
const chatInput = document.getElementById('chatInput');
const chatAttachment = document.getElementById('chatAttachment');
const chatAttachmentButton = document.getElementById('chatAttachmentButton');
const chatAttachmentMenu = document.getElementById('chatAttachmentMenu');
const chatAttachments = document.getElementById('chatAttachments');
const chatStatus = document.getElementById('chatStatus');
const chatSearch = document.getElementById('chatSearch');
const chatConversationSearch = document.getElementById('chatConversationSearch');
const conversationList = document.getElementById('conversationList');
const loadMoreConversations = document.getElementById('loadMoreConversations');
const conversationTitle = document.getElementById('conversationTitle');
const newConversation = document.getElementById('newConversation');
const importConversationButton = document.getElementById('importConversation');
const exportConversation = document.getElementById('exportConversation');
const exportConversationTxt = document.getElementById('exportConversationTxt');
const exportConversationMd = document.getElementById('exportConversationMd');
const renameConversation = document.getElementById('renameConversation');
const duplicateConversationButton = document.getElementById('duplicateConversation');
const pinConversationButton = document.getElementById('pinConversation');
const copyConversationButton = document.getElementById('copyConversation');
const shareConversationButton = document.getElementById('shareConversation');
const clearConversationButton = document.getElementById('clearConversation');
const deleteConversationButton = document.getElementById('deleteConversation');
const clearAllConversationsButton = document.getElementById('clearAllConversations');
const chatConversationSort = document.getElementById('chatConversationSort');
const chatImportFile = document.getElementById('chatImportFile');
const cancelChat = document.getElementById('cancelChat');
const sendChat = document.getElementById('sendChat');
const chatModel = document.getElementById('chatModel');
const chatSpeed = document.getElementById('chatSpeed');
const chatProfile = document.getElementById('chatProfile');
const chatEnterBehavior = document.getElementById('chatEnterBehavior');
const aiProviderSelect = document.getElementById('aiProviderSelect');
const aiProviderStatus = document.getElementById('aiProviderStatus');
const aiProviderModel = document.getElementById('aiProviderModel');
const aiProviderApiKey = document.getElementById('aiProviderApiKey');
const aiProviderMaskHint = document.getElementById('aiProviderMaskHint');
const aiTestButton = document.getElementById('aiTestButton');
const aiSaveButton = document.getElementById('aiSaveButton');
const aiManagerMessage = document.getElementById('aiManagerMessage');
const aiConnectionIndicator = document.getElementById('aiConnectionIndicator');
const aiResponseTime = document.getElementById('aiResponseTime');
const toggleAiApiKey = document.getElementById('toggleAiApiKey');
const copyAiApiKey = document.getElementById('copyAiApiKey');
const missionTitle = document.getElementById('missionTitle');
const missionDescription = document.getElementById('missionDescription');
const createMissionButton = document.getElementById('createMission');
const refreshMissions = document.getElementById('refreshMissions');
const missionCategory = document.getElementById('missionCategory');
const missionPriority = document.getElementById('missionPriority');
const missionMessage = document.getElementById('missionMessage');
const missionSearch = document.getElementById('missionSearch');
const missionStatusFilter = document.getElementById('missionStatusFilter');
const missionPriorityFilter = document.getElementById('missionPriorityFilter');
const missionCategoryFilter = document.getElementById('missionCategoryFilter');
const missionsList = document.getElementById('missionsList');
const missionLoading = document.getElementById('missionLoading');
const loadMoreMissions = document.getElementById('loadMoreMissions');
const missionDetails = document.getElementById('missionDetails');
const missionDetailsContent = document.getElementById('missionDetailsContent');
const closeMissionDetails = document.getElementById('closeMissionDetails');
const runScanner = document.getElementById('runScanner');
const cancelScanner = document.getElementById('cancelScanner');
const scannerProgressFill = document.getElementById('scannerProgressFill');
const scannerStatus = document.getElementById('scannerStatus');
const scannerFolderCount = document.getElementById('scannerFolderCount');
const scannerFileCount = document.getElementById('scannerFileCount');
const scannerSummary = document.getElementById('scannerSummary');
const scannerTree = document.getElementById('scannerTree');
const loadMoreScanner = document.getElementById('loadMoreScanner');
const scannerSearch = document.getElementById('scannerSearch');
const scannerTechnologies = document.getElementById('scannerTechnologies');
const explorerPropertiesBody = document.getElementById('explorerPropertiesBody');
const openPreferencesTop = document.getElementById('openPreferencesTop');
const toggleTheme = document.getElementById('toggleTheme');
const toolbarNewFile = document.getElementById('toolbarNewFile');
const toolbarNewFolder = document.getElementById('toolbarNewFolder');
const toolbarCopy = document.getElementById('toolbarCopy');
const toolbarCut = document.getElementById('toolbarCut');
const toolbarPaste = document.getElementById('toolbarPaste');
const toolbarDuplicate = document.getElementById('toolbarDuplicate');
const toolbarMove = document.getElementById('toolbarMove');
const toolbarRename = document.getElementById('toolbarRename');
const toolbarDelete = document.getElementById('toolbarDelete');
const toolbarFavorite = document.getElementById('toolbarFavorite');
const toolbarSettings = document.getElementById('toolbarSettings');
const toolbarZip = document.getElementById('toolbarZip');
const toolbarExtract = document.getElementById('toolbarExtract');
const toolbarImport = document.getElementById('toolbarImport');
const toolbarExport = document.getElementById('toolbarExport');
const assistantModuleCards = document.getElementById('assistantModuleCards');
const assistantResult = document.getElementById('assistantResult');
const assistantModuleTitle = document.getElementById('assistantModuleTitle');
const assistantModuleDetails = document.getElementById('assistantModuleDetails');
const refreshAssistantModules = document.getElementById('refreshAssistantModules');
const prefTheme = document.getElementById('prefTheme');
const prefIconSet = document.getElementById('prefIconSet');
const prefFontSize = document.getElementById('prefFontSize');
const prefZoom = document.getElementById('prefZoom');
const prefTreeCompact = document.getElementById('prefTreeCompact');
const prefConfirmDelete = document.getElementById('prefConfirmDelete');
const prefShowHints = document.getElementById('prefShowHints');
const prefScannerAuto = document.getElementById('prefScannerAuto');
const savePreferences = document.getElementById('savePreferences');
const preferencesResult = document.getElementById('preferencesResult');
const statusProject = document.getElementById('statusProject');
const statusCurrentFolder = document.getElementById('statusCurrentFolder');
const statusFiles = document.getElementById('statusFiles');
const statusFolders = document.getElementById('statusFolders');
const statusServer = document.getElementById('statusServer');
const statusScanner = document.getElementById('statusScanner');
const statusAi = document.getElementById('statusAi');
const statusMemory = document.getElementById('statusMemory');
const statusCpu = document.getElementById('statusCpu');
const statusClock = document.getElementById('statusClock');
let scannerTreeData = [];

function setActiveTab(tabId, options = {}) {
  if (![...sections].some((section) => section.id === tabId)) return;
  tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === tabId));
  sections.forEach((section) => section.id === tabId ? section.classList.add('active') : section.classList.remove('active'));
  sessionStorage.setItem('fallah.activeTab', tabId);
  if (options.history !== false) {
    const method = options.replace ? 'replaceState' : 'pushState';
    window.history[method]({ fallahTab: tabId }, '', `#${encodeURIComponent(tabId)}`);
  }
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => setActiveTab(tab.dataset.tab));
});

window.addEventListener('popstate', (event) => {
  const tabId = event.state?.fallahTab || decodeURIComponent(location.hash.slice(1));
  if (tabId) setActiveTab(tabId, { history: false });
});

async function fetchJson(url, options = {}) {
  const request = { ...options, headers: { ...(options.headers || {}) } };
  if (typeof request.body === 'string' && !Object.keys(request.headers).some((name) => name.toLowerCase() === 'content-type')) request.headers['Content-Type'] = 'application/json';
  const res = await fetch(url, request);
  return res.json();
}

let discoveryHousesCache = [];
let discoverySelectedHouseId = null;
let pipelineAuditRefreshTimer = null;
let pipelineAuditState = {
  houseId: '',
  day: 'all',
  sport: '',
  competition: '',
  event: '',
  status: 'all',
  fresh: 'all',
  page: 1,
  pageSize: 50,
};

async function loadDashboard() {
  try {
    const response = await fetch('/api/status');
    const data = await response.json();
    statusText.textContent = data.status || 'ok';
    rootPath.textContent = data.workspace || 'Espaço de trabalho desconhecido';
    statusServer.textContent = data.status || 'online';
    const rootLabel = (data.workspace || '').split('\\').pop() || 'Projeto';
    statusProject.textContent = rootLabel;
  } catch (error) {
    statusText.textContent = 'offline';
    rootPath.textContent = 'Não foi possível carregar o espaço de trabalho';
    statusServer.textContent = 'offline';
  }
}

function renderTopList(container, items = []) {
  if (!container) return;
  container.innerHTML = '';
  if (!Array.isArray(items) || items.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Sem dados';
    container.appendChild(li);
    return;
  }
  items.forEach((item) => {
    const li = document.createElement('li');
    const size = formatExplorerSize(item.size || 0);
    li.textContent = `${item.path || '-'} (${size})`;
    container.appendChild(li);
  });
}

function renderHealthReport(report) {
  if (!report) return;
  const workspace = report.workspace || {};
  const folders = report.folders || {};
  const disk = report.disk || null;
  const health = report.health || { label: '🟢 Saudável', alerts: [] };

  if (healthDiskUsage) {
    if (disk && Number.isFinite(disk.usedBytes) && Number.isFinite(disk.totalBytes)) {
      healthDiskUsage.textContent = `${formatExplorerSize(disk.usedBytes)} / ${formatExplorerSize(disk.totalBytes)} (${disk.usedPercent || 0}%)`;
    } else {
      healthDiskUsage.textContent = 'Não disponível';
    }
  }

  if (healthWorkspaceUsage) {
    healthWorkspaceUsage.textContent = formatExplorerSize(workspace.totalBytes || 0);
  }
  if (healthTempUsage) {
    healthTempUsage.textContent = formatExplorerSize(folders.temp?.bytes || 0);
  }
  if (healthLogsUsage) {
    healthLogsUsage.textContent = formatExplorerSize(folders.logs?.bytes || 0);
  }
  if (healthCacheUsage) {
    healthCacheUsage.textContent = formatExplorerSize(folders.cache?.bytes || 0);
  }
  if (healthBackupsUsage) {
    healthBackupsUsage.textContent = formatExplorerSize(folders.backups?.bytes || 0);
  }
  if (healthWorkspaceFolderUsage) {
    healthWorkspaceFolderUsage.textContent = formatExplorerSize(folders.workspace?.bytes || 0);
  }
  if (healthProjectsUsage) {
    healthProjectsUsage.textContent = formatExplorerSize(folders.projetos?.bytes || 0);
  }
  if (healthFileCount) {
    healthFileCount.textContent = String(workspace.fileCount || 0);
  }
  if (healthZipCount) {
    healthZipCount.textContent = String(workspace.zipCount || 0);
  }
  if (healthTemporaryCount) {
    healthTemporaryCount.textContent = String(workspace.temporaryCount || 0);
  }
  if (healthStatus) {
    healthStatus.textContent = health.label || '🟢 Saudável';
  }

  renderTopList(healthTopFiles, report.topFiles || []);
  renderTopList(healthTopFolders, report.topFolders || []);

  if (healthAlerts) {
    const alerts = Array.isArray(health.alerts) ? health.alerts : [];
    healthAlerts.textContent = alerts.length ? alerts.join(' ') : 'Sem alertas no momento.';
  }
}

async function loadStorageHealth(force = false) {
  try {
    const response = await fetchJson(`/api/storage/report?force=${force ? 'true' : 'false'}`);
    if (!response.success) {
      if (healthAlerts) healthAlerts.textContent = response.error || 'Falha ao obter saúde do workspace.';
      return;
    }
    renderHealthReport(response.report);
  } catch (error) {
    if (healthAlerts) healthAlerts.textContent = 'Falha ao obter saúde do workspace.';
  }
}

async function runSmartCleanup() {
  if (!smartCleanupButton) return;
  smartCleanupButton.disabled = true;
  const previousLabel = smartCleanupButton.textContent;
  smartCleanupButton.textContent = 'Analisando...';
  try {
    const includeBackups = Boolean(cleanupIncludeBackups?.checked);
    const response = await fetchJson(`/api/storage/cleanup/preview?includeBackups=${includeBackups ? 'true' : 'false'}`);
    if (!response.success) {
      if (healthAlerts) healthAlerts.textContent = response.error || 'Não foi possível analisar a limpeza inteligente.';
      return;
    }
    currentCleanupPreview = response.preview;
    cleanupPreviewPanel.hidden = false;
    cleanupPreviewSummary.textContent = `Quantidade: ${response.preview.totalCount} · Espaço ocupado: ${formatExplorerSize(response.preview.reclaimableBytes)} · Espaço que será recuperado: ${formatExplorerSize(response.preview.reclaimableBytes)}`;
    cleanupPreviewCategories.innerHTML = response.preview.categories.map((category) => `
      <details ${category.count ? 'open' : ''}>
        <summary>${escapeHtml(category.name)} · ${category.count} item(ns) · ${formatExplorerSize(category.bytes)}${category.optional ? ' · opcional' : ''}</summary>
        <ul>${category.items.map((item) => `<li>${escapeHtml(item.path)} · ${formatExplorerSize(item.bytes)}</li>`).join('') || '<li>Nenhum item.</li>'}</ul>
      </details>`).join('');
  } catch (error) {
    if (healthAlerts) healthAlerts.textContent = 'Não foi possível analisar a limpeza inteligente.';
  } finally {
    smartCleanupButton.disabled = false;
    smartCleanupButton.textContent = previousLabel;
  }
}

async function applySmartCleanup() {
  if (!currentCleanupPreview) return;
  const includeBackups = Boolean(cleanupIncludeBackups?.checked);
  if (!confirm(`Remover exatamente ${currentCleanupPreview.totalCount} item(ns) e recuperar ${formatExplorerSize(currentCleanupPreview.reclaimableBytes)}?`)) return;
  if (includeBackups && !confirm('CONFIRMAÇÃO DE BACKUPS: excluir também os backups antigos listados? Esta ação exige confirmação específica.')) return;
  confirmSmartCleanup.disabled = true;
  try {
    const response = await fetchJson('/api/storage/cleanup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ includeBackups, confirmBackups: includeBackups }) });
    if (!response.success) throw new Error(response.error || 'Limpeza não concluída.');
    healthAlerts.textContent = `Limpeza concluída. Removidos: ${response.cleanup.removedCount}. Espaço recuperado: ${formatExplorerSize(response.cleanup.reclaimedBytes)}.`;
    cleanupPreviewPanel.hidden = true;currentCleanupPreview = null;
    await loadStorageHealth(true);await loadProjectTree();await listFolder(currentDirectory || '');
  } catch (error) { healthAlerts.textContent = error.message || 'Limpeza não concluída.'; }
  finally { confirmSmartCleanup.disabled = false; }
}

function getProviderLabel(provider) {
  return provider?.name || provider?.id || 'Provider';
}

function getSelectedAiProvider() {
  if (!aiManagerConfig || !aiManagerConfig.providers || !aiProviderSelect) return null;
  const id = aiProviderSelect.value || aiManagerConfig.activeProvider;
  return aiManagerConfig.providers[id] || null;
}

function renderAiManager() {
  if (!aiProviderSelect || !aiManagerConfig) return;
  const providers = aiManagerConfig.providers || {};

  aiProviderSelect.innerHTML = '';
  Object.values(providers).forEach((provider) => {
    const option = document.createElement('option');
    option.value = provider.id;
    option.textContent = getProviderLabel(provider);
    if (provider.id === aiManagerConfig.activeProvider) {
      option.selected = true;
    }
    aiProviderSelect.appendChild(option);
  });
  if (!providers.openrouter) {
    const option = document.createElement('option');option.value = 'openrouter';option.textContent = 'OpenRouter (preparado)';option.disabled = true;aiProviderSelect.appendChild(option);
  }

  const selected = getSelectedAiProvider();
  if (!selected) return;
  aiProviderStatus.value = selected.status || 'unknown';
  aiProviderModel.value = selected.model || '';
  aiProviderApiKey.value = '';
  aiProviderMaskHint.textContent = selected.hasApiKey
    ? `Chave atual: ${selected.apiKeyMasked || 'configurada'}`
    : 'Sem chave configurada.';
  if (aiConnectionIndicator) {
    const connected = selected.status === 'ready' && aiProvidersTestedThisSession.has(selected.id);
    aiConnectionIndicator.textContent = connected ? '● Conectado' : selected.status === 'error' ? '● Erro de conexão' : '● Não testado nesta sessão';
    aiConnectionIndicator.dataset.status = connected ? 'connected' : selected.status === 'error' ? 'error' : 'idle';
  }
  if (chatModel) {
    chatModel.innerHTML = `<option value="${escapeHtml(selected.model || '')}">${escapeHtml(selected.model || getProviderLabel(selected))}</option>`;
  }
}

async function loadAiManagerConfig() {
  if (!aiManagerMessage) return;
  try {
    const response = await fetchJson('/api/ai-manager/config');
    if (!response.success) {
      aiManagerMessage.textContent = response.error || 'Não foi possível carregar o AI Manager.';
      return;
    }
    aiManagerConfig = response.config;
    if (response.result?.success) aiProvidersTestedThisSession.add(selected.id);
    renderAiManager();
    aiManagerMessage.textContent = '';
  } catch (error) {
    aiManagerMessage.textContent = 'Não foi possível carregar o AI Manager.';
  }
}

async function saveAiManagerConfig() {
  const selected = getSelectedAiProvider();
  if (!selected) return;
  aiSaveButton.disabled = true;
  aiManagerMessage.textContent = 'Salvando configuração...';
  try {
    const response = await fetchJson('/api/ai-manager/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        providerId: selected.id,
        model: aiProviderModel.value.trim(),
        apiKey: aiProviderApiKey.value,
        active: true,
      }),
    });
    if (!response.success) {
      aiManagerMessage.textContent = response.error || 'Não foi possível salvar configuração.';
      return;
    }
    aiManagerConfig = response.config;
    renderAiManager();
    aiManagerMessage.textContent = `Provider ativo salvo: ${getProviderLabel(selected)}.`;
  } catch (error) {
    aiManagerMessage.textContent = 'Não foi possível salvar configuração.';
  } finally {
    aiSaveButton.disabled = false;
  }
}

async function testAiManagerProvider() {
  const selected = getSelectedAiProvider();
  if (!selected) return;

  aiTestButton.disabled = true;
  aiManagerMessage.textContent = 'Testando provider...';
  const testStartedAt = performance.now();
  try {
    {
      const saveResponse = await fetchJson('/api/ai-manager/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: selected.id,
          model: aiProviderModel.value.trim(),
          apiKey: aiProviderApiKey.value,
          active: true,
        }),
      });
      if (!saveResponse.success) {
        aiManagerMessage.textContent = saveResponse.error || 'Não foi possível preparar o teste.';
        return;
      }
      aiManagerConfig = saveResponse.config;
      renderAiManager();
    }

    const response = await fetchJson('/api/ai-manager/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId: selected.id }),
    });
    if (!response.success) {
      aiManagerMessage.textContent = response.error || 'Falha no teste de provider.';
      return;
    }
    aiManagerConfig = response.config;
    renderAiManager();
    aiManagerMessage.textContent = response.result?.message || 'Teste executado.';
    if (aiResponseTime) aiResponseTime.textContent = `Tempo de resposta: ${Math.round(performance.now() - testStartedAt)} ms`;
  } catch (error) {
    aiManagerMessage.textContent = 'Falha no teste de provider.';
    if (aiResponseTime) aiResponseTime.textContent = `Tempo de resposta: ${Math.round(performance.now() - testStartedAt)} ms`;
  } finally {
    aiTestButton.disabled = false;
  }
}

function savePreferencesLocal() {
  localStorage.setItem('fallah.preferences.v11', JSON.stringify(uiPreferences));
}

function loadPreferencesLocal() {
  try {
    const raw = localStorage.getItem('fallah.preferences.v11');
    if (!raw) return;
    const data = JSON.parse(raw);
    Object.assign(uiPreferences, data || {});
  } catch (error) {
    console.warn('Não foi possível carregar preferências locais.', error);
  }
}

function applyUiPreferences() {
  document.body.dataset.theme = uiPreferences.tema === 'claro' ? 'claro' : 'escuro';
  document.documentElement.style.setProperty('--font-size-ui', `${Number(uiPreferences.fonte || 14)}px`);
  document.documentElement.style.setProperty('--density-tree', `${Number(uiPreferences.compactacaoArvore || 18)}px`);
  document.documentElement.style.zoom = `${Number(uiPreferences.zoom || 100) / 100}`;

  if (editor) {
    monaco.editor.setTheme(uiPreferences.tema === 'claro' ? 'vs' : 'vs-dark');
    editor.updateOptions({ fontSize: Number(uiPreferences.fonte || 14) });
  }
}

function syncPreferencesForm() {
  prefTheme.value = uiPreferences.tema;
  prefIconSet.value = uiPreferences.icones;
  prefFontSize.value = String(uiPreferences.fonte);
  prefZoom.value = String(uiPreferences.zoom);
  prefTreeCompact.value = String(uiPreferences.compactacaoArvore);
  prefConfirmDelete.checked = Boolean(uiPreferences.confirmarExclusao);
  prefShowHints.checked = Boolean(uiPreferences.mostrarDicas);
  prefScannerAuto.value = String(uiPreferences.scannerAutoSegundos || 0);
}

function startScannerAutoRefresh(seconds) {
  if (scannerAutoTimer) {
    clearInterval(scannerAutoTimer);
    scannerAutoTimer = null;
  }
  if (!seconds || Number(seconds) <= 0) {
    return;
  }
  scannerAutoTimer = setInterval(() => {
    refreshScannerState();
  }, Number(seconds) * 1000);
}

function updateGlobalClock() {
  statusClock.textContent = new Date().toLocaleTimeString('pt-BR');
}

function updateRuntimeStats() {
  if (performance && performance.memory && performance.memory.usedJSHeapSize) {
    const usedMb = performance.memory.usedJSHeapSize / (1024 * 1024);
    statusMemory.textContent = `${usedMb.toFixed(1)} MB`;
  } else {
    statusMemory.textContent = 'Não disponível';
  }
  const now = performance.now();
  const delta = now - cpuSampleStart;
  cpuSampleStart = now;
  const utilization = Math.max(1, Math.min(99, Math.round(1000 / Math.max(delta, 1) * 12)));
  statusCpu.textContent = `${utilization}%`;
}

function getNodeIconClass(node) {
  if (node.type === 'directory') {
    const lower = (node.name || '').toLowerCase();
    if (lower === 'src') return 'ri-folder-code-line';
    if (lower === 'docs') return 'ri-folder-info-line';
    if (lower.includes('test')) return 'ri-folder-chart-line';
    if (lower.includes('asset') || lower.includes('img') || lower.includes('image')) return 'ri-folder-image-line';
    return 'ri-folder-3-line';
  }
  const extension = (node.name || '').split('.').pop().toLowerCase();
  const map = {
    js: 'ri-javascript-line',
    ts: 'ri-file-code-line',
    jsx: 'ri-reactjs-line',
    tsx: 'ri-reactjs-line',
    json: 'ri-braces-line',
    md: 'ri-markdown-line',
    html: 'ri-html5-line',
    css: 'ri-css3-line',
    png: 'ri-image-2-line',
    jpg: 'ri-image-2-line',
    jpeg: 'ri-image-2-line',
    webp: 'ri-image-2-line',
    gif: 'ri-image-2-line',
    zip: 'ri-file-zip-line',
    pdf: 'ri-file-pdf-2-line',
    yml: 'ri-settings-3-line',
    yaml: 'ri-settings-3-line',
    txt: 'ri-file-text-line',
    sh: 'ri-terminal-box-line',
    ps1: 'ri-terminal-box-line',
  };
  return map[extension] || 'ri-file-line';
}

function getTreeIcon(node) {
  const iconClass = getNodeIconClass(node);
  return `<i class="${iconClass}" aria-hidden="true"></i>`;
}

function updateGlobalExplorerCounters(items = []) {
  const files = items.filter((item) => item.type === 'file').length;
  const folders = items.filter((item) => item.type === 'directory').length;
  statusFiles.textContent = String(files);
  statusFolders.textContent = String(folders);
  statusCurrentFolder.textContent = currentDirectory || '/';
}

function getSelectedExplorerNode() {
  if (!filteredListing || filteredListing.length === 0) return null;
  const first = [...selectedExplorerPaths][0] || selectedPath;
  if (!first) return null;
  return filteredListing.find((item) => item.path === first) || null;
}

function setChatRuntimeStatus(text) {
  statusAi.textContent = text;
}

function renderExplorerProperties(node, listing = []) {
  if (!explorerPropertiesBody) return;
  if (!node) {
    explorerPropertiesBody.innerHTML = '<p class="muted">Selecione um item para visualizar detalhes.</p>';
    return;
  }

  const owner = node.owner || 'Não disponível';
  const tags = node.tags || 'Sem tags';
  const noteKey = node.path || node.name;
  const savedNote = nodeNotes.get(noteKey) || '';
  const isFavorite = favorites.has(node.path || '');
  const filesCount = node.type === 'directory' ? (node.totalFiles ?? node.childFileCount ?? listing.filter((entry) => entry.type === 'file').length) : '-';
  const dirsCount = node.type === 'directory' ? (node.totalDirectories ?? node.childDirectoryCount ?? listing.filter((entry) => entry.type === 'directory').length) : '-';

  explorerPropertiesBody.innerHTML = `
    <div class="properties-icon">${getTreeIcon(node)}</div>
    <div class="properties-row"><strong>Nome</strong><span>${escapeHtml(node.name || '-')}</span></div>
    <div class="properties-row"><strong>Tipo</strong><span>${node.type === 'directory' ? 'Pasta' : 'Arquivo'}</span></div>
    <div class="properties-row"><strong>Caminho</strong><span>${escapeHtml(node.path || '-')}</span></div>
    <div class="properties-row"><strong>Tamanho</strong><span>${formatExplorerSize(node.size || 0)}</span></div>
    <div class="properties-row"><strong>Criação</strong><span>${formatExplorerDate(node.createdAt)}</span></div>
    <div class="properties-row"><strong>Alteração</strong><span>${formatExplorerDate(node.modifiedAt)}</span></div>
    <div class="properties-row"><strong>Permissões</strong><span>${escapeHtml(node.permissions || 'Não disponível')}</span></div>
    <div class="properties-row"><strong>Proprietário</strong><span>${escapeHtml(owner)}</span></div>
    <div class="properties-row"><strong>Arquivos</strong><span>${filesCount}</span></div>
    <div class="properties-row"><strong>Subpastas</strong><span>${dirsCount}</span></div>
    <div class="properties-row"><strong>Favorito</strong><span>${isFavorite ? 'Sim' : 'Não'}</span></div>
    <div class="properties-row"><strong>Tags</strong><span>${escapeHtml(tags)}</span></div>
    <div class="form-row">
      <label for="explorerNodeNote">Observações</label>
      <textarea id="explorerNodeNote" rows="3" placeholder="Registrar observações do item">${escapeHtml(savedNote)}</textarea>
    </div>
    <div class="properties-quick-actions">
      <button type="button" id="propOpen"><i class="ri-folder-open-line"></i><span>Abrir</span></button>
      <button type="button" id="propRename"><i class="ri-edit-2-line"></i><span>Renomear</span></button>
      <button type="button" id="propFavorite"><i class="ri-star-line"></i><span>${isFavorite ? 'Desfavoritar' : 'Favoritar'}</span></button>
      <button type="button" id="propDelete"><i class="ri-delete-bin-line"></i><span>Excluir</span></button>
    </div>
  `;

  const noteField = document.getElementById('explorerNodeNote');
  if (noteField) {
    noteField.addEventListener('input', () => {
      nodeNotes.set(noteKey, noteField.value);
    });
  }
  document.getElementById('propOpen')?.addEventListener('click', () => openNode(node));
  document.getElementById('propRename')?.addEventListener('click', () => promptRename(node));
  document.getElementById('propFavorite')?.addEventListener('click', () => toggleFavorite(node.path));
  document.getElementById('propDelete')?.addEventListener('click', () => promptDelete(node));
}

async function loadAssistantModules() {
  if (!assistantModuleCards) return;
  assistantModuleCards.innerHTML = '<div class="message">Carregando módulos...</div>';
  try {
    const response = await fetchJson('/api/assistant/modules');
    if (!response.success) {
      assistantModuleCards.innerHTML = `<div class="message">${escapeHtml(response.error || 'Não foi possível carregar os módulos.')}</div>`;
      return;
    }
    assistantModules = (Array.isArray(response.modules) ? response.modules : []).filter((module) => ['discovery-engine', 'arbitrage-engine'].includes(module.id)).map((module) => module.id === 'discovery-engine' ? { ...module, name: 'CASAS & DISCOVERY', description: 'Cadastro de casas, descoberta de fontes, validação e preparação da coleta.' } : module);
    renderAssistantModules();
  } catch (error) {
    assistantModuleCards.innerHTML = '<div class="message">Não foi possível carregar os módulos.</div>';
  }
}

function renderAssistantModules() {
  assistantModuleCards.innerHTML = '';
  if (!assistantModules.length) {
    assistantModuleCards.innerHTML = '<div class="message">Nenhum módulo instalado.</div>';
    assistantSelectedModuleId = null;
    return;
  }
  const hasSelected = assistantModules.some((module) => module.id === assistantSelectedModuleId);
  if (!hasSelected) {
    const primary = assistantModules.find((module) => module.primary);
    assistantSelectedModuleId = (primary || assistantModules[0]).id;
  }
  assistantModules.forEach((module) => {
    const card = document.createElement('article');
    card.className = `assistant-card ${module.id === assistantSelectedModuleId ? 'active' : ''}`;
    card.dataset.moduleId = module.id;
    card.innerHTML = `
      <i class="${escapeHtml(module.icon || 'ri-puzzle-line')}" aria-hidden="true"></i>
      <span class="title">${escapeHtml(module.name)}${module.primary ? ' · PRINCIPAL' : ''}</span>
      <span class="desc">${escapeHtml(module.description || '')}</span>
      <span class="desc"><strong>Status:</strong> ${escapeHtml(module.status)} · <strong>Versão:</strong> ${escapeHtml(module.version)} · <strong>${escapeHtml(module.installedLabel)}</strong></span>
      <span class="actions-row">
        <button type="button" data-module-action="update" ${!module.actions?.update ? 'disabled' : ''}>Atualizar</button>
        <button type="button" data-module-action="uninstall" ${!module.actions?.uninstall ? 'disabled' : ''}>Desinstalar</button>
        <button type="button" data-module-action="configure" ${!module.actions?.configure ? 'disabled' : ''}>Configurar</button>
      </span>
    `;
    card.addEventListener('click', () => selectAssistantModule(module.id));
    card.querySelectorAll('[data-module-action]').forEach((button) => button.addEventListener('click', (event) => {
      event.stopPropagation();
      selectAssistantModule(module.id);
      handleAssistantModuleAction(module, button.dataset.moduleAction);
    }));
    assistantModuleCards.appendChild(card);
  });
}

function selectAssistantModule(moduleId) {
  assistantSelectedModuleId = moduleId;
  assistantModuleCards.querySelectorAll('.assistant-card').forEach((card) => {
    card.classList.toggle('active', card.dataset.moduleId === moduleId);
  });
}

async function handleAssistantModuleAction(module, action) {
  if (action === 'configure') {
    assistantModuleTitle.textContent = module.name;
    if (module.id === 'discovery-engine') {
      await renderDiscoveryConfiguration();
      return;
    }
    if (['reader-generator', 'normalizer', 'arbitrage-engine', 'robot-connector'].includes(module.id)) {
      await renderPipelineConfiguration(module.id);
      return;
    }
    assistantModuleDetails.innerHTML = module.areas?.length
      ? `<strong>Estrutura preparada:</strong><br>${module.areas.map((area) => `• ${escapeHtml(area)}`).join('<br>')}`
      : 'Módulo instalado. Nenhuma configuração adicional obrigatória nesta versão.';
    assistantResult.textContent = 'Configuração estrutural carregada.';
    return;
  }
  if (action === 'uninstall' && !confirm(`Desinstalar o módulo ${module.name}?`)) return;
  assistantResult.textContent = action === 'update' ? 'Verificando atualização...' : 'Desinstalando módulo...';
  try {
    const response = await fetchJson(`/api/assistant/modules/${encodeURIComponent(module.id)}/${action}`, {
      method: 'POST',
    });
    assistantResult.textContent = response.success ? `Ação concluída em ${module.name}.` : response.error;
    if (response.success) await loadAssistantModules();
  } catch (error) {
    assistantResult.textContent = error.message || 'Ação não concluída.';
  }
}

let homologationRefreshToken = 0;
async function renderPipelineConfiguration(moduleId) {
  if (pipelineAuditRefreshTimer) {
    clearTimeout(pipelineAuditRefreshTimer);
    pipelineAuditRefreshTimer = null;
  }
  assistantModuleDetails.innerHTML = '<div id="pipelineConfiguration" class="message">Carregando pipeline...</div>';
  const response = await fetchJson('/api/pipeline/status');const pipeline = response.pipeline || {};const readers = pipeline.readers || [];
  const target = document.getElementById('pipelineConfiguration');
  if (moduleId === 'reader-generator') {
    target.innerHTML = `<span class="actions-row"><button type="button" id="pipelineGenerateReaders">Gerar Readers dos Profiles</button><button type="button" id="pipelineExportCommissions">Exportar Comissões</button><button type="button" id="pipelineImportCommissions">Importar Comissões</button></span><input id="pipelineCommissionFile" type="file" accept="application/json,.json" hidden><div>${readers.length ? readers.map((reader) => `<article class="assistant-card"><span class="title">${escapeHtml(reader.houseName || reader.id)}</span><span class="desc"><strong>Status:</strong> ${escapeHtml(reader.runtime?.status || 'waiting')} · <strong>Endpoints:</strong> ${reader.endpoints?.length || 0} · <strong>Ciclos:</strong> ${reader.runtime?.cycles || 0} · <strong>Erros:</strong> ${reader.runtime?.errors || 0} · <strong>Retry:</strong> ${reader.runtime?.retries || 0}</span><span class="actions-row"><button type="button" data-reader-active="${reader.active ? 'false' : 'true'}" data-reader-id="${escapeHtml(reader.id)}">${reader.active ? 'Desativar' : 'Ativar'}</button><button type="button" data-reader-run="true" data-reader-id="${escapeHtml(reader.id)}">Executar agora</button><label>Comissão %<input type="number" min="0" max="100" step="0.01" data-commission-house="${escapeHtml(reader.houseId)}"></label><button type="button" data-save-commission="${escapeHtml(reader.houseId)}">Salvar comissão</button></span></article>`).join('') : '<div class="message">Nenhum Profile disponível para gerar Readers.</div>'}</div>`;
    document.getElementById('pipelineGenerateReaders').addEventListener('click', async () => { const result = await fetchJson('/api/pipeline/readers/generate', { method: 'POST' });assistantResult.textContent = result.success ? `${result.readers.length} Reader(s) gerado(s).` : result.error;await renderPipelineConfiguration(moduleId); });
    document.getElementById('pipelineExportCommissions').addEventListener('click', () => { window.location.href = '/api/pipeline/commissions/export'; });
    document.getElementById('pipelineImportCommissions').addEventListener('click', () => document.getElementById('pipelineCommissionFile').click());
    document.getElementById('pipelineCommissionFile').addEventListener('change', importPipelineCommissions);
    target.querySelectorAll('[data-reader-active]').forEach((button) => button.addEventListener('click', async () => { await fetchJson(`/api/pipeline/readers/${encodeURIComponent(button.dataset.readerId)}/active`, { method: 'PATCH', body: JSON.stringify({ active: button.dataset.readerActive === 'true' }) });await renderPipelineConfiguration(moduleId); }));
    target.querySelectorAll('[data-reader-run]').forEach((button) => button.addEventListener('click', async () => { assistantResult.textContent = 'Reader em execução...';const result = await fetchJson(`/api/pipeline/readers/${encodeURIComponent(button.dataset.readerId)}/run`, { method: 'POST' });assistantResult.textContent = result.success ? 'Reader executado.' : result.error;await renderPipelineConfiguration(moduleId); }));
    target.querySelectorAll('[data-save-commission]').forEach((button) => button.addEventListener('click', async () => { const input = target.querySelector(`[data-commission-house="${button.dataset.saveCommission}"]`);const result = await fetchJson(`/api/pipeline/commissions/${encodeURIComponent(button.dataset.saveCommission)}`, { method: 'PATCH', body: JSON.stringify({ rate: Number(input.value), active: true }) });assistantResult.textContent = result.success ? 'Comissão salva.' : result.error; }));
  } else if (moduleId === 'normalizer') {
    target.innerHTML = `
      <div id="pipelineAuditPanel" class="pipeline-audit-panel">
        <div class="pipeline-audit-filters">
          <label>Casa<select id="pipelineAuditHouse"></select></label>
          <label>Data<select id="pipelineAuditDay"><option value="all">Hoje + Amanhã</option><option value="today">Hoje</option><option value="tomorrow">Amanhã</option></select></label>
          <label>Esporte<select id="pipelineAuditSport"><option value="">Todos</option></select></label>
          <label>Competição<select id="pipelineAuditCompetition"><option value="">Todas</option></select></label>
          <label>Status<select id="pipelineAuditStatus"><option value="all">Todos</option><option value="open">Open</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="closed">Closed</option></select></label>
          <label>Fresh/Stale<select id="pipelineAuditFresh"><option value="all">Todos</option><option value="fresh">Fresh</option><option value="stale">Stale</option></select></label>
          <label>Buscar Evento<input id="pipelineAuditEventSearch" placeholder="Nome do evento"></label>
          <span class="actions-row"><button type="button" id="pipelineAuditApply">Aplicar</button><button type="button" id="pipelineAuditExport">Exportar Auditoria</button></span>
        </div>
        <div id="pipelineAuditMeta" class="message">Carregando painel de auditoria...</div>
        <div id="pipelineAuditHouseCards" class="pipeline-audit-house-cards"></div>
        <div id="pipelineAuditSummary" class="pipeline-audit-summary"></div>
        <div id="pipelineAuditConsistency" class="pipeline-audit-consistency"></div>
        <div id="pipelineAuditEvents" class="pipeline-audit-events"></div>
        <div id="pipelineAuditEventDetail" class="pipeline-audit-event-detail"></div>
      </div>`;
    document.getElementById('pipelineAuditApply').addEventListener('click', async () => {
      pipelineAuditState.page = 1;
      await renderPipelineAuditPanel();
    });
    document.getElementById('pipelineAuditExport').addEventListener('click', exportPipelineAudit);
    document.getElementById('pipelineAuditEventSearch').addEventListener('keydown', async (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        pipelineAuditState.page = 1;
        await renderPipelineAuditPanel();
      }
    });
    await renderPipelineAuditPanel();
  } else if (moduleId === 'arbitrage-engine') {
    target.innerHTML = `<span class="actions-row"><button type="button" id="homologationRun">Executar homologação</button><button type="button" id="homologationImportOddsAgora">Importar OddsAgora</button><button type="button" data-homologation-export="json">JSON</button><button type="button" data-homologation-export="csv">CSV</button><button type="button" data-homologation-export="logs">Logs completos</button><button type="button" data-homologation-export="report">Relatório</button></span><input id="homologationOddsAgoraFile" type="file" accept="application/json,.json,text/csv,.csv" hidden><div id="homologationLive">Carregando diagnóstico operacional...</div>`;
    document.getElementById('homologationRun').addEventListener('click', async () => { assistantResult.textContent = 'Homologação e stress em execução...';const result = await fetchJson('/api/homologation/run', { method: 'POST' });assistantResult.textContent = result.success ? `Homologação concluída: ${result.report.status}` : result.error;await refreshHomologationPanel(++homologationRefreshToken); });
    document.getElementById('homologationImportOddsAgora').addEventListener('click', () => document.getElementById('homologationOddsAgoraFile').click());
    document.getElementById('homologationOddsAgoraFile').addEventListener('change', importOddsAgoraSnapshot);
    target.querySelectorAll('[data-homologation-export]').forEach((button) => button.addEventListener('click', () => { window.location.href = `/api/homologation/export/${button.dataset.homologationExport}`; }));
    const token = ++homologationRefreshToken;refreshHomologationPanel(token);
  } else {
    target.innerHTML = `<strong>Robot Connector preparado</strong><br>Canal: ${escapeHtml(pipeline.robot?.channel || 'engine-data')}<br>Schema: ${escapeHtml(pipeline.robot?.dataSchema || 'fallah.engine-data-item/v1')}<br>Local: ${pipeline.robot?.localOnly ? 'Sim' : 'Não'}<br>Persistente: ${pipeline.robot?.persistent ? 'Sim' : 'Não'}<br>HTML: Bloqueado<br>DOM: Bloqueado<br>JSON bruto: Bloqueado<br>Automação de apostas: Desativada`;
  }
  assistantResult.textContent = 'Arbitrage Data Pipeline operacional.';
}

async function refreshHomologationPanel(token) {
  const live = document.getElementById('homologationLive');if (!live || token !== homologationRefreshToken) return;
  try { const response = await fetchJson('/api/homologation/status');const report = response.report || {};const diagnostic = report.diagnostics || {};const audit = report.dataAudit || {};const accepted = report.arbitrageAudit?.accepted || [];const rejected = report.arbitrageAudit?.rejected || [];const issues = ['eventDuplicates', 'marketDuplicates', 'selectionDuplicates', 'invalidOdds', 'frozenOdds', 'orphanEvents', 'orphanMarkets', 'orphanSelections', 'readersWithoutUpdate', 'housesWithoutResponse'].reduce((sum, key) => sum + (audit[key]?.length || 0), 0);live.innerHTML = `<article class="assistant-card"><span class="title">Status: ${escapeHtml(report.status || '—')}</span><span class="desc">Casas conectadas: ${diagnostic.connectedHouses || 0} · Readers ativos: ${diagnostic.activeReaders || 0} · Readers com erro: ${diagnostic.readersWithError || 0} · Pipeline: ${escapeHtml(diagnostic.pipelineStatus || '—')}</span><span class="desc">Eventos: ${diagnostic.events || 0} · Mercados: ${diagnostic.markets || 0} · Seleções: ${diagnostic.selections || 0} · Odds: ${diagnostic.odds || 0}</span><span class="desc">Resposta: ${diagnostic.responseTimeMs || 0}ms · Latência: ${diagnostic.latencyMs || 0}ms · CPU: ${diagnostic.cpuPercent || 0}% · Memória: ${Math.round((diagnostic.memory?.rssBytes || 0) / 1048576)} MB · Filas: ${diagnostic.queues?.readerTimers || 0}</span><span class="desc">Última atualização: ${escapeHtml(diagnostic.lastUpdateAt || '—')} · Problemas de dados: ${issues}</span></article><article class="assistant-card"><span class="title">Arbitrage Engine</span><span class="desc">Oportunidades validadas: ${accepted.length} · Registros rejeitados: ${rejected.length}</span>${accepted.map((item) => `<span class="desc"><strong>${escapeHtml(item.event?.key || '')}</strong> · ${escapeHtml(item.market?.type || '')}<br>Seleções: ${escapeHtml((item.selections || []).join(', '))}<br>Casas: ${escapeHtml((item.houses || []).join(', '))}<br>Odds: ${escapeHtml((item.odds || []).join(', '))} · Comissões: ${escapeHtml((item.commissions || []).join(', '))}<br>Stakes: ${escapeHtml((item.stakes || []).join(', '))} · Lucro bruto: ${item.grossProfit || 0} · Lucro líquido: ${item.netProfit || 0} · ROI: ${item.roi || 0}%<br>Validação: ${escapeHtml(item.validationReason || '')}</span>`).join('')}${rejected.slice(0, 20).map((item) => `<span class="desc">Rejeitada: ${escapeHtml(item.event || '')} · ${escapeHtml(item.market || '')} · ${escapeHtml((item.reasons || []).join(', '))}</span>`).join('')}</article><article class="assistant-card"><span class="title">Comparador OddsAgora</span><span class="desc">Status: ${escapeHtml(report.oddsAgora?.status || '—')} · Coincidência: ${report.oddsAgora?.matchPercent ?? '—'}%</span><span class="desc">Eventos FALLAH/OddsAgora: ${report.oddsAgora?.events ? `${report.oddsAgora.events.fallah}/${report.oddsAgora.events.oddsAgora}` : '—'} · Mercados: ${report.oddsAgora?.markets ? `${report.oddsAgora.markets.fallah}/${report.oddsAgora.markets.oddsAgora}` : '—'} · Oportunidades: ${report.oddsAgora?.opportunities ? `${report.oddsAgora.opportunities.fallah}/${report.oddsAgora.opportunities.oddsAgora}` : '—'}</span></article>`; } catch (error) { live.textContent = error.message || 'Diagnóstico indisponível.'; }
  if (document.getElementById('homologationLive') && token === homologationRefreshToken) setTimeout(() => refreshHomologationPanel(token), 2000);
}

async function importOddsAgoraSnapshot(event) { const file = event.target.files?.[0];if (!file) return;try { const text = await file.text();const body = file.name.toLowerCase().endsWith('.csv') ? { text } : { dataset: JSON.parse(text) };const response = await fetchJson('/api/homologation/oddsagora/import', { method: 'POST', body: JSON.stringify(body) });assistantResult.textContent = response.success ? `Snapshot OddsAgora importado: ${response.imported.events} eventos.` : response.error;await refreshHomologationPanel(++homologationRefreshToken); } catch (error) { assistantResult.textContent = error.message || 'Snapshot inválido.'; }event.target.value = ''; }

async function importPipelineCommissions(event) {
  const file = event.target.files?.[0];if (!file) return;
  try { const commissions = JSON.parse(await file.text());const result = await fetchJson('/api/pipeline/commissions/import', { method: 'POST', body: JSON.stringify({ commissions }) });assistantResult.textContent = result.success ? 'Comissões importadas.' : result.error; } catch (error) { assistantResult.textContent = error.message || 'Arquivo inválido.'; }
  event.target.value = '';
}

function pipelineAuditQuery() {
  const params = new URLSearchParams();
  Object.entries(pipelineAuditState).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    params.set(key, String(value));
  });
  return params.toString();
}

function pipelineAuditSyncFiltersFromDom() {
  const house = document.getElementById('pipelineAuditHouse');
  const day = document.getElementById('pipelineAuditDay');
  const sport = document.getElementById('pipelineAuditSport');
  const competition = document.getElementById('pipelineAuditCompetition');
  const status = document.getElementById('pipelineAuditStatus');
  const fresh = document.getElementById('pipelineAuditFresh');
  const eventSearch = document.getElementById('pipelineAuditEventSearch');
  pipelineAuditState.houseId = house?.value || '';
  pipelineAuditState.day = day?.value || 'all';
  pipelineAuditState.sport = sport?.value || '';
  pipelineAuditState.competition = competition?.value || '';
  pipelineAuditState.status = status?.value || 'all';
  pipelineAuditState.fresh = fresh?.value || 'all';
  pipelineAuditState.event = eventSearch?.value?.trim() || '';
}

function pipelineAuditRenderFilters(panel) {
  const houseSelect = document.getElementById('pipelineAuditHouse');
  const sportSelect = document.getElementById('pipelineAuditSport');
  const competitionSelect = document.getElementById('pipelineAuditCompetition');
  if (!houseSelect || !panel) return;

  const houses = panel.houses || [];
  const previousHouse = pipelineAuditState.houseId || panel.selectedHouseId || houses[0]?.houseId || '';
  houseSelect.innerHTML = houses.map((house) => `<option value="${escapeHtml(house.houseId)}">${escapeHtml(house.house)}</option>`).join('');
  houseSelect.value = houses.some((house) => house.houseId === previousHouse) ? previousHouse : (houses[0]?.houseId || '');

  const options = panel.selected?.options || { sports: [], competitions: [] };
  sportSelect.innerHTML = `<option value="">Todos</option>${(options.sports || []).map((sport) => `<option value="${escapeHtml(sport)}">${escapeHtml(sport)}</option>`).join('')}`;
  if ([...sportSelect.options].some((opt) => opt.value === pipelineAuditState.sport)) sportSelect.value = pipelineAuditState.sport;

  competitionSelect.innerHTML = `<option value="">Todas</option>${(options.competitions || []).map((competition) => `<option value="${escapeHtml(competition)}">${escapeHtml(competition)}</option>`).join('')}`;
  if ([...competitionSelect.options].some((opt) => opt.value === pipelineAuditState.competition)) competitionSelect.value = pipelineAuditState.competition;

  document.getElementById('pipelineAuditDay').value = pipelineAuditState.day || 'all';
  document.getElementById('pipelineAuditStatus').value = pipelineAuditState.status || 'all';
  document.getElementById('pipelineAuditFresh').value = pipelineAuditState.fresh || 'all';
  document.getElementById('pipelineAuditEventSearch').value = pipelineAuditState.event || '';

  houseSelect.onchange = async () => { pipelineAuditState.page = 1; pipelineAuditSyncFiltersFromDom(); await renderPipelineAuditPanel(); };
  sportSelect.onchange = async () => { pipelineAuditState.page = 1; pipelineAuditSyncFiltersFromDom(); await renderPipelineAuditPanel(); };
  competitionSelect.onchange = async () => { pipelineAuditState.page = 1; pipelineAuditSyncFiltersFromDom(); await renderPipelineAuditPanel(); };
  document.getElementById('pipelineAuditDay').onchange = async () => { pipelineAuditState.page = 1; pipelineAuditSyncFiltersFromDom(); await renderPipelineAuditPanel(); };
  document.getElementById('pipelineAuditStatus').onchange = async () => { pipelineAuditState.page = 1; pipelineAuditSyncFiltersFromDom(); await renderPipelineAuditPanel(); };
  document.getElementById('pipelineAuditFresh').onchange = async () => { pipelineAuditState.page = 1; pipelineAuditSyncFiltersFromDom(); await renderPipelineAuditPanel(); };
}

function pipelineAuditRenderHouseCards(panel) {
  const target = document.getElementById('pipelineAuditHouseCards');
  if (!target) return;
  const houses = panel.houses || [];
  target.innerHTML = houses.map((house) => `
    <article class="assistant-card">
      <span class="title">${escapeHtml(house.house)} · ${escapeHtml(String(house.sourceType || '').toUpperCase())}</span>
      <span class="desc">Status: ${escapeHtml(house.status || 'unknown')} · Saúde: ${escapeHtml(house.health || 'UNKNOWN')}</span>
      <span class="desc">Última coleta: ${escapeHtml(house.lastUpdate || '—')} · Próxima atualização: ${escapeHtml(house.nextUpdate || '—')}</span>
      <span class="desc">Esportes: ${house.totals?.sports || 0} · Competições: ${house.totals?.competitions || 0} · Eventos: ${house.totals?.events || 0} · Mercados: ${house.totals?.markets || 0} · Runners: ${house.totals?.runners || 0}</span>
      <span class="desc">BACK: ${house.hasBack ? 'Sim' : 'Não'} · LAY: ${house.hasLay ? 'Sim' : 'Não'} · Liquidez/Volume: ${house.hasLiquidityOrVolume ? 'Sim' : 'Não'}</span>
      <span class="desc">Fresh: ${house.fresh || 0} · Stale: ${house.stale || 0} · Atualização contínua: ${house.continuousUpdate ? 'SIM' : 'NÃO'}</span>
    </article>`).join('');
}

function pipelineAuditRenderSummary(panel) {
  const target = document.getElementById('pipelineAuditSummary');
  if (!target) return;
  const rows = panel.selected?.summaryByDateSport || [];
  if (!rows.length) {
    target.innerHTML = '<div class="message">Sem dados para os filtros selecionados.</div>';
    return;
  }
  target.innerHTML = `
    <table class="pipeline-audit-table">
      <thead><tr><th>Data</th><th>Esporte</th><th>Competições</th><th>Eventos</th><th>Mercados</th><th>Runners</th><th>BACK</th><th>LAY</th><th>Liquidez/Volume</th></tr></thead>
      <tbody>
        ${rows.map((row) => `<tr><td>${escapeHtml(row.date === 'today' ? 'Hoje' : row.date === 'tomorrow' ? 'Amanhã' : row.date)}</td><td>${escapeHtml(row.sport)}</td><td>${row.competitions}</td><td>${row.events}</td><td>${row.markets}</td><td>${row.runners}</td><td>${row.back}</td><td>${row.lay}</td><td>${row.liquidityOrVolume}</td></tr>`).join('')}
      </tbody>
    </table>`;
}

function pipelineAuditRenderConsistency(panel) {
  const target = document.getElementById('pipelineAuditConsistency');
  if (!target) return;
  const consistency = panel.selected?.consistency;
  if (!consistency) {
    target.innerHTML = '';
    return;
  }
  const alerts = consistency.alerts || [];
  target.innerHTML = alerts.length
    ? `<div class="message danger">ALERTA DE INCONSISTÊNCIA: ${alerts.map((item) => escapeHtml(item)).join(', ')}</div>`
    : `<div class="message">Consistência OK · Eventos listados: ${consistency.eventsListed} · Soma de mercados por evento: ${consistency.sumEventMarketCount} · Soma de runners por mercado: ${consistency.sumMarketRunnerCount}</div>`;
}

async function pipelineAuditOpenEvent(eventId) {
  const target = document.getElementById('pipelineAuditEventDetail');
  if (!target) return;
  target.innerHTML = '<div class="message">Carregando evento...</div>';
  const query = new URLSearchParams({ houseId: pipelineAuditState.houseId, day: pipelineAuditState.day || 'all' }).toString();
  const response = await fetchJson(`/api/pipeline/audit/events/${encodeURIComponent(eventId)}?${query}`);
  const detail = response.detail || {};
  if (!detail.found || !detail.event) {
    target.innerHTML = '<div class="message">Evento não encontrado no estado atual.</div>';
    return;
  }
  const event = detail.event;
  target.innerHTML = `
    <article class="assistant-card">
      <span class="title">${escapeHtml(event.event)} (${escapeHtml(event.eventId)})</span>
      <span class="desc">Casa: ${escapeHtml(event.house)} · Esporte: ${escapeHtml(event.sport)} · Competição: ${escapeHtml(event.competition)}</span>
      <span class="desc">Data: ${escapeHtml(event.date)} · Horário: ${escapeHtml(event.startTime || '—')} · Status: ${escapeHtml(event.status)} · InPlay: ${event.inPlay ? 'Sim' : 'Não'}</span>
      <span class="desc">Total de mercados coletados: ${event.marketCount} · Última atualização: ${escapeHtml(event.lastUpdatedAt || '—')}</span>
      <div class="pipeline-audit-market-list">
        ${event.markets.map((market) => `
          <details>
            <summary>${escapeHtml(market.marketName)} · ${escapeHtml(market.marketType || '—')} · ${escapeHtml(market.marketId)} · Runners: ${market.runnerCount} · Atualizado: ${escapeHtml(market.lastUpdatedAt || '—')}</summary>
            <table class="pipeline-audit-table">
              <thead><tr><th>Runner</th><th>Runner ID</th><th>BACK</th><th>LAY</th><th>Liquidez/Volume</th><th>LastMatched</th><th>UpdatedAt</th></tr></thead>
              <tbody>${market.runners.map((runner) => `<tr><td>${escapeHtml(runner.runnerName)}</td><td>${escapeHtml(runner.runnerId)}</td><td>${runner.back ?? '—'}</td><td>${runner.lay ?? '—'}</td><td>${runner.liquidityOrVolume ?? '—'}</td><td>${runner.lastMatchedPrice ?? '—'}</td><td>${escapeHtml(runner.updatedAt || '—')}</td></tr>`).join('')}</tbody>
            </table>
          </details>`).join('')}
      </div>
    </article>`;
}

function pipelineAuditRenderEvents(panel) {
  const target = document.getElementById('pipelineAuditEvents');
  const meta = document.getElementById('pipelineAuditMeta');
  if (!target || !meta) return;

  const selected = panel.selected;
  if (!selected) {
    meta.textContent = 'Nenhuma casa disponível no current state.';
    target.innerHTML = '';
    return;
  }

  const freshness = selected.freshness || {};
  const totals = selected.totals || {};
  meta.textContent = `Janela: ${panel.window?.fromIso || '—'} até ${panel.window?.toIso || '—'} (${panel.window?.timezone || 'local'}) | Eventos: ${totals.events || 0} | Mercados: ${totals.markets || 0} | Runners: ${totals.runners || 0} | Fresh: ${freshness.fresh || 0} | Stale: ${freshness.stale || 0}`;

  const events = selected.events || { items: [], page: 1, pageSize: 50, total: 0 };
  const totalPages = Math.max(1, Math.ceil(Number(events.total || 0) / Number(events.pageSize || 50)));
  target.innerHTML = `
    <table class="pipeline-audit-table">
      <thead><tr><th>Dia</th><th>Esporte</th><th>Competição</th><th>Evento</th><th>Start</th><th>Status</th><th>InPlay</th><th>Mercados</th><th>Última atualização</th><th>Ação</th></tr></thead>
      <tbody>
        ${(events.items || []).map((item) => `<tr><td>${escapeHtml(item.day === 'today' ? 'Hoje' : item.day === 'tomorrow' ? 'Amanhã' : item.day)}</td><td>${escapeHtml(item.sport)}</td><td>${escapeHtml(item.competition)}</td><td>${escapeHtml(item.eventName)}</td><td>${escapeHtml(item.startTime || '—')}</td><td>${escapeHtml(item.status || '—')}</td><td>${item.inPlay ? 'Sim' : 'Não'}</td><td>${item.marketCount}</td><td>${escapeHtml(item.lastUpdatedAt || '—')}</td><td><button type="button" data-audit-event="${escapeHtml(item.eventId)}">Abrir</button></td></tr>`).join('')}
      </tbody>
    </table>
    <span class="actions-row"><button type="button" id="pipelineAuditPrev" ${events.page <= 1 ? 'disabled' : ''}>Anterior</button><span>Página ${events.page} de ${totalPages}</span><button type="button" id="pipelineAuditNext" ${events.page >= totalPages ? 'disabled' : ''}>Próxima</button></span>`;

  target.querySelectorAll('[data-audit-event]').forEach((button) => button.addEventListener('click', async () => {
    await pipelineAuditOpenEvent(button.dataset.auditEvent);
  }));
  const prev = document.getElementById('pipelineAuditPrev');
  const next = document.getElementById('pipelineAuditNext');
  if (prev) prev.addEventListener('click', async () => { pipelineAuditState.page = Math.max(1, Number(events.page || 1) - 1); await renderPipelineAuditPanel(); });
  if (next) next.addEventListener('click', async () => { pipelineAuditState.page = Math.min(totalPages, Number(events.page || 1) + 1); await renderPipelineAuditPanel(); });
}

function schedulePipelineAuditRefresh() {
  if (pipelineAuditRefreshTimer) clearTimeout(pipelineAuditRefreshTimer);
  pipelineAuditRefreshTimer = setTimeout(async () => {
    if (!document.getElementById('pipelineAuditPanel')) return;
    await renderPipelineAuditPanel({ keepDetail: true, silent: true });
  }, 8000);
}

async function renderPipelineAuditPanel(options = {}) {
  if (!document.getElementById('pipelineAuditPanel')) return;
  pipelineAuditSyncFiltersFromDom();
  const response = await fetchJson(`/api/pipeline/audit/panel?${pipelineAuditQuery()}`);
  const panel = response.panel || {};
  if (!pipelineAuditState.houseId && panel.selectedHouseId) pipelineAuditState.houseId = panel.selectedHouseId;
  pipelineAuditRenderFilters(panel);
  pipelineAuditRenderHouseCards(panel);
  pipelineAuditRenderSummary(panel);
  pipelineAuditRenderConsistency(panel);
  pipelineAuditRenderEvents(panel);
  if (!options.keepDetail) {
    const detail = document.getElementById('pipelineAuditEventDetail');
    if (detail) detail.innerHTML = '<div class="message">Selecione um evento para abrir mercados e runners.</div>';
  }
  schedulePipelineAuditRefresh();
}

async function exportPipelineAudit() {
  pipelineAuditSyncFiltersFromDom();
  const query = pipelineAuditQuery();
  const response = await fetch(`/api/pipeline/audit/export?${query}`);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: 'Erro ao exportar auditoria.' }));
    assistantResult.textContent = payload.error || 'Erro ao exportar auditoria.';
    return;
  }
  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const fileNameMatch = disposition.match(/filename="?([^";]+)"?/i);
  const fileName = fileNameMatch?.[1] || `FALLAH_COLLECTION_AUDIT_${Date.now()}.json`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  assistantResult.textContent = `Auditoria exportada: ${fileName}`;
}

async function renderDiscoveryConfiguration() {
  assistantModuleDetails.innerHTML = `
    <form id="discoveryHouseForm">
      <input type="hidden" id="discoveryHouseId">
      <label>Nome<input id="discoveryHouseName" required></label>
      <label>URL<input id="discoveryHouseUrl" type="url" required></label>
      <label>Tipo<select id="discoveryHouseType" required><option value="exchange">Exchange</option><option value="sportsbook">Bet / Sportsbook</option></select></label>
      <label>Comissão %<input id="discoveryHouseCommission" type="number" min="0" max="100" step="0.01" value="0" required></label>
      <label>Timeout (ms)<input id="discoveryHouseTimeout" type="number" min="1000" max="120000" value="10000" required></label>
      <label>Máximo de Readers<input id="discoveryHouseMaxReaders" type="number" min="1" max="100" value="1" required></label>
      <label>Intervalo (ms)<input id="discoveryHouseInterval" type="number" min="250" max="3600000" value="5000" required></label>
      <label>Prioridade<input id="discoveryHousePriority" type="number" min="1" max="100" value="50" required></label>
      <label>Observações<textarea id="discoveryHouseNotes" maxlength="5000"></textarea></label>
      <span class="actions-row"><button type="submit" id="discoverySubmitButton">Adicionar Casa</button><button type="button" id="discoveryCancelEdit" hidden>Cancelar edição</button><button type="button" id="discoveryImport">Importar Profile</button><button type="button" id="discoveryImportHouses">Importar Casas</button><button type="button" id="discoveryExportHouses">Exportar Casas</button><button type="button" id="discoverySaveConfiguration"><strong>SALVAR CASAS / ATIVAÇÃO</strong></button></span>
      <input type="file" id="discoveryImportFile" accept="application/json,.json" hidden>
      <input type="file" id="discoveryImportHousesFile" accept="application/json,.json" hidden>
    </form>
    <div id="discoveryHouseSelector" class="discovery-house-selector message">Carregando casas...</div>
    <div id="discoveryHousePanel" class="message">Selecione uma casa.</div>`;
  const form = document.getElementById('discoveryHouseForm');
  const cancel = document.getElementById('discoveryCancelEdit');
  const type = document.getElementById('discoveryHouseType');
  const commission = document.getElementById('discoveryHouseCommission');
  const syncCommissionField = () => { const sportsbook = type.value === 'sportsbook';if (sportsbook) commission.value = '0';commission.disabled = sportsbook; };
  form.addEventListener('submit', saveDiscoveryHouse);
  type.addEventListener('change', syncCommissionField);
  syncCommissionField();
  cancel.addEventListener('click', resetDiscoveryForm);
  document.getElementById('discoveryImport').addEventListener('click', () => document.getElementById('discoveryImportFile').click());
  document.getElementById('discoveryImportFile').addEventListener('change', importDiscoveryProfile);
  document.getElementById('discoveryImportHouses').addEventListener('click', () => document.getElementById('discoveryImportHousesFile').click());
  document.getElementById('discoveryImportHousesFile').addEventListener('change', importDiscoveryHouses);
  document.getElementById('discoveryExportHouses').addEventListener('click', () => { window.location.href = '/api/discovery/houses/export'; });
  document.getElementById('discoverySaveConfiguration').addEventListener('click', async () => { const b=document.getElementById('discoverySaveConfiguration'); b.disabled=true; assistantResult.textContent='Salvando e sincronizando casas...'; try { const r=await fetchJson('/api/discovery/houses/save-configuration',{method:'POST'}); assistantResult.textContent=r.success?'CASAS SALVAS E RUNTIME SINCRONIZADO.':r.error; if(r.success) await loadDiscoveryHouses(); } catch(e) { assistantResult.textContent=e.message||'Falha ao salvar casas.'; } finally { b.disabled=false; } });
  await loadDiscoveryHouses();
  assistantResult.textContent = 'Discovery Engine operacional.';
}

function discoveryHouseSummary(house) {
  const typeLabel = house.type === 'sportsbook' ? 'Bet / Sportsbook' : 'Exchange';
  return `<strong>Tipo:</strong> ${typeLabel} · <strong>Status:</strong> ${escapeHtml(house.status)} · <strong>Comissão:</strong> ${formatCommissionValue(house.commission)}% · <strong>Prioridade:</strong> ${house.priority || 50}`;
}

function renderDiscoveryHouseSelector(houses) {
  const selector = document.getElementById('discoveryHouseSelector');
  if (!selector) return;
  if (!houses.length) {
    selector.innerHTML = '<div class="message">Nenhuma casa cadastrada.</div>';
    return;
  }
  selector.innerHTML = `
    <div class="discovery-house-selector-header">
      <strong>Casas cadastradas</strong>
      <span>${houses.length} casa(s)</span>
    </div>
    <div class="discovery-house-chips">
      ${houses.map((house) => `<button type="button" class="discovery-house-chip${house.id === discoverySelectedHouseId ? ' active' : ''}" data-discovery-select="${escapeHtml(house.id)}">${escapeHtml(house.name)}</button>`).join('')}
    </div>`;
  selector.querySelectorAll('[data-discovery-select]').forEach((button) => button.addEventListener('click', () => {
    discoverySelectedHouseId = button.dataset.discoverySelect;
    renderDiscoveryHouseSelector(discoveryHousesCache);
    renderDiscoveryHousePanel(discoveryHousesCache);
  }));
}

function renderDiscoveryHousePanel(houses) {
  const panel = document.getElementById('discoveryHousePanel');
  if (!panel) return;
  const house = houses.find((item) => item.id === discoverySelectedHouseId) || houses[0] || null;
  if (!house) {
    panel.innerHTML = 'Selecione uma casa.';
    return;
  }
  discoverySelectedHouseId = house.id;
  panel.innerHTML = `
    <article class="assistant-card discovery-house-panel-card">
      <span class="title">${escapeHtml(house.name)}</span>
      <span class="desc">${discoveryHouseSummary(house)}</span>
      <span class="desc">${escapeHtml(house.url)}</span>
      <span class="desc"><strong>Última descoberta:</strong> ${escapeHtml(house.lastDiscoveryAt || '—')} · <strong>Última atualização:</strong> ${escapeHtml(house.lastUpdatedAt || '—')} · <strong>Profile:</strong> ${escapeHtml(house.profileVersion || '—')}</span>
      <span class="desc"><strong>Timeout:</strong> ${house.timeoutMs || 10000}ms · <strong>Readers:</strong> ${house.maxReaders || 1} · <strong>Intervalo:</strong> ${house.updateIntervalMs || 5000}ms · ${escapeHtml(house.notes || '')}</span>
      <span class="desc" id="discoveryProgress-${escapeHtml(house.id)}">${house.running ? 'Discovery em execução...' : ''}</span>
      <span class="actions-row">
        <button type="button" data-discovery-action="edit" data-id="${escapeHtml(house.id)}">Editar Casa</button>
        <button type="button" data-discovery-action="delete" data-id="${escapeHtml(house.id)}">Excluir Casa</button>
        <button type="button" data-discovery-action="active" data-id="${escapeHtml(house.id)}" data-active="${house.active ? 'false' : 'true'}">${house.active ? 'Desativar' : 'Ativar'}</button>
        <button type="button" data-discovery-action="block" data-id="${escapeHtml(house.id)}" data-blocked="${house.blocked ? 'false' : 'true'}">${house.blocked ? 'Desbloquear' : 'Bloquear'}</button>
        <button type="button" data-discovery-action="run" data-id="${escapeHtml(house.id)}" ${house.running ? 'disabled' : ''}>${house.lastDiscoveryAt ? 'Reexecutar Discovery' : 'Executar Discovery'}</button>
        <button type="button" data-discovery-action="export" data-id="${escapeHtml(house.id)}" ${house.profileVersion ? '' : 'disabled'}>Exportar Profile</button>
      </span>
    </article>`;
  panel.querySelectorAll('[data-discovery-action]').forEach((button) => button.addEventListener('click', () => handleDiscoveryAction(button, houses)));
}

async function loadDiscoveryHouses() {
  const selector = document.getElementById('discoveryHouseSelector');
  const panel = document.getElementById('discoveryHousePanel');
  if (!selector || !panel) return;
  try {
    const response = await fetchJson('/api/discovery/houses');
    const houses = response.houses || [];
    discoveryHousesCache = houses;
    if (!houses.some((house) => house.id === discoverySelectedHouseId)) discoverySelectedHouseId = houses[0]?.id || null;
    renderDiscoveryHouseSelector(houses);
    renderDiscoveryHousePanel(houses);
  } catch (error) {
    selector.textContent = error.message || 'Não foi possível carregar as casas.';
    panel.textContent = error.message || 'Não foi possível carregar as casas.';
  }
}

function parseCommissionValue(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const normalized = String(value).trim().replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCommissionValue(value) {
  return parseCommissionValue(value).toFixed(1).replace('.', ',');
}

function resetDiscoveryForm() {
  document.getElementById('discoveryHouseForm')?.reset();
  document.getElementById('discoveryHouseId').value = '';
  const submitButton = document.getElementById('discoverySubmitButton');
  if (submitButton) submitButton.textContent = 'Adicionar Casa';
  const cancelButton = document.getElementById('discoveryCancelEdit');
  if (cancelButton) cancelButton.hidden = true;
}

async function saveDiscoveryHouse(event) {
  event.preventDefault();
  const form = document.getElementById('discoveryHouseForm');
  const id = document.getElementById('discoveryHouseId').value;
  const nameInput = document.getElementById('discoveryHouseName');
  const urlInput = document.getElementById('discoveryHouseUrl');
  const typeInput = document.getElementById('discoveryHouseType');
  const commissionInput = document.getElementById('discoveryHouseCommission');
  const timeoutInput = document.getElementById('discoveryHouseTimeout');
  const maxReadersInput = document.getElementById('discoveryHouseMaxReaders');
  const intervalInput = document.getElementById('discoveryHouseInterval');
  const priorityInput = document.getElementById('discoveryHousePriority');
  const notesInput = document.getElementById('discoveryHouseNotes');
  const body = {
    name: nameInput ? nameInput.value.trim() : '',
    url: urlInput ? urlInput.value.trim() : '',
    type: typeInput ? typeInput.value : 'other',
    commission: parseCommissionValue(commissionInput?.value),
    timeoutMs: Number(timeoutInput?.value || 10000),
    maxReaders: Number(maxReadersInput?.value || 1),
    updateIntervalMs: Number(intervalInput?.value || 5000),
    priority: Number(priorityInput?.value || 50),
    notes: notesInput ? notesInput.value : ''
  };
  if (!body.name) {
    assistantResult.textContent = 'Nome da casa é obrigatório.';
    if (nameInput) nameInput.focus();
    return;
  }
  if (!body.url) {
    assistantResult.textContent = 'URL da casa é obrigatória.';
    if (urlInput) urlInput.focus();
    return;
  }
  const submitButton = document.getElementById('discoverySubmitButton');
  if (submitButton) submitButton.textContent = id ? 'Salvar Alterações' : 'Adicionar Casa';
  const response = await fetchJson(id ? `/api/discovery/houses/${encodeURIComponent(id)}` : '/api/discovery/houses', { method: id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assistantResult.textContent = response.success ? 'Casa salva.' : response.error;
  if (response.success) { discoverySelectedHouseId = response.house?.id || discoverySelectedHouseId; resetDiscoveryForm(); await loadDiscoveryHouses(); }
  if (form) form.reset();
}

async function handleDiscoveryAction(button, houses) {
  const id = button.dataset.id;
  const action = button.dataset.discoveryAction;
  const house = houses.find((item) => item.id === id);
  if (action === 'edit' && house) {
    document.getElementById('discoveryHouseId').value = house.id;
    document.getElementById('discoveryHouseName').value = house.name;
    document.getElementById('discoveryHouseUrl').value = house.url;
    document.getElementById('discoveryHouseType').value = house.type;
    document.getElementById('discoveryHouseCommission').value = parseCommissionValue(house.commission).toFixed(1);
    document.getElementById('discoveryHouseCommission').disabled = house.type === 'sportsbook';
    document.getElementById('discoveryHouseTimeout').value = house.timeoutMs || 10000;
    document.getElementById('discoveryHouseMaxReaders').value = house.maxReaders || 1;
    document.getElementById('discoveryHouseInterval').value = house.updateIntervalMs || 5000;
    document.getElementById('discoveryHousePriority').value = house.priority || 50;
    document.getElementById('discoveryHouseNotes').value = house.notes || '';
    const submitButton = document.getElementById('discoverySubmitButton');
    if (submitButton) submitButton.textContent = 'Salvar Alterações';
    const cancelButton = document.getElementById('discoveryCancelEdit');
    if (cancelButton) cancelButton.hidden = false;
    return;
  }
  if (action === 'export') { window.location.href = `/api/discovery/houses/${encodeURIComponent(id)}/profile`; return; }
  if (action === 'delete' && !confirm(`Excluir ${house?.name || 'esta casa'} e seu Profile?`)) return;
  assistantResult.textContent = action === 'run' ? 'Discovery em execução...' : 'Processando...';
  const request = action === 'delete' ? { method: 'DELETE' } : action === 'active' ? { method: 'PATCH', body: JSON.stringify({ active: button.dataset.active === 'true' }) } : action === 'block' ? { method: 'PATCH', body: JSON.stringify({ blocked: button.dataset.blocked === 'true' }) } : { method: 'POST' };
  const suffix = action === 'active' ? '/active' : action === 'block' ? '/block' : action === 'run' ? '/run' : '';
  if (request.body && !request.headers) request.headers = { 'Content-Type': 'application/json' };
  const response = await fetchJson(`/api/discovery/houses/${encodeURIComponent(id)}${suffix}`, request);
  assistantResult.textContent = response.success ? (action === 'run' ? 'Discovery iniciado no navegador interno.' : 'Ação concluída.') : response.error;
  if (response.success && action === 'run') { button.disabled = true;await monitorDiscovery(id);return; }
  if (response.success && action === 'delete' && discoverySelectedHouseId === id) discoverySelectedHouseId = houses.find((item) => item.id !== id)?.id || null;
  if (response.success) await loadDiscoveryHouses();
}

async function monitorDiscovery(id) {
  const progress = document.getElementById(`discoveryProgress-${id}`);
  while (document.getElementById(`discoveryProgress-${id}`)) {
    const response = await fetchJson(`/api/discovery/houses/${encodeURIComponent(id)}/status`);
    const job = response.job || {};
    const seconds = ((job.elapsedMs || 0) / 1000).toFixed(1);
    if (progress) progress.innerHTML = `<strong>Status:</strong> ${escapeHtml(job.status || 'idle')} · <strong>Tempo:</strong> ${seconds}s · <strong>Endpoints:</strong> ${job.endpoints || 0} · <strong>XHR:</strong> ${job.xhr || 0} · <strong>Fetch:</strong> ${job.fetch || 0} · <strong>WebSockets:</strong> ${job.websockets || 0} · <strong>JSON:</strong> ${job.json || 0}`;
    if (job.status === 'completed') {
      const summary = job.summary || {};
      assistantResult.textContent = `Discovery concluído em ${((summary.totalMs || job.elapsedMs || 0) / 1000).toFixed(1)}s · ${summary.endpoints || 0} endpoints · ${summary.websockets || 0} WebSockets · ${summary.apis || 0} APIs · ${summary.marketsFound || 0} mercados · Score ${summary.qualityScore || 0}/100`;
      await loadDiscoveryHouses();return;
    }
    if (job.status === 'error') { assistantResult.textContent = job.message || 'Discovery não concluído.';await loadDiscoveryHouses();return; }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
}

async function importDiscoveryProfile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const profile = JSON.parse(await file.text());
    const response = await fetchJson('/api/discovery/profiles/import', { method: 'POST', body: JSON.stringify({ profile }) });
    assistantResult.textContent = response.success ? 'Profile importado.' : response.error;
    if (response.success) await loadDiscoveryHouses();
  } catch (error) { assistantResult.textContent = error.message || 'Profile inválido.'; }
  event.target.value = '';
}

async function importDiscoveryHouses(event) {
  const file = event.target.files?.[0];if (!file) return;
  try { const configuration = JSON.parse(await file.text());const response = await fetchJson('/api/discovery/houses/import', { method: 'POST', body: JSON.stringify({ configuration }) });assistantResult.textContent = response.success ? `${response.result.imported} casa(s) importada(s).` : response.error;if (response.success) await loadDiscoveryHouses(); } catch (error) { assistantResult.textContent = error.message || 'Configuração de casas inválida.'; }
  event.target.value = '';
}

function persistPreferences() {
  uiPreferences.tema = prefTheme.value;
  uiPreferences.icones = prefIconSet.value;
  uiPreferences.fonte = Number(prefFontSize.value || 14);
  uiPreferences.zoom = Number(prefZoom.value || 100);
  uiPreferences.compactacaoArvore = Number(prefTreeCompact.value || 18);
  uiPreferences.confirmarExclusao = Boolean(prefConfirmDelete.checked);
  uiPreferences.mostrarDicas = Boolean(prefShowHints.checked);
  uiPreferences.scannerAutoSegundos = Number(prefScannerAuto.value || 0);
  savePreferencesLocal();
  applyUiPreferences();
  startScannerAutoRefresh(uiPreferences.scannerAutoSegundos);
  preferencesResult.textContent = 'Preferências salvas com sucesso.';
}

function toggleThemeMode() {
  uiPreferences.tema = uiPreferences.tema === 'escuro' ? 'claro' : 'escuro';
  savePreferencesLocal();
  applyUiPreferences();
  syncPreferencesForm();
}


let selectedPath = '';
let editor = null;
let openFiles = new Map();
let activeFilePath = null;
let editorFontSize = 14;
let currentDirectory = '';
let clipboard = null;
let includeSystemFiles = false;
let selectedExplorerEntry = null;
const expandedDirectories = new Set();
let favorites = new Set();
let recentFiles = [];
let filteredListing = [];
let explorerSort = { key: 'name', direction: 1 };
let terminalHistory = [];
let activeTerminalAbort = null;
let chatConversations = [];
let conversationPage = 1;
let conversationPages = 1;
let selectedConversationId = null;
let activeConversation = null;
let currentChatAbort = null;
let currentChatAttachments = [];
let chatElapsedTimer = null;
let allMissions = [];
let missionPage = 1;
let missionPages = 1;
let scannerTreePage = 1;
let scannerTreePages = 1;
let scannerPollTimer = null;
let selectedExplorerPaths = new Set();
let assistantModules = [];
let assistantSelectedModuleId = null;
let currentCleanupPreview = null;
let explorerActiveIndex = -1;
const nodeNotes = new Map();
let cpuSampleStart = performance.now();
let scannerAutoTimer = null;
let aiManagerConfig = null;
const aiProvidersTestedThisSession = new Set();
const uiPreferences = {
  tema: 'escuro',
  icones: 'remix',
  fonte: 14,
  zoom: 100,
  compactacaoArvore: 18,
  confirmarExclusao: true,
  mostrarDicas: true,
  scannerAutoSegundos: 0,
};

function arrayBufferToBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function getLanguageFromPath(path) {
  const extension = path.split('.').pop().toLowerCase();
  const map = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    json: 'json',
    html: 'html',
    css: 'css',
    scss: 'scss',
    md: 'markdown',
    markdown: 'markdown',
    py: 'python',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    h: 'cpp',
    cs: 'csharp',
    php: 'php',
    go: 'go',
    rs: 'rust',
    sh: 'shell',
    bash: 'shell',
    yml: 'yaml',
    yaml: 'yaml',
    txt: 'plaintext',
  };
  return map[extension] || 'plaintext';
}

function setEditorStatus(message) {
  editorStatus.textContent = message;
}

function updateStatusBar() {
  if (!editor || !activeFilePath) {
    setEditorStatus('Pronto');
    return;
  }
  const model = editor.getModel();
  const position = editor.getPosition();
  const language = getLanguageFromPath(activeFilePath);
  const modified = openFiles.get(activeFilePath)?.isDirty ? '●' : '✓';
  setEditorStatus(`${modified} ${activeFilePath} — ${language} — Linha ${position.lineNumber}, Col ${position.column} — Zoom ${editorFontSize}%`);
}

function updateEditorTabs() {
  editorTabs.innerHTML = '';
  openFiles.forEach((meta, path) => {
    const tab = document.createElement('button');
    tab.className = 'editor-tab';
    if (path === activeFilePath) tab.classList.add('active');
    if (meta.isDirty) tab.classList.add('modified');
    tab.textContent = path.split('/').pop();
    tab.title = path;
    tab.addEventListener('click', () => setActiveEditorPath(path));
    editorTabs.appendChild(tab);
  });
}

function createEditorModel(path, content) {
  const language = getLanguageFromPath(path);
  const model = monaco.editor.createModel(content, language);
  model._filePath = path;
  openFiles.set(path, {
    model,
    savedValue: content,
    isDirty: false,
  });
  model.onDidChangeContent(() => {
    const fileMeta = openFiles.get(path);
    if (!fileMeta) return;
    fileMeta.isDirty = model.getValue() !== fileMeta.savedValue;
    updateEditorTabs();
    updateStatusBar();
  });
  return model;
}

function setActiveEditorPath(path) {
  if (!openFiles.has(path)) return;
  activeFilePath = path;
  const { model } = openFiles.get(path);
  editor.setModel(model);
  updateEditorTabs();
  updateStatusBar();
  notifyEditorOfSelection(path);
}

function openFileInEditor(path, content) {
  if (openFiles.has(path)) {
    setActiveEditorPath(path);
    addRecentFile(path);
    return;
  }
  const model = createEditorModel(path, content);
  addRecentFile(path);
  setActiveEditorPath(path);
}

async function saveAsCurrentFile() {
  if (!editor || !activeFilePath) {
    editorMessage.textContent = 'Nenhum arquivo aberto para salvar.';
    return;
  }
  const newPath = window.prompt('Salvar como (novo caminho):', activeFilePath);
  if (!newPath || newPath === activeFilePath) return;
  const { model } = openFiles.get(activeFilePath);
  const content = model.getValue();
  try {
    const response = await fetchJson('/api/file/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: newPath, content }),
    });
    if (response.success) {
      const meta = openFiles.get(activeFilePath);
      meta.savedValue = content;
      meta.isDirty = false;
      openFiles.delete(activeFilePath);
      openFileInEditor(newPath, content);
      updateEditorTabs();
      editorMessage.textContent = `Salvo como ${newPath}`;
      await refreshExplorerAfterMutation(getPathParent(newPath));
    } else {
      editorMessage.textContent = response.error;
    }
  } catch (error) {
    editorMessage.textContent = 'Não foi possível salvar o arquivo.';
  }
}

function installMonacoEditor() {
  if (editor) return;
  if (!window.require) {
    console.error('Monaco loader is not available.');
    return;
  }
  require(['vs/editor/editor.main'], () => {
    monaco.editor.setTheme('vs-dark');
    editor = monaco.editor.create(editorContainer, {
      value: '',
      language: 'plaintext',
      theme: 'vs-dark',
      automaticLayout: true,
      fontSize: editorFontSize,
      minimap: { enabled: false },
      glyphMargin: true,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      roundedSelection: true,
      cursorStyle: 'line',
    });

    editor.onDidChangeCursorPosition(updateStatusBar);
    editor.onDidChangeModelContent(() => updateStatusBar());

    window.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveCurrentFile();
      }
    });

    if (openFiles.size > 0 && activeFilePath) {
      setActiveEditorPath(activeFilePath);
    }
  });
}

async function loadFileFromPath(path) {
  if (!path) {
    editorMessage.textContent = 'Selecione ou informe o caminho do arquivo.';
    return;
  }
  try {
    const response = await fetchJson('/api/file/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    if (response.success) {
      openFileInEditor(path, response.content);
      editorMessage.textContent = `Arquivo carregado: ${path}`;
      notifyEditorOfSelection(path);
    } else {
      editorMessage.textContent = response.error;
    }
  } catch (error) {
    editorMessage.textContent = 'Não foi possível carregar o arquivo.';
  }
}

async function saveCurrentFile() {
  if (!activeFilePath || !openFiles.has(activeFilePath)) {
    editorMessage.textContent = 'Nenhum arquivo aberto para salvar.';
    return;
  }
  const { model } = openFiles.get(activeFilePath);
  const content = model.getValue();
  try {
    const response = await fetchJson('/api/file/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: activeFilePath, content }),
    });
    if (response.success) {
      const meta = openFiles.get(activeFilePath);
      meta.savedValue = content;
      meta.isDirty = false;
      updateEditorTabs();
      updateStatusBar();
      editorMessage.textContent = `Arquivo salvo: ${activeFilePath}`;
      await refreshExplorerAfterMutation(getPathParent(activeFilePath));
    } else {
      editorMessage.textContent = response.error;
    }
  } catch (error) {
    editorMessage.textContent = 'Não foi possível salvar o arquivo.';
  }
}

function openFileSelection(path) {
  notifyEditorOfSelection(path);
  loadFileFromPath(path);
}

function updateFontSize(delta) {
  editorFontSize = Math.max(10, Math.min(28, editorFontSize + delta));
  if (editor) {
    editor.updateOptions({ fontSize: editorFontSize });
  }
  updateStatusBar();
}

function showContextMenu(event, node) {
  const destination = node.type === 'directory' ? node.path : (currentDirectory || getPathParent(node.path));
  const canPaste = Boolean(clipboard);
  const options = [
    { label: 'Abrir', icon: 'ri-folder-open-line', action: () => openNode(node) },
    { label: 'Renomear', icon: 'ri-edit-2-line', action: () => promptRename(node) },
    { separator: true },
    { label: 'Copiar', icon: 'ri-file-copy-line', action: () => copyNode(node) },
    { label: 'Recortar', icon: 'ri-scissors-cut-line', action: () => cutNode(node) },
    { label: 'Colar', icon: 'ri-clipboard-line', action: () => pasteNode(destination), disabled: !canPaste },
    { label: 'Duplicar', icon: 'ri-file-copy-2-line', action: () => duplicateNode(node) },
    { label: 'Mover', icon: 'ri-drag-move-line', action: () => moveNode(node) },
    { separator: true },
    {
      label: 'Arquivo',
      icon: 'ri-file-settings-line',
      submenu: [
        { label: favorites.has(node.path) ? 'Remover dos favoritos' : 'Favoritar', icon: 'ri-star-line', action: () => toggleFavorite(node.path) },
        { label: 'Compactar ZIP', icon: 'ri-file-zip-line', action: () => createZipFromNode(node) },
        { label: 'Baixar', icon: 'ri-download-2-line', action: () => downloadNode(node) },
        { label: 'Copiar caminho', icon: 'ri-link', action: () => copyNodePath(node.path) },
      ],
    },
    { label: 'Propriedades', icon: 'ri-information-line', action: () => showNodeProperties(node) },
    { label: 'Excluir', icon: 'ri-delete-bin-line', action: () => promptDelete(node), dangerous: true },
  ];
  explorerContextMenu.innerHTML = '';

  const buildItem = (opt) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `menu-item ${opt.submenu ? 'has-submenu' : ''}`;
    button.disabled = Boolean(opt.disabled);
    button.innerHTML = `<span class="left"><i class="${opt.icon || 'ri-arrow-right-s-line'}"></i><span>${opt.label}</span></span>${opt.submenu ? '<i class="ri-arrow-right-s-line"></i>' : ''}`;
    if (opt.submenu) {
      const submenu = document.createElement('div');
      submenu.className = 'submenu';
      opt.submenu.forEach((sub) => {
        const subButton = document.createElement('button');
        subButton.type = 'button';
        subButton.className = 'menu-item';
        subButton.innerHTML = `<span class="left"><i class="${sub.icon || 'ri-arrow-right-s-line'}"></i><span>${sub.label}</span></span>`;
        subButton.addEventListener('click', () => {
          sub.action();
          closeContextMenu();
        });
        submenu.appendChild(subButton);
      });
      button.appendChild(submenu);
    } else {
      button.addEventListener('click', () => {
        if (opt.disabled) return;
        opt.action();
        closeContextMenu();
      });
    }
    return button;
  };

  options.forEach((opt) => {
    if (opt.separator) {
      const separator = document.createElement('div');
      separator.className = 'menu-separator';
      explorerContextMenu.appendChild(separator);
      return;
    }
    explorerContextMenu.appendChild(buildItem(opt));
  });

  explorerContextMenu.style.left = `${event.pageX}px`;
  explorerContextMenu.style.top = `${event.pageY}px`;
  explorerContextMenu.classList.remove('hidden');
}

function closeContextMenu() {
  explorerContextMenu.classList.add('hidden');
}

document.addEventListener('click', closeContextMenu);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeContextMenu();
  if (event.ctrlKey && event.key.toLowerCase() === 'n') {
    event.preventDefault();
    promptCreate('file', currentDirectory || '');
  }
  if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'n') {
    event.preventDefault();
    promptCreate('folder', currentDirectory || '');
  }
  if (event.ctrlKey && event.key.toLowerCase() === 'f') {
    event.preventDefault();
    explorerSearch.focus();
  }
});

function promptCreate(type, basePath) {
  const kind = type === 'folder' ? 'pasta' : 'arquivo';
  const name = window.prompt(`Informe o nome do ${kind}:`);
  if (!name) return;
  createNode(type, basePath, name);
}

async function createNode(type, basePath, name) {
  try {
    const response = await fetchJson('/api/explorer/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, basePath, name }),
    });
    if (response.success) {
      await refreshExplorerAfterMutation(basePath || currentDirectory || '');
    } else {
      setExplorerStatus(response.error);
    }
  } catch (error) {
    setExplorerStatus('Não foi possível criar o item.');
  }
}

function promptRename(node) {
  const name = window.prompt('Informe o novo nome:', node.name);
  if (!name || name === node.name) return;
  renameNode(node.path, name);
}

async function renameNode(targetPath, newName) {
  try {
    const response = await fetchJson('/api/explorer/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetPath, newName }),
    });
    if (response.success) {
      const destinationDir = targetPath.includes('/') ? targetPath.slice(0, targetPath.lastIndexOf('/')) : '';
      await refreshExplorerAfterMutation(destinationDir || currentDirectory || '');
    } else {
      setExplorerStatus(response.error);
    }
  } catch (error) {
    setExplorerStatus('Não foi possível renomear o item.');
  }
}

function promptDelete(node) {
  if (uiPreferences.confirmarExclusao && !window.confirm(`Excluir ${node.name}?`)) return;
  deleteNode(node.path);
}

async function deleteNode(targetPath) {
  try {
    const response = await fetchJson('/api/explorer/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetPath }),
    });
    if (response.success) {
      if (selectedPath === targetPath) {
        selectedPath = '';
      }
      await refreshExplorerAfterMutation(currentDirectory || '');
    } else {
      setExplorerStatus(response.error);
    }
  } catch (error) {
    setExplorerStatus('Não foi possível excluir o item.');
  }
}

function copyNode(node) {
  clipboard = { ...node, action: 'copy' };
  setExplorerStatus(`${node.name} copiado.`);
}

function cutNode(node) {
  clipboard = { ...node, action: 'move' };
  setExplorerStatus(`${node.name} recortado.`);
}

function pasteNode(destinationPath, itemOverride = null) {
  const item = itemOverride || clipboard;
  if (!item) return;
  return fetchJson('/api/explorer/paste', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item, destinationPath }),
  }).then((response) => {
    if (response.success) {
      refreshExplorerAfterMutation(destinationPath || currentDirectory || '');
      setExplorerStatus('Colado com sucesso.');
      if (clipboard?.action === 'move') {
        clipboard = null;
      }
    } else {
      setExplorerStatus(response.error);
    }
  }).catch(() => setExplorerStatus('Não foi possível colar o item.'));
}

function duplicateNode(node) {
  return fetchJson('/api/explorer/duplicate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: node.path }),
  }).then((response) => {
    if (response.success) {
      refreshExplorerAfterMutation(currentDirectory || '');
      setExplorerStatus('Duplicado com sucesso.');
    } else {
      setExplorerStatus(response.error);
    }
  }).catch(() => setExplorerStatus('Não foi possível duplicar o item.'));
}

function openNode(node) {
  if (node.type === 'directory') {
    setCurrentDirectory(node.path);
    return;
  }
  openFileFromExplorer(node.path);
}

async function moveNode(node) {
  const defaultDestination = currentDirectory || getPathParent(node.path);
  const destinationPath = window.prompt('Mover para (caminho relativo):', defaultDestination);
  if (destinationPath === null) return;
  if (!destinationPath.trim()) {
    setExplorerStatus('Destino inválido para mover.');
    return;
  }
  await pasteNode(destinationPath.trim(), { ...node, action: 'move' });
}

async function downloadNode(node) {
  if (node.type === 'directory') {
    try {
      const response = await fetchJson('/api/zip/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: node.path || '.' }),
      });
      if (!response.success) {
        setExplorerStatus(response.error || 'Não foi possível preparar o download.');
        return;
      }
      window.open(`/api/zip/download?archive=${encodeURIComponent(response.archiveName)}`, '_blank');
      setExplorerStatus(`Download iniciado: ${response.archiveName}`);
    } catch (error) {
      setExplorerStatus('Não foi possível preparar o download.');
    }
    return;
  }

  try {
    const response = await fetchJson('/api/file/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: node.path }),
    });
    if (!response.success) {
      setExplorerStatus(response.error || 'Não foi possível baixar o arquivo.');
      return;
    }
    const blob = new Blob([response.content || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = node.name || 'arquivo.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setExplorerStatus(`Download iniciado: ${node.name}`);
  } catch (error) {
    setExplorerStatus('Não foi possível baixar o arquivo.');
  }
}

async function copyNodePath(targetPath) {
  try {
    await navigator.clipboard.writeText(targetPath || '');
    setExplorerStatus('Caminho copiado para a área de transferência.');
  } catch (error) {
    setExplorerStatus('Não foi possível copiar o caminho.');
  }
}

function openSearch() {
  if (!editor) return;
  editor.getAction('actions.find').run();
}

function openReplace() {
  if (!editor) return;
  editor.getAction('editor.action.startFindReplaceAction').run();
}

function notifyEditorOfSelection(path) {
  selectedPath = path;
  editorPath.value = path;
  updateSelectionStyles();
  document.dispatchEvent(new CustomEvent('file-selected', { detail: { path } }));
}

function updateSelectionStyles() {
  document.querySelectorAll('#fileList tr').forEach((item) => {
    item.classList.toggle('selected', selectedExplorerPaths.has(item.dataset.filePath));
  });
  document.querySelectorAll('.tree-row').forEach((item) => {
    item.classList.toggle('selected', selectedExplorerPaths.has(item.dataset.path));
  });
}

function openFileFromExplorer(path) {
  notifyEditorOfSelection(path);
  loadFileFromPath(path);
  setActiveTab('editor');
}

function selectFile(path, entry = null, event = null) {
  const items = getSortedExplorerItems(applyExplorerFilter(filteredListing));
  const clickedIndex = items.findIndex((item) => item.path === path);

  if (event?.shiftKey && explorerActiveIndex >= 0 && clickedIndex >= 0) {
    const start = Math.min(explorerActiveIndex, clickedIndex);
    const end = Math.max(explorerActiveIndex, clickedIndex);
    selectedExplorerPaths = new Set(items.slice(start, end + 1).map((item) => item.path));
  } else if (event?.ctrlKey || event?.metaKey) {
    if (selectedExplorerPaths.has(path)) {
      selectedExplorerPaths.delete(path);
    } else {
      selectedExplorerPaths.add(path);
    }
    explorerActiveIndex = clickedIndex;
  } else {
    selectedExplorerPaths = new Set([path]);
    explorerActiveIndex = clickedIndex;
  }

  notifyEditorOfSelection(path);
  selectedExplorerEntry = entry;
  if (entry?.type === 'file') {
    addRecentFile(path);
  }
  if (entry) {
    renderFolderSummary(entry, []);
  }
  updateSelectionStyles();
}

function setExplorerLoading(isLoading) {
  explorerLoader.classList.toggle('hidden', !isLoading);
}

function setExplorerStatus(message) {
  explorerStatusText.textContent = message;
}

function addRecentFile(path) {
  recentFiles = [path, ...recentFiles.filter((item) => item !== path)].slice(0, 12);
  renderRecent();
}

function renderFavorites() {
  favoriteList.innerHTML = '';
  favorites.forEach((path) => {
    const item = document.createElement('li');
    item.textContent = path.split('/').pop();
    item.title = path;
    item.tabIndex = 0;
    item.addEventListener('click', () => loadFileFromPath(path));
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') loadFileFromPath(path);
    });
    favoriteList.appendChild(item);
  });
}

function toggleFavorite(path) {
  if (favorites.has(path)) {
    favorites.delete(path);
    setExplorerStatus(`${path.split('/').pop()} removido dos favoritos.`);
  } else {
    favorites.add(path);
    setExplorerStatus(`${path.split('/').pop()} adicionado aos favoritos.`);
  }
  renderFavorites();
  renderFileList(filteredListing);
}

function renderRecent() {
  recentList.innerHTML = '';
  recentFiles.forEach((path) => {
    const item = document.createElement('li');
    item.textContent = path.split('/').pop();
    item.title = path;
    item.tabIndex = 0;
    item.addEventListener('click', () => loadFileFromPath(path));
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') loadFileFromPath(path);
    });
    recentList.appendChild(item);
  });
}

function getPathParent(targetPath = '') {
  if (!targetPath || !targetPath.includes('/')) return '';
  return targetPath.slice(0, targetPath.lastIndexOf('/'));
}

function formatExplorerSize(bytes) {
  const value = Number(bytes || 0);
  if (!value) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let current = value;
  while (current >= 1024 && unitIndex < units.length - 1) {
    current /= 1024;
    unitIndex += 1;
  }
  return `${current.toFixed(current >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatExplorerDate(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('pt-BR');
}

function getExplorerDisplayName(name, fallback = 'Espaço de Trabalho') {
  if (!name) return fallback;
  if (name.toLowerCase() === 'workspace') return 'Espaço de Trabalho';
  return name;
}

function renderFolderSummary(directory, listing) {
  if (!directory) {
    explorerFolderSummary.innerHTML = '<div class="summary-title">Nenhum item selecionado</div>';
    renderExplorerProperties(null, []);
    return;
  }
  const safeListing = Array.isArray(listing) ? listing : [];
  const itemPath = directory.path || currentDirectory || '';
  const fullPath = `${rootPath.textContent || ''}${itemPath ? `/${itemPath}` : ''}`;
  const createdAt = formatExplorerDate(directory.createdAt);
  const updatedAt = formatExplorerDate(directory.modifiedAt);
  const permissions = directory.permissions || '-';
  const filesCount = directory.type === 'directory'
    ? (directory.totalFiles ?? directory.childFileCount ?? safeListing.filter((item) => item.type === 'file').length)
    : '-';
  const dirsCount = directory.type === 'directory'
    ? (directory.totalDirectories ?? directory.childDirectoryCount ?? safeListing.filter((item) => item.type === 'directory').length)
    : '-';
  const isFile = directory.type === 'file';
  if (isFile) {
    explorerFolderSummary.innerHTML = `
      <div class="summary-title">${getExplorerDisplayName(directory.name, 'Arquivo')}</div>
      <div class="summary-grid">
        <div><strong>Nome:</strong> ${getExplorerDisplayName(directory.name, '-')}</div>
        <div><strong>Tipo:</strong> Arquivo</div>
        <div><strong>Caminho completo:</strong> ${fullPath || '-'}</div>
        <div><strong>Tamanho:</strong> ${formatExplorerSize(directory.size || 0)}</div>
        <div><strong>Data de criação:</strong> ${createdAt}</div>
        <div><strong>Última alteração:</strong> ${updatedAt}</div>
        <div><strong>Permissões:</strong> ${permissions}</div>
        <div><strong>Arquivos:</strong> -</div>
        <div><strong>Subpastas:</strong> -</div>
      </div>
      <div class="summary-open-file"><button type="button" id="openFileFromSummary" title="Abrir arquivo selecionado">Abrir</button></div>
    `;
    const openButton = document.getElementById('openFileFromSummary');
    if (openButton && directory.path) {
      openButton.addEventListener('click', () => openFileFromExplorer(directory.path));
    }
    renderExplorerProperties(directory, listing);
    return;
  }
  const totalSize = safeListing.reduce((acc, item) => acc + Number(item.size || 0), 0);
  explorerFolderSummary.innerHTML = `
    <div class="summary-title">${getExplorerDisplayName(directory.name)}</div>
    <div class="summary-grid">
      <div><strong>Nome:</strong> ${getExplorerDisplayName(directory.name)}</div>
      <div><strong>Tipo:</strong> Pasta</div>
      <div><strong>Caminho completo:</strong> ${fullPath || '-'}</div>
      <div><strong>Tamanho:</strong> ${formatExplorerSize(totalSize)}</div>
      <div><strong>Data de criação:</strong> ${createdAt}</div>
      <div><strong>Última alteração:</strong> ${updatedAt}</div>
      <div><strong>Permissões:</strong> ${permissions}</div>
      <div><strong>Arquivos:</strong> ${filesCount}</div>
      <div><strong>Subpastas:</strong> ${dirsCount}</div>
    </div>
    <div class="summary-open-file"><button type="button" id="openFolderFromSummary" title="Abrir pasta selecionada">Abrir</button></div>
  `;
  const openFolderButton = document.getElementById('openFolderFromSummary');
  if (openFolderButton && directory.path !== undefined) {
    openFolderButton.addEventListener('click', () => setCurrentDirectory(directory.path || ''));
  }
  renderExplorerProperties(directory, listing);
}

async function createZipFromNode(node) {
  try {
    const response = await fetchJson('/api/zip/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: node.path || '.' }),
    });
    if (!response.success) {
      setExplorerStatus(response.error || 'Não foi possível compactar.');
      return;
    }
    setExplorerStatus(`ZIP criado: ${response.archiveName}`);
  } catch (error) {
    setExplorerStatus('Não foi possível compactar.');
  }
}

function showNodeProperties(node) {
  renderExplorerProperties(node, filteredListing);
}

async function fetchTreeLevel(requestedPath = '') {
  const response = await fetchJson(`/api/project/tree?path=${encodeURIComponent(requestedPath)}&includeSystem=${includeSystemFiles}`);
  if (!response.success) {
    throw new Error(response.error || 'Não foi possível carregar a árvore.');
  }
  return response.tree || [];
}

async function expandTreeNode(li, node) {
  if (node.type !== 'directory' || !node.hasChildren) {
    return;
  }
  const nested = li.querySelector(':scope > ul.nested');
  const toggle = li.querySelector(':scope > .tree-row .tree-toggle');
  if (!nested || !toggle) {
    return;
  }

  if (li.classList.contains('expanded')) {
    li.classList.remove('expanded');
    expandedDirectories.delete(node.path);
    toggle.textContent = '▸';
    return;
  }

  if (!li.dataset.loaded) {
    nested.innerHTML = '<li class="tree-loading">Carregando...</li>';
    try {
      const children = await fetchTreeLevel(node.path);
      nested.innerHTML = '';
      nested.appendChild(renderTree(children));
      li.dataset.loaded = 'true';
    } catch (error) {
      nested.innerHTML = '<li class="tree-error">Não foi possível carregar a pasta.</li>';
      return;
    }
  }

  li.classList.add('expanded');
  expandedDirectories.add(node.path);
  toggle.textContent = '▾';
}

function renderTree(tree) {
  const ul = document.createElement('ul');
  ul.className = 'tree-root-list explorer-tree';
  tree.forEach((node) => {
    const li = document.createElement('li');
    li.className = 'tree-node';
    li.dataset.path = node.path;
    li.dataset.type = node.type;

    const row = document.createElement('div');
    row.className = `tree-row ${node.type}`;
    row.dataset.path = node.path;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'tree-toggle';
    if (node.type === 'directory' && node.hasChildren) {
      toggle.textContent = '▸';
      toggle.addEventListener('click', async (event) => {
        event.stopPropagation();
        await expandTreeNode(li, node);
      });
    } else {
      toggle.textContent = '';
      toggle.classList.add('placeholder');
    }

    const icon = document.createElement('span');
    icon.className = 'tree-icon';
    icon.innerHTML = getTreeIcon(node);

    const name = document.createElement('span');
    name.className = 'tree-name';
    name.textContent = node.name;

    row.appendChild(toggle);
    row.appendChild(icon);
    row.appendChild(name);

    row.setAttribute('role', 'treeitem');
    row.tabIndex = 0;

    row.addEventListener('click', async (event) => {
      event.stopPropagation();
      selectFile(node.path, node, event);
    });

    row.addEventListener('dblclick', async (event) => {
      event.stopPropagation();
      if (node.type === 'directory') {
        await setCurrentDirectory(node.path);
        return;
      }
      openFileFromExplorer(node.path);
    });

    row.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      showContextMenu(event, node);
    });

    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        openNode(node);
      }
      if (event.key.toLowerCase() === 'f') {
        event.preventDefault();
        toggleFavorite(node.path);
      }
    });

    li.appendChild(row);

    if (node.type === 'directory') {
      const nested = document.createElement('ul');
      nested.className = 'nested';
      li.appendChild(nested);
    }

    ul.appendChild(li);
  });
  return ul;
}

function filterScannerTree(tree, query) {
  if (!query) return tree;
  const lower = query.toLowerCase();
  return tree.reduce((acc, node) => {
    const matches = node.name.toLowerCase().includes(lower) || (node.path && node.path.toLowerCase().includes(lower));
    if (node.type === 'folder') {
      const children = filterScannerTree(node.children || [], query);
      if (matches || children.length) {
        acc.push({ ...node, children });
      }
    } else if (matches) {
      acc.push(node);
    }
    return acc;
  }, []);
}

function renderScannerTree(tree) {
  const ul = document.createElement('ul');
  ul.className = 'scanner-tree-root';
  tree.forEach((node) => {
    const li = document.createElement('li');
    li.className = `scanner-tree-node ${node.type}`;

    const row = document.createElement('div');
    row.className = `scanner-tree-row ${node.type}`;

    const icon = document.createElement('span');
    icon.className = 'tree-icon';
    icon.innerHTML = node.type === 'folder' ? '<i class="ri-folder-3-line" aria-hidden="true"></i>' : getTreeIcon(node);

    const label = document.createElement('span');
    label.className = 'tree-name';
    label.textContent = node.name;

    row.appendChild(icon);
    row.appendChild(label);
    li.appendChild(row);

    if (node.children && node.children.length > 0) {
      const childrenList = renderScannerTree(node.children);
      childrenList.classList.add('nested');
      li.appendChild(childrenList);
    }

    ul.appendChild(li);
  });
  return ul;
}

function renderScannerSummary(summary) {
  const lines = [];
  lines.push(`<div><strong>Projeto:</strong> ${summary.projectName || 'Desconhecido'}</div>`);
  lines.push(`<div><strong>Gerenciador de pacotes:</strong> ${summary.packageManager || 'desconhecido'}</div>`);
  lines.push(`<div><strong>Arquivos:</strong> ${summary.totalFiles ?? 0}</div>`);
  lines.push(`<div><strong>Pastas:</strong> ${summary.totalFolders ?? 0}</div>`);
  lines.push(`<div><strong>Tamanho analisado:</strong> ${formatExplorerSize(summary.statistics?.totalBytes || 0)}</div>`);
  lines.push(`<div><strong>Arquivos indexados:</strong> ${summary.statistics?.indexedFiles ?? 0}</div>`);
  lines.push(`<div><strong>Tecnologias:</strong> ${(summary.technologies || []).join(', ') || 'Nenhuma detectada'}</div>`);
  lines.push(`<div><strong>Frameworks:</strong> ${(summary.frameworks || []).join(', ') || 'Nenhum detectado'}</div>`);
  if (summary.entryPoints && summary.entryPoints.length) {
    lines.push(`<div><strong>Pontos de entrada:</strong> ${summary.entryPoints.join(', ')}</div>`);
  }
  if (summary.buildScripts && Object.keys(summary.buildScripts).length) {
    lines.push(`<div><strong>Scripts:</strong> ${Object.entries(summary.buildScripts).map(([key, value]) => `${key}: ${value}`).join(', ')}</div>`);
  }
  scannerSummary.innerHTML = lines.map((line) => `<div class="scanner-summary-item">${line}</div>`).join('');
}

function renderScannerTechnologies(technologies) {
  if (!technologies || technologies.length === 0) {
    scannerTechnologies.innerHTML = '<div class="scanner-tech-item">Nenhuma tecnologia detectada até o momento.</div>';
    return;
  }
  scannerTechnologies.innerHTML = technologies.map((tech) => `<div class="scanner-tech-item">${tech}</div>`).join('');
}

function formatScannerStatus(status) {
  const map = {
    idle: 'ocioso',
    starting: 'iniciando',
    scanning: 'varrendo',
    complete: 'concluído',
    cancelled: 'cancelado',
    failed: 'falhou',
  };
  return map[status] || status || 'ocioso';
}

function updateScannerStatus(state) {
  scannerStatus.textContent = formatScannerStatus(state.status);
  statusScanner.textContent = formatScannerStatus(state.status);
  scannerProgressFill.style.width = `${state.progress || 0}%`;
  scannerFolderCount.textContent = state.stats?.folders ?? 0;
  scannerFileCount.textContent = state.stats?.files ?? 0;
  scannerTreeData = state.tree || scannerTreeData;

  if (state.status === 'complete') {
    renderScannerSummary(state.summary || {});
    renderScannerTechnologies(state.technologies || []);
    scannerTree.innerHTML = '';
    scannerTree.appendChild(renderScannerTree(scannerTreeData));
  } else if (state.status === 'failed') {
    scannerSummary.innerHTML = `<div class="message">Varredura falhou: ${state.error || 'Erro desconhecido'}</div>`;
    scannerTree.innerHTML = '';
    scannerTechnologies.innerHTML = '';
  } else if (state.status === 'cancelled') {
    scannerSummary.innerHTML = '<div class="message">Varredura cancelada.</div>';
    scannerTree.innerHTML = '';
    scannerTechnologies.innerHTML = '';
  } else {
    scannerSummary.innerHTML = '<div class="message">Varredura em andamento...</div>';
    scannerTree.innerHTML = '';
    scannerTechnologies.innerHTML = '';
  }
}

async function refreshScannerState() {
  try {
    const response = await fetchJson('/api/scanner/state');
    if (response.success) {
      updateScannerStatus(response.scan);
      return response.scan;
    }
  } catch (error) {
    scannerSummary.innerHTML = '<div class="message">Não foi possível obter o estado da varredura.</div>';
  }
  return null;
}

async function runScannerJob() {
  runScanner.disabled = true;
  cancelScanner.classList.remove('hidden');
  cancelScanner.disabled = false;
  scannerStatus.textContent = 'iniciando';
  try {
    const response = await fetchJson('/api/scanner/scan');
    if (!response.success) {
      scannerSummary.innerHTML = `<div class="message">${response.error || 'Não foi possível iniciar a varredura.'}</div>`;
      runScanner.disabled = false;
      cancelScanner.classList.add('hidden');
      return;
    }
    if (response.scan.status === 'complete') {
      const [treeResponse, summaryResponse] = await Promise.all([fetchJson('/api/scanner/tree?page=1&limit=500'), fetchJson('/api/scanner/summary')]);
      if (treeResponse.success) {
        response.scan.tree = treeResponse.tree;scannerTreePage = treeResponse.pagination?.page || 1;scannerTreePages = treeResponse.pagination?.pages || 1;
        loadMoreScanner?.classList.toggle('hidden', scannerTreePage >= scannerTreePages);
      }
      if (summaryResponse.success) response.scan.summary = summaryResponse.summary;
    }
    updateScannerStatus(response.scan);
    if (response.scan.status === 'scanning') {
      if (scannerPollTimer) clearInterval(scannerPollTimer);
      scannerPollTimer = setInterval(async () => {
        const progress = await refreshScannerState();
        if (!progress || progress.status !== 'scanning') {
          clearInterval(scannerPollTimer);
          scannerPollTimer = null;
          runScanner.disabled = false;
          cancelScanner.classList.add('hidden');
        }
      }, 800);
    } else {
      runScanner.disabled = false;
      cancelScanner.classList.add('hidden');
    }
  } catch (error) {
    scannerSummary.innerHTML = '<div class="message">Não foi possível iniciar a varredura.</div>';
    runScanner.disabled = false;
    cancelScanner.classList.add('hidden');
  }
}

async function cancelScannerJob() {
  cancelScanner.disabled = true;
  try {
    const response = await fetchJson('/api/scanner/cancel', { method: 'POST' });
    if (!response.success) {
      scannerSummary.innerHTML = `<div class="message">${response.error || 'Não foi possível cancelar a varredura.'}</div>`;
      return;
    }
    if (scannerPollTimer) {
      clearInterval(scannerPollTimer);
      scannerPollTimer = null;
    }
    updateScannerStatus(response.scan || { status: 'cancelled', progress: Number(scannerProgressFill.style.width.replace('%', '')) || 0 });
  } catch (error) {
    scannerSummary.innerHTML = '<div class="message">Não foi possível cancelar a varredura.</div>';
  } finally {
    runScanner.disabled = false;
    cancelScanner.classList.add('hidden');
  }
}

scannerSearch.addEventListener('input', () => {
  const filtered = filterScannerTree(scannerTreeData, scannerSearch.value.trim());
  scannerTree.innerHTML = '';
  scannerTree.appendChild(renderScannerTree(filtered));
});

function getTreeIcon(node) {
  return `<i class="${getNodeIconClass(node)}" aria-hidden="true"></i>`;
}

async function setCurrentDirectory(path) {
  notifyEditorOfSelection(path);
  selectedExplorerEntry = null;
  selectedExplorerPaths = new Set(path ? [path] : []);
  currentDirectory = path;
  buildBreadcrumb(path);
  statusCurrentFolder.textContent = path || '/';
  await listFolder(path);
}

function buildBreadcrumb(path) {
  explorerBreadcrumb.innerHTML = '';
  const parts = path ? path.split('/') : [];
  let current = '';
  const home = document.createElement('span');
  home.textContent = 'Espaço de Trabalho';
  home.addEventListener('click', () => setCurrentDirectory(''));
  explorerBreadcrumb.appendChild(home);
  parts.forEach((part) => {
    if (!part) return;
    const separator = document.createElement('span');
    separator.textContent = ' > ';
    explorerBreadcrumb.appendChild(separator);
    current = current ? `${current}/${part}` : part;
    const crumb = document.createElement('span');
    crumb.textContent = part;
    crumb.addEventListener('click', () => setCurrentDirectory(current));
    explorerBreadcrumb.appendChild(crumb);
  });
}

async function loadProjectTree() {
  try {
    const tree = await fetchTreeLevel('');
    projectTree.innerHTML = '';
    const rootLabel = document.createElement('div');
    rootLabel.className = 'tree-root';
    rootLabel.textContent = 'Espaço de Trabalho';
    rootLabel.addEventListener('click', () => setCurrentDirectory(''));
    projectTree.appendChild(rootLabel);
    projectTree.appendChild(renderTree(tree));

    for (const path of expandedDirectories) {
      const li = projectTree.querySelector(`.tree-node[data-path="${CSS.escape(path)}"]`);
      if (li) {
        const nodeName = li.querySelector(':scope > .tree-row .tree-name')?.textContent || '';
        const node = { path, type: 'directory', hasChildren: true, name: nodeName };
        await expandTreeNode(li, node);
      }
    }

    updateSelectionStyles();
  } catch (error) {
    projectTree.textContent = 'Não foi possível carregar a árvore de arquivos.';
  }
}

async function listFolder(folderPath = '') {
  setExplorerLoading(true);
  try {
    const response = await fetchJson(`/api/explorer?path=${encodeURIComponent(folderPath)}&includeSystem=${includeSystemFiles}`);
    if (response.success) {
      filteredListing = response.listing;
      currentDirectory = folderPath;
      renderFileList(response.listing);
      renderFolderSummary(response.directory, response.listing);
      setExplorerStatus(`${response.listing.length} itens listados`);
      buildBreadcrumb(folderPath);
      statusCurrentFolder.textContent = folderPath || '/';
    }
  } catch (error) {
    fileList.innerHTML = '';
    renderFolderSummary(null, []);
    setExplorerStatus('Falha ao carregar diretório.');
  } finally {
    setExplorerLoading(false);
  }
}

async function refreshTreeLevel(targetPath = '') {
  const children = await fetchTreeLevel(targetPath);
  if (!targetPath) {
    projectTree.innerHTML = '';
    const rootLabel = document.createElement('div');
    rootLabel.className = 'tree-root';
    rootLabel.textContent = 'Espaço de Trabalho';
    rootLabel.addEventListener('click', () => setCurrentDirectory(''));
    projectTree.appendChild(rootLabel);
    projectTree.appendChild(renderTree(children));
    for (const path of expandedDirectories) {
      const li = projectTree.querySelector(`.tree-node[data-path="${CSS.escape(path)}"]`);
      if (!li) continue;
      const nodeName = li.querySelector(':scope > .tree-row .tree-name')?.textContent || '';
      await expandTreeNode(li, { path, type: 'directory', hasChildren: true, name: nodeName });
    }
    return;
  }

  const parentNode = projectTree.querySelector(`.tree-node[data-path="${CSS.escape(targetPath)}"]`);
  if (!parentNode) {
    await loadProjectTree();
    return;
  }

  const nested = parentNode.querySelector(':scope > ul.nested');
  if (!nested) return;
  nested.innerHTML = '';
  nested.appendChild(renderTree(children));
  parentNode.dataset.loaded = 'true';
  if (expandedDirectories.has(targetPath)) {
    parentNode.classList.add('expanded');
    const toggle = parentNode.querySelector(':scope > .tree-row .tree-toggle');
    if (toggle) toggle.textContent = '▾';
  }
}

async function refreshExplorerAfterMutation(affectedPath = currentDirectory || '') {
  const parentPath = getPathParent(affectedPath);
  const tasks = [
    listFolder(currentDirectory || ''),
    refreshTreeLevel(parentPath),
  ];
  if (affectedPath && expandedDirectories.has(affectedPath)) {
    tasks.push(refreshTreeLevel(affectedPath));
  }
  await Promise.all(tasks);
  updateSelectionStyles();
}

function getSortableValue(item, key) {
  if (key === 'icon') return getTreeIcon(item);
  if (key === 'name') return (item.name || '').toLowerCase();
  if (key === 'type') return item.type === 'directory' ? '0' : '1';
  if (key === 'size') return Number(item.size || 0);
  if (key === 'modifiedAt') return new Date(item.modifiedAt || 0).getTime() || 0;
  if (key === 'childFileCount') return Number(item.childFileCount || 0);
  if (key === 'childDirectoryCount') return Number(item.childDirectoryCount || 0);
  return (item[key] || '').toString().toLowerCase();
}

function updateExplorerSortHeaders() {
  explorerTableHeaders.forEach((header) => {
    const key = header.dataset.sortKey;
    const base = header.textContent.replace(/[\s▲▼]+$/g, '').trim();
    header.textContent = base;
    header.removeAttribute('aria-sort');
    if (key === explorerSort.key) {
      header.textContent = `${base} ${explorerSort.direction > 0 ? '▲' : '▼'}`;
      header.setAttribute('aria-sort', explorerSort.direction > 0 ? 'ascending' : 'descending');
    }
  });
}

function getSortedExplorerItems(items) {
  return [...items].sort((a, b) => {
    const left = getSortableValue(a, explorerSort.key);
    const right = getSortableValue(b, explorerSort.key);
    if (left === right) return 0;
    return left > right ? explorerSort.direction : -explorerSort.direction;
  });
}

function renderFileList(listing) {
  fileList.innerHTML = '';
  const items = getSortedExplorerItems(applyExplorerFilter(listing));
  updateGlobalExplorerCounters(items);
  explorerEmptyState.classList.toggle('hidden', items.length > 0);
  if (items.length === 0) return;

  items.forEach((item) => {
    const row = document.createElement('tr');
    row.dataset.filePath = item.path;
    row.dataset.type = item.type;
    row.draggable = true;

    const moreActionsButton = `<span class="file-actions"><button type="button" class="more-actions" title="Mais ações" aria-label="Mais ações"><i class="ri-more-2-fill"></i></button></span>`;
    const iconClass = getNodeIconClass(item);
    const isPreviewable = item.type === 'file' && /\.(png|jpg|jpeg|gif|webp)$/i.test(item.name || '');
    const preview = isPreviewable ? '<span class="muted" title="Miniatura disponível para arquivo de imagem"><i class="ri-image-line"></i></span>' : '';

    row.innerHTML = `
      <td><span class="file-icon large" title="${item.type === 'directory' ? 'Pasta' : 'Arquivo'}"><i class="${iconClass}"></i></span></td>
      <td><div class="explorer-name-cell"><span class="file-name">${item.name}</span>${preview}${moreActionsButton}</div></td>
      <td>${item.type === 'directory' ? 'Pasta' : 'Arquivo'}</td>
      <td>${item.type === 'directory' ? '-' : formatExplorerSize(item.size)}</td>
      <td>${formatExplorerDate(item.modifiedAt)}</td>
      <td>${item.type === 'directory' ? (item.childFileCount ?? 0) : '-'}</td>
      <td>${item.type === 'directory' ? (item.childDirectoryCount ?? 0) : '-'}</td>
    `;

    row.addEventListener('click', (event) => {
      selectFile(item.path, item, event);
    });

    row.addEventListener('dblclick', () => {
      openNode(item);
    });

    row.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      showContextMenu(event, item);
    });

    row.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', JSON.stringify({ ...item, action: 'move' }));
      row.classList.add('dragging');
    });

    row.addEventListener('dragend', () => {
      row.classList.remove('dragging');
    });

    row.addEventListener('dragover', (event) => {
      if (item.type === 'directory') {
        event.preventDefault();
      }
    });

    row.addEventListener('drop', (event) => {
      event.preventDefault();
      if (item.type === 'directory') {
        const data = event.dataTransfer.getData('text/plain');
        if (data) {
          const dragged = JSON.parse(data);
          pasteNode(item.path, dragged);
        }
      }
    });

    const moreActions = row.querySelector('.more-actions');
    if (moreActions) {
      moreActions.addEventListener('click', (event) => {
        event.stopPropagation();
        const rect = moreActions.getBoundingClientRect();
        showContextMenu({ pageX: rect.left + window.scrollX, pageY: rect.bottom + window.scrollY }, item);
      });
    }

    fileList.appendChild(row);
  });

  const rows = Array.from(fileList.querySelectorAll('tr'));
  fileList.tabIndex = 0;
  fileList.onkeydown = (event) => {
    if (!rows.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (explorerActiveIndex < 0) explorerActiveIndex = 0;
      explorerActiveIndex += event.key === 'ArrowDown' ? 1 : -1;
      explorerActiveIndex = Math.max(0, Math.min(rows.length - 1, explorerActiveIndex));
      const target = rows[explorerActiveIndex];
      const node = items.find((entry) => entry.path === target.dataset.filePath);
      if (node) {
        selectedExplorerPaths = new Set([node.path]);
        selectFile(node.path, node);
        target.scrollIntoView({ block: 'nearest' });
      }
    }
    if (event.key === 'Enter') {
      const node = getSelectedExplorerNode();
      if (node) openNode(node);
    }
    if (event.key === 'Delete') {
      const node = getSelectedExplorerNode();
      if (node) promptDelete(node);
    }
  };

  updateSelectionStyles();
}

function applyExplorerFilter(listing) {
  if (!explorerSearch.value.trim()) return listing;
  const query = explorerSearch.value.toLowerCase().trim();
  return listing.filter((item) => item.name.toLowerCase().includes(query) || item.path.toLowerCase().includes(query));
}

refreshExplorer.addEventListener('click', () => setCurrentDirectory(currentDirectory || ''));
newFile.addEventListener('click', () => promptCreate('file', currentDirectory || ''));
newFolder.addEventListener('click', () => promptCreate('folder', currentDirectory || ''));
explorerNewFile.addEventListener('click', () => promptCreate('file', currentDirectory || ''));
explorerNewFolder.addEventListener('click', () => promptCreate('folder', currentDirectory || ''));
explorerSearch.addEventListener('input', () => renderFileList(filteredListing));
showSystemFiles.addEventListener('change', async () => {
  includeSystemFiles = showSystemFiles.checked;
  expandedDirectories.clear();
  await loadProjectTree();
  await listFolder(currentDirectory || '');
});
clearExplorerSearch.addEventListener('click', () => {
  explorerSearch.value = '';
  renderFileList(filteredListing);
});

explorerTableHeaders.forEach((header) => {
  header.tabIndex = 0;
  header.style.cursor = 'pointer';
  header.addEventListener('click', () => {
    const key = header.dataset.sortKey;
    if (explorerSort.key === key) {
      explorerSort.direction *= -1;
    } else {
      explorerSort = { key, direction: 1 };
    }
    updateExplorerSortHeaders();
    renderFileList(filteredListing);
  });
  header.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      header.click();
    }
  });
});
updateExplorerSortHeaders();

sidebarResize.addEventListener('mousedown', (event) => {
  event.preventDefault();
  const startX = event.clientX;
  const startWidth = document.getElementById('explorerSidebar').offsetWidth;

  function move(event) {
    const newWidth = startWidth + event.clientX - startX;
    document.getElementById('explorerSidebar').style.width = `${Math.max(200, Math.min(480, newWidth))}px`;
  }

  function up() {
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);
  }

  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
});

loadFile.addEventListener('click', () => loadFileFromPath(editorPath.value.trim()));

saveFile.addEventListener('click', () => saveCurrentFile());

findFile.addEventListener('click', openSearch);
replaceFile.addEventListener('click', openReplace);
saveAsFile.addEventListener('click', saveAsCurrentFile);
zoomIn.addEventListener('click', () => updateFontSize(2));
zoomOut.addEventListener('click', () => updateFontSize(-2));

runCommand.addEventListener('click', executeTerminalCommand);
clearTerminal.addEventListener('click', clearTerminalOutput);
terminalCommand.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    executeTerminalCommand();
  }
});

function setZipBusy(isBusy, message = '') {
  createZip.disabled = isBusy;
  exportProjectZip.disabled = isBusy;
  importZip.disabled = isBusy;
  if (selectZipImportFile) selectZipImportFile.disabled = isBusy;
  if (message) {
    zipResult.textContent = message;
  }
}

function triggerZipDownload(url, fileName = 'arquivo.zip') {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function requestZipCreation(requestedPath, options = {}) {
  const normalizedPath = requestedPath || '.';
  const isProjectExport = Boolean(options.autoDownload);
  setZipBusy(true, isProjectExport ? 'Exportando projeto em ZIP...' : 'Criando arquivo ZIP...');
  try {
    const response = await fetchJson('/api/zip/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: normalizedPath }),
    });
    if (!response.success) {
      zipResult.textContent = response.error || 'Não foi possível criar o ZIP.';
      return null;
    }

    const url = `/api/zip/download?archive=${encodeURIComponent(response.archiveName)}`;
    const entriesInfo = response.entriesCount ? ` (${response.entriesCount} item${response.entriesCount > 1 ? 's' : ''})` : '';
    const archivePath = `${rootPath.textContent || 'C:\\FallahAgent'}\\temp\\${response.archiveName}`;
    zipResult.innerHTML = `ZIP criado${entriesInfo}. <button type="button" data-zip-action="open">Abrir pasta</button> <button type="button" data-zip-action="download">Baixar novamente</button> <button type="button" data-zip-action="copy">Copiar caminho</button>`;
    zipResult.querySelector('[data-zip-action="download"]')?.addEventListener('click', () => triggerZipDownload(url, response.archiveName));
    zipResult.querySelector('[data-zip-action="copy"]')?.addEventListener('click', () => copyTextToClipboard(archivePath));
    zipResult.querySelector('[data-zip-action="open"]')?.addEventListener('click', async () => {
      await fetchJson('/api/terminal/exec', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: `explorer.exe /select,"${archivePath}"` }) });
    });
    if (isProjectExport) {
      triggerZipDownload(url, response.archiveName || 'projeto.zip');
    }
    return response;
  } catch (error) {
    zipResult.textContent = 'Não foi possível criar o ZIP.';
    return null;
  } finally {
    setZipBusy(false);
  }
}

createZip.addEventListener('click', async () => {
  await requestZipCreation(zipPath.value.trim() || '.');
});

async function executeTerminalCommand() {
  const command = terminalCommand.value.trim();
  if (!command) {
    return;
  }

  try {
    runCommand.disabled = true;
    cancelTerminal.classList.remove('hidden');
    cancelTerminal.disabled = false;
    activeTerminalAbort = new AbortController();

    const responseRaw = await fetch('/api/terminal/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
      signal: activeTerminalAbort.signal,
    });
    const response = await responseRaw.json();
    if (response.success) {
      const result = response.result;
      appendTerminalOutput(`> ${result.command}\nCódigo de saída: ${result.code}\n${result.output || result.error}${result.cancelled ? '\n[cancelado]' : ''}\n`);
      terminalCommand.value = '';
      terminalHistory.push(result);
    } else {
      appendTerminalOutput(`Erro: ${response.error}\n`);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      appendTerminalOutput('Comando cancelado.\n');
    } else {
      appendTerminalOutput('Não foi possível executar o comando.\n');
    }
  } finally {
    runCommand.disabled = false;
    cancelTerminal.classList.add('hidden');
    activeTerminalAbort = null;
  }
}

async function cancelTerminalCommand() {
  if (activeTerminalAbort) {
    activeTerminalAbort.abort();
  }
  try {
    await fetchJson('/api/terminal/cancel', { method: 'POST' });
  } catch (error) {
    // Best-effort cancellation.
  }
}

function appendTerminalOutput(message) {
  terminalOutput.textContent += `${message}\n`;
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function clearTerminalOutput() {
  terminalOutput.textContent = '';
}

async function loadConversations(page = 1, append = false) {
  try {
    const search = chatConversationSearch?.value.trim() || '';
    const response = await fetchJson(`/api/chat/conversations?page=${page}&limit=50&search=${encodeURIComponent(search)}`);
    if (response.success) {
      chatConversations = append ? [...chatConversations, ...response.conversations] : response.conversations;
      conversationPage = response.pagination?.page || page;conversationPages = response.pagination?.pages || 1;
      loadMoreConversations?.classList.toggle('hidden', conversationPage >= conversationPages);
      renderConversationList(chatConversations);
      if (!selectedConversationId && chatConversations.length > 0) {
        await selectConversation(chatConversations[0].id);
      }
    }
  } catch (error) {
    console.warn('Não foi possível carregar conversas', error);
  }
}

function setChatStatus(message, busy = false) {
  if (!chatStatus) return;
  chatStatus.textContent = message;
  chatStatus.classList.toggle('hidden', !busy);
  chatStatus.style.opacity = busy ? '1' : '0';
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function highlightCode(code, language) {
  let html = escapeHtml(code);
  const supported = /^(?:js|javascript|ts|typescript|jsx|tsx|json|python|py|java|c|cpp|cs|go|rust|php|rb|ruby|sh|bash|powershell|ps1)$/i.test(language);
  if (!supported) return html;
  return html.replace(/\b(const|let|var|function|async|await|return|if|else|for|while|class|new|try|catch|throw|import|export|from|require|true|false|null|undefined|def|in|and|or|not|self|public|private|static|void)\b/g, '<strong>$1</strong>');
}

function renderMarkdown(text) {
  if (!text) return '';
  const codeBlocks = [];
  let html = String(text).replace(/```([\w+-]*)\n?([\s\S]*?)```/g, (match, language, code) => {
    const rawCode = code.replace(/\s+$/, '');
    const index = codeBlocks.push({ language: language || 'text', code: rawCode }) - 1;
    return `@@CODE_BLOCK_${index}@@`;
  });
  html = escapeHtml(html);
  html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>').replace(/^## (.+)$/gm, '<h3>$1</h3>').replace(/^# (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  html = html.replace(/^- \[([ xX])\] (.+)$/gm, (match, checked, label) => `<label><input type="checkbox" disabled ${checked.trim() ? 'checked' : ''}> ${label}</label>`);
  html = html.replace(/^[-*] (.+)$/gm, '• $1').replace(/^\d+\. (.+)$/gm, '1. $1');
  const lines = html.split('\n');
  for (let index = 0; index + 1 < lines.length; index += 1) {
    if (!lines[index].includes('|') || !/^\s*\|?\s*:?-+/.test(lines[index + 1])) continue;
    const headers = lines[index].split('|').map((cell) => cell.trim()).filter(Boolean);
    const rows = [];let cursor = index + 2;
    while (cursor < lines.length && lines[cursor].includes('|')) { rows.push(lines[cursor].split('|').map((cell) => cell.trim()).filter(Boolean));cursor += 1; }
    lines.splice(index, cursor - index, `<table><thead><tr>${headers.map((cell) => `<th>${cell}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
  }
  html = lines.join('\n');
  html = html.replace(/\n/g, '<br>');
  html = html.replace(/@@CODE_BLOCK_(\d+)@@/g, (match, rawIndex) => {
    const block = codeBlocks[Number(rawIndex)];
    const encoded = encodeURIComponent(block.code);
    return `<div class="markdown-code-block"><button class="copy-code-button" data-code="${encoded}">Copiar</button><button class="download-code-button" data-code="${encoded}" data-language="${escapeHtml(block.language)}">Baixar</button><pre><code class="language-${escapeHtml(block.language)}">${highlightCode(block.code, block.language)}</code></pre></div>`;
  });
  return html;
}

function renderAttachment(attachment) {
  if (!attachment || !attachment.name) return '';
  const type = attachment.type || 'application/octet-stream';
  const isImage = type.startsWith('image/');
  if (isImage && attachment.data) {
    return `<div class="chat-attachment-item"><div>${escapeHtml(attachment.name)}</div><img src="data:${type};base64,${attachment.data}" alt="${escapeHtml(attachment.name)}" /></div>`;
  }
  const linkUrl = attachment.data ? `data:${type};base64,${attachment.data}` : '#';
  return `<div class="chat-attachment-item"><a href="${linkUrl}" download="${escapeHtml(attachment.name)}">${escapeHtml(attachment.name)}</a></div>`;
}

function appendChat(role, text, attachments = [], options = {}) {
  const item = document.createElement('div');
  const roleKeyRaw = String(role || '').toLowerCase();
  const roleKey = roleKeyRaw.normalize('NFD').replace(/[^a-z]/g, '');
  const isAssistantRole = ['assistant', 'agent', 'agente'].includes(roleKey);
  item.className = `chat-item chat-${roleKey || 'item'}`;
  item.dataset.messageId = options.id || '';
  item.dataset.rawText = String(text || '');
  const metadata = [options.timestamp ? formatTimestamp(options.timestamp) : null, options.provider, options.model].filter(Boolean).join(' · ');
  const header = `<div class="chat-item-header"><span class="role">${escapeHtml(role)}</span><span>${escapeHtml(metadata)}</span></div>`;
  const body = `<div class="chat-item-body">${renderMarkdown(text)}</div>`;
  const attachmentHtml = attachments && attachments.length ? `<div class="chat-item-attachments">${attachments.map(renderAttachment).join('')}</div>` : '';
  const actions = `<div class="chat-item-actions"><button class="copy-response-button">Copiar</button>${roleKeyRaw.includes('voc') || roleKey === 'user' ? '<button class="edit-message-button">Editar prompt</button>' : ''}${isAssistantRole ? '<button class="regenerate-message-button">Regenerar</button>' : ''}<button class="delete-message-button">Excluir</button></div>`;
  item.innerHTML = `${header}${actions}${body}${attachmentHtml}`;

  item.querySelector('.copy-response-button')?.addEventListener('click', () => copyTextToClipboard(item.dataset.rawText || ''));
  item.querySelector('.edit-message-button')?.addEventListener('click', () => editChatMessage(item));
  item.querySelector('.regenerate-message-button')?.addEventListener('click', () => regenerateChatMessage(item));
  item.querySelector('.delete-message-button')?.addEventListener('click', () => deleteChatMessage(item));

  item.querySelectorAll('.markdown-code-block button.copy-code-button').forEach((button) => {
    button.addEventListener('click', () => copyTextToClipboard(decodeURIComponent(button.dataset.code)));
  });
  item.querySelectorAll('.markdown-code-block button.download-code-button').forEach((button) => {
    button.addEventListener('click', () => downloadTextFile(`codigo.${button.dataset.language === 'text' ? 'txt' : button.dataset.language}`, decodeURIComponent(button.dataset.code), 'text/plain'));
  });

  chatHistory.appendChild(item);
  chatHistory.scrollTop = chatHistory.scrollHeight;
  return item;
}

function updateChatItem(item, text) {
  if (!item) return;
  item.dataset.rawText = String(text || '');
  const body = item.querySelector('.chat-item-body');
  if (body) body.innerHTML = renderMarkdown(text);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

async function editChatMessage(item) {
  const messageId = item.dataset.messageId;
  if (!selectedConversationId || !messageId) return;
  const text = window.prompt('Editar prompt:', item.dataset.rawText || '');
  if (text === null || !text.trim()) return;
  try {
    await fetchJson(`/api/chat/conversations/${encodeURIComponent(selectedConversationId)}/messages/${encodeURIComponent(messageId)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
    updateChatItem(item, text);await loadConversations();
  } catch (error) { setChatStatus(error.message, true); }
}

async function deleteChatMessage(item) {
  const messageId = item.dataset.messageId;
  if (!selectedConversationId || !messageId || !confirm('Excluir esta mensagem?')) return;
  try {
    await fetchJson(`/api/chat/conversations/${encodeURIComponent(selectedConversationId)}/messages/${encodeURIComponent(messageId)}`, { method: 'DELETE' });
    item.remove();await loadConversations();
  } catch (error) { setChatStatus(error.message, true); }
}

async function regenerateChatMessage(item) {
  if (!selectedConversationId || !item.dataset.messageId || currentChatAbort) return;
  const allItems = [...chatHistory.querySelectorAll('.chat-item')];
  const index = allItems.indexOf(item);
  allItems.slice(index).forEach((current) => current.remove());
  const assistantItem = appendChat('Agente', '', [], { timestamp: new Date().toISOString() });
  await runChatStream({ conversationId: selectedConversationId, regenerateMessageId: item.dataset.messageId }, assistantItem);
}

async function consumeEventStream(response, onEvent) {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${response.status}`);
  }
  if (!response.body) throw new Error('Resposta sem stream disponível.');
  const reader = response.body.getReader();const decoder = new TextDecoder();let buffer = '';
  while (true) {
    const { value, done } = await reader.read();if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split(/\r?\n\r?\n/);buffer = blocks.pop() || '';
    for (const block of blocks) {
      let event = 'message';let data = '';
      for (const line of block.split(/\r?\n/)) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (!data) continue;
      let payload;try { payload = JSON.parse(data); } catch { payload = { data }; }
      await onEvent(event, payload);
    }
  }
}

function getConversationDisplayName(name) {
  const raw = String(name || '').trim();
  if (!raw) return 'Conversa sem título';
  if (raw.toLowerCase() === 'new conversation') return 'Nova conversa';
  return raw;
}

function renderConversationList(conversations) {
  if (!conversationList) return;
  conversationList.innerHTML = '';
  if (!conversations || conversations.length === 0) {
    conversationList.innerHTML = '<div class="message">Nenhuma conversa ainda.</div>';
    return;
  }
  conversations.forEach((conversation) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `conversation-item ${conversation.id === selectedConversationId ? 'active' : ''}`;
    item.textContent = `${conversation.pinned ? '📌 ' : ''}${getConversationDisplayName(conversation.name)} (${conversation.messageCount ?? conversation.messages?.length ?? 0})`;
    item.title = getConversationDisplayName(conversation.name);
    item.addEventListener('click', () => selectConversation(conversation.id));
    item.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      if (!confirm(`Excluir conversa "${getConversationDisplayName(conversation.name)}"?`)) return;
      deleteConversation(conversation.id);
    });
    conversationList.appendChild(item);
  });
}

async function selectConversation(id) {
  if (!id) return;
  selectedConversationId = id;
  chatConversations.forEach((conversation) => {
    if (conversation.id === id) conversation.selected = true;
    else conversation.selected = false;
  });
  renderConversationList(chatConversations);
  const conversation = chatConversations.find((item) => item.id === id);
  conversationTitle.textContent = conversation ? getConversationDisplayName(conversation.name) : 'Conversa';
  await loadConversationMessages(id);
}

async function loadConversationMessages(id, page = 1, prepend = false) {
  setChatStatus('Carregando conversa...', true);
  try {
    const response = await fetchJson(`/api/chat/conversations/${encodeURIComponent(id)}?messagePage=${page}&messageLimit=100`);
    if (response.success) {
      activeConversation = response.conversation;
      const previousHeight = chatHistory.scrollHeight;
      if (!prepend) chatHistory.innerHTML = '';
      const messages = response.conversation.messages || [];
      const fragment = document.createDocumentFragment();
      messages.forEach((message) => {
        const item = appendChat(message.role === 'assistant' ? 'Agente' : message.role === 'user' ? 'Você' : 'Sistema', message.text, message.attachments || [], message);
        if (prepend) fragment.appendChild(item);
      });
      if (prepend) chatHistory.prepend(fragment);
      if (prepend) chatHistory.scrollTop = chatHistory.scrollHeight - previousHeight;
      chatHistory.querySelector('.load-older-messages')?.remove();
      if (response.conversation.messagePagination?.hasOlder) {
        const older = document.createElement('button');older.type = 'button';older.className = 'load-older-messages';older.textContent = 'Carregar mensagens anteriores';
        older.addEventListener('click', () => loadConversationMessages(id, page + 1, true));chatHistory.prepend(older);
      }
      if (pinConversationButton) pinConversationButton.textContent = response.conversation.pinned ? 'Desafixar' : 'Fixar';
    }
  } catch (error) {
    appendChat('Sistema', 'Não foi possível carregar a conversa.');
  } finally {
    setChatStatus('', false);
  }
}

function filterConversationList() {
  const query = chatConversationSearch.value.trim().toLowerCase();
  const filtered = chatConversations.filter((conversation) => {
    if (!query) return true;
    return conversation.name.toLowerCase().includes(query)
      || (conversation.messages || []).some((message) => String(message.text || '').toLowerCase().includes(query))
      || (conversation.organization?.tags || []).some((tag) => String(tag).toLowerCase().includes(query));
  });
  const sort = chatConversationSort?.value || 'recent';
  filtered.sort((a, b) => {
    if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned);
    if (sort === 'oldest') return new Date(a.updatedAt) - new Date(b.updatedAt);
    if (sort === 'name') return a.name.localeCompare(b.name, 'pt-BR');
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });
  renderConversationList(filtered);
  clearTimeout(filterConversationList.timer);
  filterConversationList.timer = setTimeout(loadConversations, 250);
}

async function createNewConversation() {
  try {
    const response = await fetchJson('/api/chat/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Nova conversa', messages: [] }),
    });
    if (response.success) {
      await loadConversations();
      if (response.conversation) {
        await selectConversation(response.conversation.id);
      }
    }
  } catch (error) {
    console.warn('Não foi possível criar conversa', error);
  }
}

async function renameCurrentConversation() {
  if (!selectedConversationId) return;
  const newName = window.prompt('Novo nome da conversa:', conversationTitle.textContent);
  if (!newName) return;
  try {
    const response = await fetchJson(`/api/chat/conversations/${encodeURIComponent(selectedConversationId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    if (response.success) {
      await loadConversations();
      await selectConversation(selectedConversationId);
    }
  } catch (error) {
    console.warn('Não foi possível renomear conversa', error);
  }
}

async function conversationAction(action, method = 'POST', body) {
  if (!selectedConversationId) return null;
  const response = await fetchJson(`/api/chat/conversations/${encodeURIComponent(selectedConversationId)}/${action}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.success) throw new Error(response.error || 'Ação não concluída.');
  return response;
}

async function duplicateCurrentConversation() {
  try {
    const response = await conversationAction('duplicate');
    await loadConversations();
    if (response?.conversation) await selectConversation(response.conversation.id);
  } catch (error) { setChatStatus(error.message, true); }
}

async function toggleCurrentConversationPin() {
  try {
    await conversationAction('pin', 'PATCH', { pinned: !activeConversation?.pinned });
    await loadConversations();
    await selectConversation(selectedConversationId);
  } catch (error) { setChatStatus(error.message, true); }
}

async function clearCurrentConversation() {
  if (!selectedConversationId || !confirm('Limpar todas as mensagens desta conversa?')) return;
  try { await conversationAction('clear');await loadConversations();await selectConversation(selectedConversationId); } catch (error) { setChatStatus(error.message, true); }
}

async function deleteCurrentConversation() {
  if (!selectedConversationId || !confirm('Excluir a conversa atual?')) return;
  await deleteConversation(selectedConversationId);
}

async function clearEveryConversation() {
  if (!confirm('Excluir permanentemente todas as conversas? Esta ação não pode ser desfeita.')) return;
  try {
    await fetchJson('/api/chat/conversations', { method: 'DELETE' });
    selectedConversationId = null;activeConversation = null;chatHistory.innerHTML = '';conversationTitle.textContent = 'Selecione uma conversa';
    await loadConversations();
  } catch (error) { setChatStatus(error.message, true); }
}

async function copyEntireConversation() {
  if (!selectedConversationId) return;
  const response = await fetchJson(`/api/chat/conversations/${encodeURIComponent(selectedConversationId)}/export?format=txt`);
  if (response.success) copyTextToClipboard(response.exported.content);
}

async function prepareShareCurrentConversation() {
  try {
    await conversationAction('share');
    await copyTextToClipboard(JSON.stringify(activeConversation, null, 2));
    setChatStatus('Estrutura de compartilhamento preparada e conversa copiada.', true);
  } catch (error) { setChatStatus(error.message, true); }
}

async function deleteConversation(id) {
  try {
    const response = await fetchJson(`/api/chat/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (response.success) {
      if (id === selectedConversationId) {
        selectedConversationId = null;
      }
      await loadConversations();
      if (chatConversations.length > 0) {
        await selectConversation(chatConversations[0].id);
      } else {
        conversationTitle.textContent = 'Selecione uma conversa';
        chatHistory.innerHTML = '';
      }
    }
  } catch (error) {
    console.warn('Não foi possível excluir conversa', error);
  }
}

async function exportCurrentConversation(format = 'json') {
  if (!selectedConversationId) return;
  try {
    const response = await fetchJson(`/api/chat/conversations/${encodeURIComponent(selectedConversationId)}/export?format=${encodeURIComponent(format)}`);
    if (response.success) {
      const exported = response.exported;
      downloadTextFile(`${getConversationDisplayName(response.conversation.name || 'conversa')}.${exported.extension}`, exported.content, exported.contentType);
    }
  } catch (error) {
    console.warn('Não foi possível exportar conversa', error);
  }
}

function downloadTextFile(fileName, content, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');anchor.href = url;anchor.download = fileName;document.body.appendChild(anchor);anchor.click();anchor.remove();URL.revokeObjectURL(url);
}

function downloadJsonFile(fileName, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function handleChatImportFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  importConversationFile(file);
}

async function importConversationFile(file) {
  try {
    const content = await file.text();
    const conversation = JSON.parse(content);
    const response = await fetchJson('/api/chat/conversations/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation }),
    });
    if (response.success) {
      await loadConversations();
      await selectConversation(response.conversation.id);
    }
  } catch (error) {
    console.warn('Não foi possível importar conversa', error);
  } finally {
    chatImportFile.value = '';
  }
}

function copyTextToClipboard(text) {
  if (!navigator.clipboard) return;
  navigator.clipboard.writeText(text).catch(() => {
    window.prompt('Copie o texto abaixo', text);
  });
}

function clearChatAttachments() {
  currentChatAttachments = [];
  if (chatAttachments) {
    chatAttachments.innerHTML = '';
  }
}

function renderChatAttachments() {
  if (!chatAttachments) return;
  chatAttachments.innerHTML = currentChatAttachments.map((attachment, index) => `
    <div class="attachment-chip">
      <span>📎 ${escapeHtml(attachment.name)}</span>
      <button type="button" data-index="${index}" aria-label="Remover ${escapeHtml(attachment.name)}">❌ remover</button>
    </div>
  `).join('');
  chatAttachments.querySelectorAll('button[data-index]').forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.index);
      currentChatAttachments.splice(index, 1);
      renderChatAttachments();
    });
  });
}

async function handleChatAttachmentSelection() {
  const files = Array.from(chatAttachment.files || []);
  await addChatAttachmentFiles(files);
  chatAttachment.value = null;
  chatAttachment.removeAttribute('webkitdirectory');
  chatAttachment.removeAttribute('capture');
}

async function addChatAttachmentFiles(files) {
  for (const file of files) {
    if (file.size > 7 * 1024 * 1024) { setChatStatus(`Anexo excede 7 MB: ${file.name}`, true);continue; }
    if (!/\.(txt|md|pdf|docx|json|csv|zip|png|jpe?g|gif|webp|bmp)$/i.test(file.name)) { setChatStatus(`Tipo de anexo não permitido: ${file.name}`, true);continue; }
    const currentBytes = currentChatAttachments.reduce((total, attachment) => total + Math.floor((attachment.data?.length || 0) * 0.75), 0);
    if (currentBytes + file.size > 30 * 1024 * 1024) { setChatStatus('Os anexos desta mensagem excedem o limite total de 30 MB.', true);break; }
    const data = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(data);
    currentChatAttachments.push({ name: file.name, type: file.type || 'application/octet-stream', data: base64 });
  }
  renderChatAttachments();
}

function openChatAttachmentPicker(action) {
  chatAttachment.removeAttribute('webkitdirectory');chatAttachment.removeAttribute('capture');
  const accepts = { document: '.txt,.md,.pdf,.docx,.json,.csv', image: 'image/*', zip: '.zip', screenshot: 'image/*' };
  if (action === 'folder') chatAttachment.setAttribute('webkitdirectory', '');
  if (action === 'screenshot') chatAttachment.setAttribute('capture', 'environment');
  chatAttachment.accept = accepts[action] || '.txt,.md,.pdf,.docx,.json,.csv,.zip,image/*';
  chatAttachment.click();
}

async function addClipboardAttachment() {
  try {
    const items = await navigator.clipboard.read();let added = 0;
    for (const item of items) {
      for (const type of item.types) {
        if (!type.startsWith('image/')) continue;
        const blob = await item.getType(type);
        await addChatAttachmentFiles([new File([blob], `clipboard-${Date.now()}.${type.split('/')[1] || 'png'}`, { type })]);added += 1;
      }
    }
    if (!added) setChatStatus('A área de transferência não contém imagem compatível.', true);
  } catch { setChatStatus('Não foi possível acessar a área de transferência.', true); }
}

function autoResizeChatInput() {
  chatInput.style.height = 'auto';
  chatInput.style.height = `${Math.min(Math.max(chatInput.scrollHeight, 180), 520)}px`;
}

function cancelChatGeneration() {
  if (currentChatAbort) {
    currentChatAbort.abort();
    setChatStatus('Geração cancelada', false);
    setChatRuntimeStatus('cancelada');
    currentChatAbort = null;
  }
}

async function runChatStream(payload, assistantItem) {
  let streamedText = '';
  const startedAt = Date.now();
  setChatStatus('Pensando... · 0s', true);
  setChatRuntimeStatus('processando');
  cancelChat.classList.remove('hidden');
  clearInterval(chatElapsedTimer);
  chatElapsedTimer = setInterval(() => setChatStatus(`${streamedText ? 'Gerando resposta...' : 'Pensando...'} · ${Math.floor((Date.now() - startedAt) / 1000)}s`, true), 1000);
  try {
    currentChatAbort = new AbortController();
    const response = await fetch('/api/chat/stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: currentChatAbort.signal });
    await consumeEventStream(response, async (event, body) => {
      if (event === 'accepted' && body.message?.id) {
        const pendingUser = [...chatHistory.querySelectorAll('.chat-item')].reverse().find((current) => !current.dataset.messageId && current !== assistantItem);
        if (pendingUser) pendingUser.dataset.messageId = body.message.id;
      }
      if (event === 'delta') { streamedText += body.delta || '';updateChatItem(assistantItem, `${streamedText} ▌`); }
      if (event === 'complete') {
        streamedText = body.reply || streamedText;
        assistantItem.dataset.messageId = body.message?.id || '';
        const headerMeta = assistantItem.querySelector('.chat-item-header span:last-child');
        if (headerMeta && body.message) headerMeta.textContent = [formatTimestamp(body.message.timestamp), body.message.provider, body.message.model].filter(Boolean).join(' · ');
        updateChatItem(assistantItem, streamedText);
      }
      if (event === 'error') throw new Error(body.error || 'Não foi possível gerar resposta.');
    });
    await loadConversations();
    activeConversation = (await fetchJson(`/api/chat/conversations/${encodeURIComponent(selectedConversationId)}`)).conversation;
    await loadProjectTree();await listFolder(currentDirectory || '');
  } catch (error) {
    updateChatItem(assistantItem, error.name === 'AbortError' ? `${streamedText}\n\n_Geração cancelada._` : error.message || 'Não foi possível conectar ao serviço de chat.');
  } finally {
    clearInterval(chatElapsedTimer);chatElapsedTimer = null;
    setChatStatus('', false);setChatRuntimeStatus('pronta');cancelChat.classList.add('hidden');currentChatAbort = null;
  }
}

async function sendChatMessage() {
  const message = chatInput.value.trim();
  if (!message) return;
  if (!selectedConversationId) {
    await createNewConversation();
  }
  if (!selectedConversationId) return;
  appendChat('Você', message, currentChatAttachments);
  chatInput.value = '';
  autoResizeChatInput();
  const payload = {
    conversationId: selectedConversationId,
    message,
    attachments: currentChatAttachments,
  };
  currentChatAttachments = [];
  renderChatAttachments();
  const assistantItem = appendChat('Agente', '', [], { timestamp: new Date().toISOString() });
  await runChatStream(payload, assistantItem);
}

function openMissionRelatedFile(path) {
  if (!path) return;
  loadFileFromPath(path);
  setActiveTab('editor');
}

function formatTimestamp(value) {
  if (!value) return 'Desconhecido';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Desconhecido';
  return date.toLocaleString();
}

function getStatusBadge(status) {
  const normalized = String(status || 'pending').toLowerCase();
  const safe = ['pending', 'running', 'completed', 'failed'].includes(normalized) ? normalized : 'pending';
  const map = { pending: 'pendente', running: 'em andamento', completed: 'concluída', failed: 'falhou' };
  return `<span class="status-badge status-${safe}">${escapeHtml(map[safe])}</span>`;
}

function closeMissionDetailsView() {
  missionDetails.classList.add('hidden');
  missionDetailsContent.innerHTML = '';
  sessionStorage.removeItem('fallah.activeMissionModal');
}

function showMissionDetailsContent(mission) {
  const logs = Array.isArray(mission.logs) ? mission.logs : [];
  const logsHtml = logs.length
    ? logs.map((log) => {
      const links = getMissionRelatedLinks(log.message || '');
      const linkHtml = links.map((filePath) => `<button type="button" class="open-related-file" data-path="${escapeHtml(filePath)}">Abrir ${escapeHtml(filePath)}</button>`).join(' ');
      return `
        <div class="mission-log-item">
          <div><strong>${formatTimestamp(log.timestamp)}</strong></div>
          <div>${escapeHtml(log.message || '')}</div>
          <div class="mission-log-links">${linkHtml}</div>
        </div>
      `;
    }).join('')
    : '<div class="message">Sem logs até o momento.</div>';

  missionDetailsContent.innerHTML = `
    <div class="mission-details-grid">
      <div><strong>Título:</strong> ${escapeHtml(mission.title || '')}</div>
      <div><strong>Status:</strong> ${getStatusBadge(mission.status)}</div>
      <div><strong>Prioridade:</strong> ${escapeHtml(mission.priority || 'medium')}</div>
      <div><strong>Categoria:</strong> ${escapeHtml(mission.category || 'Geral')}</div>
      <div><strong>Progresso:</strong> ${Number(mission.progress || 0)}%</div>
      <div><strong>Criada em:</strong> ${formatTimestamp(mission.createdAt)}</div>
      <div><strong>Atualizada em:</strong> ${formatTimestamp(mission.updatedAt)}</div>
      <div><strong>Descrição:</strong><br>${escapeHtml(mission.description || 'Sem descrição informada.')}</div>
      ${mission.errorMessage ? `<div><strong>Erro:</strong><br>${escapeHtml(mission.errorMessage)}</div>` : ''}
    </div>
    <div class="mission-details-actions">
      <button type="button" id="setMissionPending">Pendente</button>
      <button type="button" id="setMissionRunning">Em andamento</button>
      <button type="button" id="setMissionCompleted">Concluída</button>
      <button type="button" id="setMissionFailed">Falhou</button>
    </div>
    <h4>Logs</h4>
    <div class="mission-logs-list">${logsHtml}</div>
  `;

  missionDetailsContent.querySelectorAll('.open-related-file').forEach((button) => {
    button.addEventListener('click', () => openMissionRelatedFile(button.dataset.path));
  });

  const setStatus = async (status, progress) => {
    try {
      const response = await fetchJson(`/api/missions/${encodeURIComponent(mission.id)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, progress }),
      });
      if (!response.success) {
        missionMessage.textContent = response.error || 'Não foi possível atualizar o status da missão.';
        return;
      }
      const statusMap = { pending: 'pendente', running: 'em andamento', completed: 'concluída', failed: 'falhou' };
      missionMessage.textContent = `Missão alterada para ${statusMap[status] || status}.`;
      await loadMissions();
      await showMissionDetails(mission.id);
    } catch (error) {
      missionMessage.textContent = 'Não foi possível atualizar o status da missão.';
    }
  };

  const pendingButton = document.getElementById('setMissionPending');
  const runningButton = document.getElementById('setMissionRunning');
  const completedButton = document.getElementById('setMissionCompleted');
  const failedButton = document.getElementById('setMissionFailed');
  if (pendingButton) pendingButton.addEventListener('click', () => setStatus('pending', 0));
  if (runningButton) runningButton.addEventListener('click', () => setStatus('running', 50));
  if (completedButton) completedButton.addEventListener('click', () => setStatus('completed', 100));
  if (failedButton) failedButton.addEventListener('click', () => setStatus('failed', mission.progress || 0));
}

async function showMissionDetails(id) {
  if (!id) return;
  sessionStorage.setItem('fallah.activeMissionModal', id);
  missionDetails.classList.remove('hidden');
  missionDetailsContent.innerHTML = '<div class="small-loading">Carregando detalhes da missão...</div>';
  try {
    const response = await fetchJson(`/api/missions/${encodeURIComponent(id)}`);
    if (response.success && response.mission) {
      showMissionDetailsContent(response.mission);
      return;
    }
    missionDetailsContent.innerHTML = `<div class="message">${escapeHtml(response.error || 'Missão não encontrada.')}</div>`;
  } catch (error) {
    missionDetailsContent.innerHTML = '<div class="message">Não foi possível carregar os detalhes da missão.</div>';
  }
}

async function loadMissions(page = 1, append = false) {
  missionLoading.classList.remove('hidden');
  try {
    const response = await fetchJson(`/api/missions?page=${page}&limit=100&search=${encodeURIComponent(missionSearch?.value.trim() || '')}`);
    if (!response.success) {
      missionMessage.textContent = response.error || 'Não foi possível carregar as missões.';
      return;
    }
    const received = Array.isArray(response.missions) ? response.missions : [];
    allMissions = append ? [...allMissions, ...received] : received;
    missionPage = response.pagination?.page || page;missionPages = response.pagination?.pages || 1;
    loadMoreMissions?.classList.toggle('hidden', missionPage >= missionPages);
    renderMissionList(applyMissionFilters(allMissions));
  } catch (error) {
    missionMessage.textContent = 'Não foi possível carregar as missões.';
  } finally {
    missionLoading.classList.add('hidden');
  }
}

async function createMission() {
  const title = missionTitle.value.trim();
  const description = missionDescription.value.trim();
  const category = missionCategory.value.trim();
  const priority = missionPriority.value;

  if (!title) {
    missionMessage.textContent = 'O título da missão é obrigatório.';
    return;
  }

  try {
    const response = await fetchJson('/api/missions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, category, priority }),
    });
    if (!response.success) {
      missionMessage.textContent = response.error || 'Não foi possível criar a missão.';
      return;
    }
    missionTitle.value = '';
    missionDescription.value = '';
    missionCategory.value = '';
    missionPriority.value = 'medium';
    missionMessage.textContent = 'Missão criada com sucesso.';
    await loadMissions();
  } catch (error) {
    missionMessage.textContent = 'Não foi possível criar a missão.';
  }
}

async function deleteMission(id) {
  if (!id) return;
  const item = missionsList.querySelector(`[data-mission-id="${CSS.escape(id)}"]`);
  const progress = item?.querySelector('.progress-fill');
  missionMessage.textContent = 'Excluindo...';
  if (progress) { progress.style.width = '60%';progress.parentElement.setAttribute('aria-label', 'Excluindo missão'); }
  try {
    const [response] = await Promise.all([
      fetchJson(`/api/missions/${encodeURIComponent(id)}`, { method: 'DELETE' }),
      new Promise((resolve) => setTimeout(resolve, 500)),
    ]);
    if (!response.success) {
      missionMessage.textContent = response.error || 'Não foi possível excluir a missão.';
      return;
    }
    if (progress) progress.style.width = '100%';
    missionMessage.textContent = 'Missões removidas com sucesso.';
    if (!missionDetails.classList.contains('hidden')) {
      closeMissionDetailsView();
    }
    await loadMissions();
  } catch (error) {
    missionMessage.textContent = 'Não foi possível excluir a missão.';
  }
}

function getMissionRelatedLinks(logMessage) {
  const regex = /((?:\.|\/)?[\w\-\.\/]+\.(js|ts|json|md|html|css|txt|sh|py))/g;
  const matches = Array.from((logMessage || '').matchAll(regex));
  return matches.map((match) => match[1]);
}

function renderMissionList(missions) {
  missionsList.innerHTML = '';
  if (!missions || missions.length === 0) {
    missionsList.innerHTML = '<div class="message">Nenhuma missão encontrada.</div>';
    return;
  }

  missions.forEach((mission) => {
    const item = document.createElement('div');
    item.className = 'mission-item';
    item.dataset.missionId = mission.id;
    item.innerHTML = `
      <div class="mission-header">
        <div>
          <div class="mission-title">${escapeHtml(mission.title)}</div>
          <div class="mission-meta">${getStatusBadge(mission.status)} • ${escapeHtml(mission.category || 'Geral')} • ${escapeHtml(mission.priority || 'medium')} • Criada em ${formatTimestamp(mission.createdAt)}</div>
        </div>
        <div class="mission-actions">
          <button class="details-button">Detalhes</button>
          <button class="edit-button">Editar</button>
          <button class="delete-button">Excluir</button>
        </div>
      </div>
      <div>${escapeHtml(mission.description || 'Sem descrição informada.')}</div>
      <div class="progress-bar"><div class="progress-fill" style="width: ${mission.progress || 0}%"></div></div>
    `;

    item.querySelector('.details-button').addEventListener('click', () => showMissionDetails(mission.id));
    item.querySelector('.edit-button').addEventListener('click', async () => {
      await editMissionPrompt(mission);
    });
    item.querySelector('.delete-button').addEventListener('click', async () => {
      if (!confirm('Excluir esta missão?')) return;
      await deleteMission(mission.id);
    });

    missionsList.appendChild(item);
  });
}

async function editMissionPrompt(mission) {
  const nextTitle = window.prompt('Editar título da missão:', mission.title || '');
  if (nextTitle === null) return;
  const nextDescription = window.prompt('Editar descrição da missão:', mission.description || '');
  if (nextDescription === null) return;
  const nextCategory = window.prompt('Editar categoria da missão:', mission.category || 'Geral');
  if (nextCategory === null) return;
  const nextPriority = window.prompt('Editar prioridade da missão (low, medium, high):', mission.priority || 'medium');
  if (nextPriority === null) return;

  try {
    const response = await fetchJson(`/api/missions/${encodeURIComponent(mission.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: nextTitle,
        description: nextDescription,
        category: nextCategory,
        priority: nextPriority,
      }),
    });
    if (!response.success) {
      missionMessage.textContent = response.error || 'Não foi possível editar a missão.';
      return;
    }
    missionMessage.textContent = 'Missão atualizada com sucesso.';
    await loadMissions();
  } catch (error) {
    missionMessage.textContent = 'Não foi possível editar a missão.';
  }
}

function applyMissionFilters(missions) {
  const searchQuery = missionSearch.value.trim().toLowerCase();
  const statusFilter = missionStatusFilter.value;
  const priorityFilter = missionPriorityFilter.value;
  const categoryFilter = missionCategoryFilter.value.trim().toLowerCase();

  return missions.filter((mission) => {
    const matchesSearch = !searchQuery || mission.title.toLowerCase().includes(searchQuery) || mission.description.toLowerCase().includes(searchQuery) || mission.logs?.some((log) => log.message.toLowerCase().includes(searchQuery));
    const matchesStatus = statusFilter === 'all' || mission.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || mission.priority === priorityFilter;
    const matchesCategory = !categoryFilter || (mission.category || '').toLowerCase().includes(categoryFilter);
    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });
}

function formatFoundationResult(value) {
  return JSON.stringify(value, null, 2);
}

async function foundationRequest(url, options, output) {
  output.textContent = 'Processando...';
  try {
    const response = await fetchJson(url, options);
    output.textContent = formatFoundationResult(response.success ? response.result : response);
    return response;
  } catch (error) {
    output.textContent = `Erro: ${error.message}`;
    return null;
  }
}

async function populateSourceIntelligenceHouses() {
  const container = document.getElementById('sourceIntelligenceHouses');
  if (!container) return;
  try {
    const response = await fetchJson('/api/pipeline/status');
    const readers = response?.pipeline?.readers || response?.readers || [];
    const houses = [];
    for (const reader of readers) {
      const id = String(reader.houseId || reader.houseName || reader.id || '').trim();
      if (!id || houses.some((entry) => entry.id === id)) continue;
      houses.push({ id, name: reader.houseName || reader.houseId || reader.id });
    }
    const selectedIds = new Set([...container.querySelectorAll('input[type="checkbox"][data-house-id]:checked')].map((item) => item.dataset.houseId));
    if (!houses.length) {
      container.textContent = 'Nenhuma casa disponivel.';
      return;
    }
    const preferred = houses.filter((house) => /betbra|fulltbet|bolsa/i.test(house.name)).map((house) => house.id);
    const shouldAutoSelectPreferred = selectedIds.size === 0;
    container.innerHTML = houses.map((house) => {
      const checked = selectedIds.has(house.id) || (shouldAutoSelectPreferred && preferred.includes(house.id));
      return `<label style="display:flex; gap:8px; align-items:center; margin:4px 0;"><input type="checkbox" data-house-id="${escapeHtml(house.id)}" ${checked ? 'checked' : ''} /><span>${escapeHtml(house.name)} <small>(${escapeHtml(house.id)})</small></span></label>`;
    }).join('');
  } catch {
    container.textContent = 'Nenhuma casa disponivel';
  }
}

let sourceIntelligenceLatestResult = null;
let sourceIntelligenceHistoryCache = [];
let sourceIntelligenceActiveJobId = null;
let liveAuditRealtimeTimer = null;
const liveAuditState = {
  houses: [],
  selectedHouses: new Set(),
  deletingHouses: new Set(),
  modalityOptions: [],
  modalityOptionsAll: [],
  selectedEvent: null,
  selectedMarketKey: '',
  markets: [],
  latestMarketView: null,
  latestArbitrageAudit: null,
};

const coverageAuditPanelState = {
  audit: null,
  activeTab: 'houses',
  selectedHouseId: '',
  selectedSport: '',
  selectedCompetition: '',
  selectedEventId: '',
  selectedMarketId: '',
  page: 1,
  pageSize: 40,
  housePanel: null,
  eventDetail: null,
  requestVersion: 0,
  loading: false,
};

function coverageAuditNavigationKey(state = coverageAuditPanelState) {
  return [state.selectedHouseId, state.selectedSport, state.selectedCompetition, state.selectedEventId, state.selectedMarketId, state.page].join('|');
}

function covNum(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function covStatusClass(status) {
  const text = String(status || '').toUpperCase();
  if (text === 'ELIGIBLE' || text === 'READY') return 'ok';
  if (text === 'CONDITIONAL' || text === 'PARTIAL') return 'warn';
  if (text === 'BLOCKED' || text === 'NOT_READY') return 'bad';
  return 'unk';
}

function covFreshness(ageMs) {
  const hasAge = ageMs !== null && ageMs !== undefined && ageMs !== '';
  const seconds = hasAge && Number.isFinite(Number(ageMs)) ? Math.max(0, Math.round(Number(ageMs) / 1000)) : null;
  if (seconds === null) return { seconds: null, label: 'N/D', state: 'UNKNOWN', cls: 'unk' };
  if (seconds <= 5) return { seconds, label: `${seconds}s`, state: 'HEALTHY', cls: 'ok' };
  if (seconds <= 10) return { seconds, label: `${seconds}s`, state: 'ACCEPTABLE', cls: 'ok' };
  if (seconds <= 30) return { seconds, label: `${seconds}s`, state: 'DEGRADED', cls: 'warn' };
  return { seconds, label: `${seconds}s`, state: 'CRITICAL', cls: 'bad' };
}

async function loadCoverageAuditPanel() {
  const requestVersion = ++coverageAuditPanelState.requestVersion;
  const navigationKey = coverageAuditNavigationKey();
  const result = await fetchJson('/api/pipeline/coverage/audit');
  if (!result.success || !result.audit) throw new Error(result.error || 'Falha ao carregar auditoria de cobertura.');
  if (requestVersion !== coverageAuditPanelState.requestVersion || navigationKey !== coverageAuditNavigationKey()) return;
  coverageAuditPanelState.audit = result.audit;

  const summary = document.getElementById('fe-diagnostic-summary');
  if (summary) summary.textContent = result.audit.homeIndicator || '0 ELIGIBLE | 0 CONDITIONAL | 0 BLOCKED';

  if (coverageAuditPanelState.selectedHouseId) await loadCoverageAuditPanelHouseData(requestVersion);
  if (requestVersion !== coverageAuditPanelState.requestVersion) return;
  renderCoverageAuditPanel();
}

window.loadCoverageAuditPanel = loadCoverageAuditPanel;

async function loadCoverageAuditPanelHouseData(parentRequestVersion = null) {
  const audit = coverageAuditPanelState.audit;
  if (!audit || !coverageAuditPanelState.selectedHouseId) return;

  const requestVersion = parentRequestVersion ?? ++coverageAuditPanelState.requestVersion;
  const selection = {
    houseId: coverageAuditPanelState.selectedHouseId,
    sport: coverageAuditPanelState.selectedSport,
    competition: coverageAuditPanelState.selectedCompetition,
    eventId: coverageAuditPanelState.selectedEventId,
    marketId: coverageAuditPanelState.selectedMarketId,
    page: coverageAuditPanelState.page,
  };
  const navigationKey = coverageAuditNavigationKey();
  coverageAuditPanelState.loading = true;

  const params = new URLSearchParams({
    houseId: selection.houseId,
    page: String(selection.page || 1),
    pageSize: String(coverageAuditPanelState.pageSize || 40),
    scope: 'current',
  });
  if (selection.sport) params.set('sport', selection.sport);
  if (selection.competition) params.set('competition', selection.competition);

  const panel = await fetchJson(`/api/pipeline/audit/panel?${params.toString()}`);
  if (!panel.success || !panel.panel) throw new Error(panel.error || 'Falha ao carregar eventos da casa.');
  if (requestVersion !== coverageAuditPanelState.requestVersion || navigationKey !== coverageAuditNavigationKey()) return;
  coverageAuditPanelState.housePanel = panel.panel;

  if (selection.eventId) {
    const detail = await fetchJson(`/api/pipeline/audit/events/${encodeURIComponent(selection.eventId)}?houseId=${encodeURIComponent(selection.houseId)}`);
    if (requestVersion !== coverageAuditPanelState.requestVersion || navigationKey !== coverageAuditNavigationKey()) return;
    coverageAuditPanelState.eventDetail = detail.success ? (detail.detail || null) : null;
  }
  coverageAuditPanelState.loading = false;
}

function renderCoverageAuditPanel() {
  const root = document.getElementById('coverageAuditPanelContent');
  const audit = coverageAuditPanelState.audit;
  if (!root) return;
  if (!audit) {
    root.textContent = 'Auditoria de cobertura indisponível.';
    return;
  }

  const counts = audit?.arbitrageHouseEligibility?.counts || { ELIGIBLE: 0, CONDITIONAL: 0, BLOCKED: 0 };
  const totalHouses = Object.keys(audit.houses || {}).length;
  const totals = audit.totals || {};
  const oddsRejected = covNum(totals.totalOddsBrutas) - covNum(totals.totalOdds);
  const eventRejected = covNum(totals.totalEventosRecebidos) - covNum(totals.totalEventosValidos);
  const statusGlobal = String(audit.arbitrageDataReadinessGlobal || 'PARTIAL');
  const usingSnapshot = Boolean(audit?.failureSafe?.usingLastValidSnapshot);

  const tabs = [
    { id: 'houses', label: 'Cobertura por Casa' },
    { id: 'problems', label: 'Problemas' },
    { id: 'compare', label: 'Comparar Casas' },
    { id: 'common', label: 'Eventos Comuns' },
    { id: 'search', label: 'Pesquisar Evento' },
    { id: 'arbitrage', label: 'Auditoria de Arbitragem' },
  ];

  root.innerHTML = `
    <div style="font-size:12px;opacity:.8;margin-bottom:8px;">Última atualização: ${escapeHtml(new Date(audit.generatedAt || Date.now()).toLocaleTimeString('pt-BR'))}</div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px;">
      <strong>DADOS PARA ARBITRAGEM: <span class="cov-status ${covStatusClass(statusGlobal)}">${escapeHtml(statusGlobal)}</span></strong>
      <button id="covAuditRefresh" type="button">Atualizar</button>
      <span style="font-size:12px;color:#c7c7c7;">${usingSnapshot ? 'USANDO ULTIMO SNAPSHOT VALIDO' : 'SNAPSHOT CORRENTE'}</span>
    </div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
      ${tabs.map((tab) => `<button type="button" data-cov-tab="${tab.id}" ${coverageAuditPanelState.activeTab === tab.id ? 'style="border-color:#34d399;"' : ''}>${escapeHtml(tab.label)}</button>`).join('')}
    </div>
    <div id="covAuditTabBody"></div>
  `;

  root.querySelector('#covAuditRefresh')?.addEventListener('click', () => {
    loadCoverageAuditPanel().catch((error) => {
      const body = document.getElementById('covAuditTabBody');
      if (body) body.textContent = error.message || 'Falha ao atualizar auditoria.';
    });
  });

  root.querySelectorAll('[data-cov-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      coverageAuditPanelState.activeTab = button.dataset.covTab;
      renderCoverageAuditPanel();
      syncLiveAuditWorkspace();
    });
  });

  renderCoverageAuditPanelTabBody();
  syncLiveAuditWorkspace();
}

function renderCoverageAuditPanelTabBody() {
  const body = document.getElementById('covAuditTabBody');
  const audit = coverageAuditPanelState.audit;
  if (!body || !audit) return;

  if (coverageAuditPanelState.activeTab === 'search') {
    body.innerHTML = '<div class="message">Pesquisa universal, mercados e odds em tempo real disponíveis no workspace abaixo.</div>';
    return;
  }

  if (coverageAuditPanelState.activeTab === 'arbitrage') {
    body.innerHTML = '<div class="message">Auditoria de arbitragem, homologação e históricos disponíveis no workspace abaixo.</div>';
    return;
  }

  if (coverageAuditPanelState.activeTab === 'problems') {
    const rec = audit.reconciliacao || {};
    const events = rec.eventos || {};
    const odds = rec.odds || {};
    const losses = audit.possibleLoss || {};
    const top = Array.isArray(audit.top10MotivosRejeicao) ? audit.top10MotivosRejeicao : [];
    body.innerHTML = `
      <div class="message" style="white-space:normal;">
        <strong>EVENTOS</strong><br>
        Recebidos: ${covNum(events.recebidos)} | Validos: ${covNum(events.validos)} | Rejeitados: ${covNum(events.rejeitados)} | Explicados: ${covNum(events.rejeitadosExplicados)} | Nao explicados: ${covNum(events.rejeitadosNaoExplicados)}
        <br><br><strong>ODDS</strong><br>
        Brutas: ${covNum(odds.brutas)} | Validas: ${covNum(odds.validas)} | Rejeitadas: ${covNum(odds.rejeitadas)} | Explicadas: ${covNum(odds.rejeitadasExplicadas)}
        <br><br><strong>POSSIVEIS PERDAS</strong><br>
        Legitimas: ${covNum(losses.legitimo)} | Suspeitas: ${covNum(losses.suspeito)} | Erro confirmado: ${covNum(losses.erroConfirmado)} | Indeterminado: ${covNum(losses.indeterminado)} | Relevantes arbitragem: ${covNum(losses.possibleLossArbitrageRelevant)}
      </div>
      <div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div class="message"><strong>Top Rejeicoes</strong><br>${top.map((row) => `${escapeHtml(row.reason)}: ${covNum(row.count)}`).join('<br>')}</div>
        <div class="message"><strong>Causas de Odds Rejeitadas</strong><br>${(odds.porMotivo || []).map((row) => `${escapeHtml(row.cause)}: ${covNum(row.count)}`).join('<br>')}</div>
      </div>
    `;
    return;
  }

  if (coverageAuditPanelState.activeTab === 'compare') {
    const allSports = [...new Set((audit.relatorioPorEsporte6Casas || []).map((row) => String(row.esporte || 'UNKNOWN')).filter((sport) => sport.toUpperCase() !== 'UNKNOWN'))].sort();
    const current = coverageAuditPanelState.selectedSport || allSports[0] || '';
    const rows = (audit.relatorioPorEsporte6Casas || []).filter((row) => String(row.esporte || '') === current);
    const maxEvents = Math.max(0, ...rows.map((row) => covNum(row.eventos)));
    const minEvents = rows.length ? Math.min(...rows.map((row) => covNum(row.eventos))) : 0;
    const investigate = rows.length && maxEvents > 0 && ((maxEvents - minEvents) / maxEvents) > 0.6;

    body.innerHTML = `
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
        <label>Modalidade</label>
        <select id="covCompareSport">${allSports.map((sport) => `<option value="${escapeHtml(sport)}" ${sport === current ? 'selected' : ''}>${escapeHtml(sport)}</option>`).join('')}</select>
        <span class="live-audit-chip">DISCREPANCIA A INVESTIGAR: ${investigate ? 'SIM' : 'NAO'}</span>
      </div>
      <div class="message" style="max-height:380px;overflow:auto;">
        CASA | EVENTOS | MERCADOS | RUNNERS | ODDS | BACK | LAY | ERROS<br>
        ${(Object.entries(audit.houses || {}).map(([houseName, house]) => {
          const sportRow = rows.find((row) => String(row.casa) === houseName) || {};
          return `${escapeHtml(houseName)} | ${covNum(sportRow.eventos)} | ${covNum(sportRow.mercados)} | ${covNum(sportRow.selecoes)} | ${covNum(house.oddsValidas)} | ${covNum(house.backValidos)} | ${covNum(house.layValidos)} | ${covNum(house.endpointErrors)}`;
        }).join('<br>'))}
      </div>
    `;
    body.querySelector('#covCompareSport')?.addEventListener('change', (event) => {
      coverageAuditPanelState.selectedSport = String(event.target.value || '');
      renderCoverageAuditPanelTabBody();
    });
    return;
  }

  if (coverageAuditPanelState.activeTab === 'common') {
    const rows = Array.isArray(audit.commonEvents) ? audit.commonEvents : [];
    const grouped = audit?.matchingAudit?.groupedByHouseCount || {};
    const rej = audit?.matchingAudit?.rejectionsByReason || {};
    body.innerHTML = `
      <div class="message" style="white-space:normal;">
        EVENTOS COMUNS (${rows.length})<br>
        EM 2 CASAS: ${covNum(grouped.in2)} | EM 3 CASAS: ${covNum(grouped.in3)} | EM 4 CASAS: ${covNum(grouped.in4)} | EM 5 CASAS: ${covNum(grouped.in5)} | EM 6 CASAS: ${covNum(grouped.in6)}
        <br>CANDIDATOS: ${covNum(audit?.matchingAudit?.candidatesTotal)} | UNIDOS: ${covNum(audit?.matchingAudit?.groupedTotal)} | ISOLADOS: ${covNum(audit?.matchingAudit?.isolatedTotal)} | REJEITADOS: ${covNum(audit?.matchingAudit?.rejectedTotal)} | PERDA SILENCIOSA: ${covNum(audit?.matchingAudit?.silentLosses)}
      </div>
      <div style="max-height:420px;overflow:auto;display:grid;gap:8px;margin-top:8px;">
        ${rows.slice(0, 80).map((row) => `
          <div class="live-audit-candidate">
            <div class="live-audit-candidate-title">${escapeHtml(row.event || 'EVENTO')}</div>
            <div>${escapeHtml(row.sport || 'UNKNOWN')} · ${escapeHtml(row.competition || 'UNKNOWN')} · Casas encontradas: ${escapeHtml(row.housesFoundLabel || `${covNum(row.houseCount)}/${covNum(row.housesTotal || 0)}`)}</div>
            <div style="margin-top:6px;">${(Array.isArray(row.housesStatus) ? row.housesStatus : Object.keys(audit.houses || {}).map((house) => ({ house, associated: row.houses.includes(house), present: row.houses.includes(house), status: row.houses.includes(house) ? 'ASSOCIATED' : 'AUSENTE_NA_CASA', reason: row.houses.includes(house) ? null : 'REJECTED_PARTICIPANT_MISMATCH' }))).map((item) => `${escapeHtml(item.house)} ${item.associated ? '✓' : '—'}`).join(' · ')}</div>
            <div style="margin-top:6px;font-size:12px;">Identidade canônica: ${escapeHtml(row.canonicalKey || row.key || '-')}</div>
            <div style="margin-top:6px;font-size:12px;">Mercados comuns: ${(row.markets || []).slice(0, 8).map((market) => `${escapeHtml(market.marketType)} (${covNum(market.houseCount)})`).join(' | ') || '-'}</div>
            <div style="margin-top:6px;font-size:12px;">${(row.housesStatus || []).filter((item) => item.present && !item.associated).map((item) => `${escapeHtml(item.house)}: PRESENTE NA CASA / NÃO ASSOCIADO AO GRUPO (${escapeHtml(item.reason || 'OUTRO_MOTIVO_EXPLICITO')})`).join(' | ') || 'Sem casas presentes fora do grupo.'}</div>
          </div>
        `).join('')}
      </div>
      <div class="message" style="white-space:normal;margin-top:8px;">REJEIÇÕES: ${Object.entries(rej).map(([reason, count]) => `${escapeHtml(reason)}=${covNum(count)}`).join(' | ') || '-'}</div>
    `;
    return;
  }

  renderCoverageAuditPanelHouses();
}

function renderCoverageAuditPanelHouses() {
  const body = document.getElementById('covAuditTabBody');
  const audit = coverageAuditPanelState.audit;
  if (!body || !audit) return;

  const houseRows = Object.entries(audit.houses || {});
  const selectedHouseEntry = houseRows.find(([, house]) => String(house.houseId) === String(coverageAuditPanelState.selectedHouseId));
  const selectedHouseName = selectedHouseEntry?.[0] || '';
  const selectedHouse = selectedHouseEntry?.[1] || null;

  const modalities = (audit.relatorioPorEsporte6Casas || [])
    .filter((row) => String(row.casa) === selectedHouseName)
    .filter((row) => String(row.esporte || '').toUpperCase() !== 'UNKNOWN')
    .sort((a, b) => covNum(b.eventos) - covNum(a.eventos));

  const selectedPanel = coverageAuditPanelState.housePanel?.selected;
  const hierarchySports = Array.isArray(selectedPanel?.hierarchy?.sports) ? selectedPanel.hierarchy.sports : [];
  const hierarchyCompetitions = Array.isArray(selectedPanel?.hierarchy?.competitions) ? selectedPanel.hierarchy.competitions : [];
  const competitions = hierarchyCompetitions.length ? hierarchyCompetitions.map((row) => row.name) : (Array.isArray(selectedPanel?.options?.competitions) ? selectedPanel.options.competitions : []);
  const events = Array.isArray(selectedPanel?.events?.items) ? selectedPanel.events.items : [];
  const page = covNum(selectedPanel?.events?.page) || coverageAuditPanelState.page;
  const total = covNum(selectedPanel?.events?.total);
  const pages = Math.max(1, Math.ceil(total / Math.max(1, coverageAuditPanelState.pageSize)));
  const sportIcons = { SOCCER: '⚽', FOOTBALL: '⚽', FUTEBOL: '⚽', TENNIS: '🎾', TENIS: '🎾', TÊNIS: '🎾', BASKETBALL: '🏀', BASQUETE: '🏀', BASEBALL: '⚾', BEISEBOL: '⚾', HOCKEY: '🏒', 'HOQUEI NO GELO': '🏒', 'HÓQUEI NO GELO': '🏒', VOLLEYBALL: '🏐', VOLEI: '🏐', VÔLEI: '🏐', HANDBALL: '🤾', HANDEBOL: '🤾', ESPORTS: '🎮', 'E-SPORTS': '🎮', CRICKET: '🏏', CRIQUETE: '🏏', RUGBY: '🏉', 'RUGBY UNION': '🏉', 'RUGBY LEAGUE': '🏉', BOXING: '🥊', BOXE: '🥊', MMA: '🥋', GOLF: '⛳', GOLFE: '⛳', DARTS: '🎯', DARDOS: '🎯', BILLIARDS: '🎱', BILHAR: '🎱', ATHLETICS: '🏃', ATLETISMO: '🏃', MOTORSPORT: '🏎️', AUTOMOBILISMO: '🏎️', CYCLING: '🚴', CICLISMO: '🚴', 'AMERICAN FOOTBALL': '🏈', 'FUTEBOL AMERICANO': '🏈' };
  const sportLabelsPt = { SOCCER:'Futebol', FOOTBALL:'Futebol', 'ASSOCIATION FOOTBALL':'Futebol', TENNIS:'Tênis', BASKETBALL:'Basquete', BASEBALL:'Beisebol', CRICKET:'Criquete', GOLF:'Golfe', BOXING:'Boxe', BOXE:'Boxe', HOCKEY:'Hóquei no Gelo', 'ICE HOCKEY':'Hóquei no Gelo', 'FIELD HOCKEY':'Hóquei sobre Grama', 'AMERICAN FOOTBALL':'Futebol Americano', 'AUSTRALIAN RULES':'Futebol Australiano', 'AUSTRALIAN FOOTBALL':'Futebol Australiano', 'RUGBY UNION':'Rúgbi Union', 'RUGBY LEAGUE':'Rúgbi League', RUGBY:'Rúgbi', DARTS:'Dardos', BILLIARDS:'Sinuca', SNOOKER:'Sinuca', ATHLETICS:'Atletismo', MOTORSPORT:'Automobilismo', 'FORMULA 1':'Automobilismo', CYCLING:'Ciclismo', ESPORTS:'Esportes Eletrônicos', 'E-SPORTS':'Esportes Eletrônicos', VOLLEYBALL:'Vôlei', HANDBALL:'Handebol', 'TABLE TENNIS':'Tênis de Mesa', BADMINTON:'Badminton', FUTSAL:'Futsal', 'BEACH VOLLEYBALL':'Vôlei de Praia', 'BEACH SOCCER':'Futebol de Praia', 'WATER POLO':'Polo Aquático', 'PADEL TENNIS':'Padel', PADEL:'Padel', SQUASH:'Squash', BOWLING:'Boliche', 'HORSE RACING':'Corrida de Cavalos', GREYHOUNDS:'Corrida de Galgos', SWIMMING:'Natação', TRIATHLON:'Triatlo', SAILING:'Vela', SURFING:'Surfe', JUDO:'Judô', KARATE:'Caratê', TAEKWONDO:'Taekwondo', WEIGHTLIFTING:'Levantamento de Peso', GYMNASTICS:'Ginástica', ARCHERY:'Tiro com Arco', SHOOTING:'Tiro Esportivo' };
  const sportLabelPt = (value) => sportLabelsPt[String(value || '').trim().toUpperCase()] || String(value || '');
  const hasHouse = Boolean(selectedHouse);
  const hasSport = Boolean(coverageAuditPanelState.selectedSport);
  const hasCompetition = Boolean(coverageAuditPanelState.selectedCompetition);
  const hasEvent = Boolean(coverageAuditPanelState.selectedEventId);
  const reconciliation = selectedPanel?.hierarchy?.reconciliation || null;

  body.innerHTML = `
    <div style="display:grid;grid-template-columns:minmax(300px,1fr) minmax(400px,2fr);gap:12px;">
      <div class="message" style="max-height:560px;overflow:auto;">
        <strong>CASAS</strong><br><span style="font-size:11px;opacity:.8">▲ correlacionada · ■ independente comprovada · ● sportsbook/BET · ? indeterminada</span><br><br>
        ${houseRows.map(([houseName, house]) => {
          const eligibility = house.eligibility || {};
          const status = String(eligibility.status || house.readiness?.level || 'UNKNOWN');
          const statusClass = covStatusClass(status);
          const freshness = covFreshness(house?.freshness?.operationalAgeMs);
          const sourceType = String(house.sourceType || house.houseType || house.configuredType || '').toLowerCase();
          const intel = sourceIntelligenceLatestResult || sourceIntelligenceHistoryCache?.[0] || null;
          const sharedClasses = new Set(['CONFIRMED_SHARED_SOURCE','LIKELY_SHARED_SOURCE','LIKELY_SHARED_BOOK','LIKELY_SHARED_LIQUIDITY']);
          const correlatedPairs = (intel?.pairwise || []).filter((pair) => sharedClasses.has(String(pair.classification || '')) && (String(pair.houseA) === String(house.houseId) || String(pair.houseB) === String(house.houseId)));
          const clusterIndex = (intel?.economicClusters || []).findIndex((cluster) => (cluster.houses || []).map(String).includes(String(house.houseId)));
          const isSportsbook = sourceType === 'sportsbook' || sourceType === 'bets' || sourceType === 'bet';
          const sourceSymbol = isSportsbook ? '●' : (correlatedPairs.length ? '▲' : '?');
          const sourceGroup = correlatedPairs.length && clusterIndex >= 0 ? ` G${clusterIndex + 1}` : '';
          const sourceTitle = isSportsbook ? 'Sportsbook/BET: fornece BACK; não deve inventar LAY' : (correlatedPairs.length ? `Fonte/liquidez correlacionada${sourceGroup}; confirmar por esporte antes de bloquear cruzamentos` : 'Fonte ainda não determinada; executar Inteligência de Fontes');
          return `<div style="border:1px solid rgba(255,255,255,.14);border-radius:6px;padding:8px;margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;">
              <strong title="${escapeHtml(sourceTitle)}">${escapeHtml(sourceSymbol + sourceGroup)} ${escapeHtml(houseName)}</strong>
              <span class="cov-status ${statusClass}">${escapeHtml(status)}</span>
            </div>
            <button type="button" data-cov-house="${escapeHtml(house.houseId)}" style="margin-top:6px;${String(house.houseId) === String(coverageAuditPanelState.selectedHouseId) ? 'border-color:#34d399;' : ''}">${String(house.houseId) === String(coverageAuditPanelState.selectedHouseId) ? 'Casa selecionada' : 'Abrir casa'}</button>
          </div>`;
        }).join('')}
      </div>
      <div>
        <div class="message" style="margin-bottom:8px;white-space:normal;">
          <strong>Breadcrumb:</strong> TODAS AS CASAS ${selectedHouseName ? `> ${escapeHtml(selectedHouseName)}` : ''} ${coverageAuditPanelState.selectedSport ? `> ${escapeHtml(sportLabelPt(coverageAuditPanelState.selectedSport))}` : ''} ${coverageAuditPanelState.selectedCompetition ? `> ${escapeHtml(coverageAuditPanelState.selectedCompetition)}` : ''} ${coverageAuditPanelState.selectedEventId ? `> EVENTO ${escapeHtml(coverageAuditPanelState.selectedEventId)}` : ''}
          <div style="display:flex;gap:6px;margin-top:8px;"><button type="button" id="covNavBack" ${!hasHouse ? 'disabled' : ''}>Voltar</button><button type="button" id="covNavClear" ${!hasHouse ? 'disabled' : ''}>Limpar seleção</button></div>
        </div>
        ${hasHouse ? `<div class="message" style="white-space:normal;margin-bottom:8px;"><strong>${escapeHtml(selectedHouseName)} — AUDITORIA REAL</strong><br>Modalidades: ${covNum(selectedHouse.esportesEncontrados)} | Competições: ${covNum(selectedHouse.competicoesEncontradas)} | Eventos recebidos: ${covNum(reconciliation?.sourceEvents ?? selectedHouse.eventosRecebidos)} | Classificados: ${covNum(reconciliation?.classifiedEvents)} | UNKNOWN: ${covNum(reconciliation?.unknownEvents)} | Normalizados: ${covNum(reconciliation?.normalizedEvents)} | Rejeitados: ${covNum(reconciliation?.rejectedEvents)} | Não contabilizados: ${covNum(reconciliation?.unaccountedEvents)}<br>Mercados: ${covNum(selectedHouse.mercados)} | Runners: ${covNum(selectedHouse.selecoes)} | Odds válidas: ${covNum(selectedHouse.oddsValidas)} | BACK: ${covNum(selectedHouse.backValidos)} | LAY: ${covNum(selectedHouse.layValidos)}<br>Última coleta: ${escapeHtml(liveAuditFormatSaoPaulo(selectedHouse?.freshness?.lastOperationalUpdate || selectedHouse?.freshness?.newestOperationalRecord || ''))} | Freshness: ${escapeHtml(covFreshness(selectedHouse?.freshness?.operationalAgeMs).label)}<br>Camadas — Fonte: E${covNum(selectedHouse?.coverageLayers?.source?.events)}/M${covNum(selectedHouse?.coverageLayers?.source?.markets)} | Coletado: E${covNum(selectedHouse?.coverageLayers?.catalog?.events)}/M${covNum(selectedHouse?.coverageLayers?.catalog?.markets)} | Normalizado: E${covNum(selectedHouse?.coverageLayers?.normalized?.events)}/M${covNum(selectedHouse?.coverageLayers?.normalized?.markets)}/R${covNum(selectedHouse?.coverageLayers?.normalized?.runners)}${reconciliation ? `<br><span class="cov-status ${String(reconciliation.reasonCode).startsWith('RECONCILED_') ? 'ok' : 'bad'}">${escapeHtml(reconciliation.reasonCode)}</span> · Diferenças E:${covNum(reconciliation.eventDifference)} M:${covNum(reconciliation.marketDifference)} R:${covNum(reconciliation.runnerDifference)}` : ''}</div>` : ''}
        <div class="message" style="white-space:normal;">
          <strong>MODALIDADES</strong><br>
          ${hasHouse ? (hierarchySports.length ? hierarchySports : modalities.map((row) => ({ name: row.esporte, events: row.eventos, markets: row.mercados, runners: row.selecoes, odds: covNum(row.backUtilizaveis) + covNum(row.layUtilizaveis), freshnessAgeMs: null }))).map((row) => {
            const sportName = row.name || row.esporte;
            const auditedSportStatus = audit?.arbitrageHouseEligibility?.bySport?.[selectedHouseName]?.[sportName]?.status;
            const status = auditedSportStatus || (covNum(row.odds) > 0 ? 'ELIGIBLE' : (covNum(row.markets) > 0 ? 'CONDITIONAL' : (covNum(row.events) > 0 ? 'SOURCE_ONLY' : 'UNKNOWN')));
            const sportFreshness = covFreshness(row.freshnessAgeMs);
            return `<div style="display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid rgba(255,255,255,.08);padding:5px 0;">
              <button type="button" data-cov-sport="${escapeHtml(sportName)}" style="background:none;border:none;color:#9fd3ff;cursor:pointer;text-align:left;padding:0;${sportName === coverageAuditPanelState.selectedSport ? 'font-weight:700;text-decoration:underline;' : ''}">${escapeHtml(row.icon || sportIcons[String(sportName).toUpperCase()] || '🏆')} ${escapeHtml(sportLabelPt(sportName))}</button>
              <span>Ev:${covNum(row.events)} Mk:${covNum(row.markets)} Run:${covNum(row.runners)} Odds:${covNum(row.odds)} Fresh:${escapeHtml(sportFreshness.label)} <span class="cov-status ${covStatusClass(status)}">${escapeHtml(status)}</span></span>
            </div>`;
          }).join('') || 'Sem modalidades disponíveis.' : 'Abra uma casa para listar modalidades.'}
        </div>
        ${hasSport ? `<div class="message" style="margin-top:8px;max-height:180px;overflow:auto;white-space:normal;">
          <strong>COMPETIÇÕES (FILTRO OPCIONAL)</strong><br>
          ${hierarchyCompetitions.map((row) => `<button type="button" data-cov-competition="${escapeHtml(row.name)}" style="margin:4px;text-align:left;${row.name === coverageAuditPanelState.selectedCompetition ? 'border-color:#34d399;' : ''}">${escapeHtml(row.name)}<br><small>Ev:${covNum(row.events)} Mk:${covNum(row.markets)} Run:${covNum(row.runners)} Odds:${covNum(row.odds)}</small></button>`).join('') || competitions.map((competition) => `<button type="button" data-cov-competition="${escapeHtml(competition)}" style="margin:4px;${competition === coverageAuditPanelState.selectedCompetition ? 'border-color:#34d399;' : ''}">${escapeHtml(competition)}</button>`).join('') || 'Nenhuma competição disponível para a modalidade.'}
        </div>` : ''}
        ${hasSport ? `<div class="message" style="margin-top:8px;max-height:360px;overflow:auto;white-space:normal;">
          <strong>EVENTOS — ${escapeHtml(sportLabelPt(coverageAuditPanelState.selectedSport))}</strong> · ${total} total · pág ${page}/${pages}${hasCompetition ? ` · filtro: ${escapeHtml(coverageAuditPanelState.selectedCompetition)}` : ''}<br>
          ${events.map((row) => `<div style="display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid rgba(255,255,255,.08);padding:5px 0;">
            <button type="button" data-cov-event="${escapeHtml(row.eventId)}" style="background:none;border:none;color:#9fd3ff;cursor:pointer;text-align:left;padding:0;">${escapeHtml(row.eventName || row.eventId)}</button>
            <span>${escapeHtml(row.competition || '-')} · ${escapeHtml(liveAuditFormatSaoPaulo(row.startTime || row.lastUpdatedAt || ''))} · M:${covNum(row.marketCount)} R:${covNum(row.runnerCount)} O:${covNum(row.runnerUsablePriceCount)} · ${escapeHtml(row.auditState || 'COLLECTED')} · ${row.reasonCode ? `Reason:${escapeHtml(row.reasonCode)} · ` : ''}Fresh:${escapeHtml(covFreshness(Date.now() - Date.parse(row.lastUpdatedAt || '')).label)}</span>
          </div>`).join('') || 'Nenhum evento para os filtros atuais.'}
          <div style="margin-top:8px;display:flex;gap:8px;">
            <button type="button" id="covEventPrev" ${page <= 1 ? 'disabled' : ''}>Anterior</button>
            <button type="button" id="covEventNext" ${page >= pages ? 'disabled' : ''}>Próxima</button>
          </div>
        </div>` : ''}
        ${hasEvent ? `<div class="message" style="margin-top:8px;max-height:320px;overflow:auto;white-space:normal;">
          <strong>MERCADOS E RUNNERS</strong><br>
          ${renderCoverageAuditEventDetailHtml(coverageAuditPanelState.eventDetail, coverageAuditPanelState.selectedMarketId)}
        </div>` : ''}
      </div>
    </div>
  `;

  body.querySelectorAll('[data-cov-house]').forEach((button) => {
    button.addEventListener('click', async () => {
      coverageAuditPanelState.selectedHouseId = button.dataset.covHouse;
      coverageAuditPanelState.selectedSport = '';
      coverageAuditPanelState.selectedCompetition = '';
      coverageAuditPanelState.selectedEventId = '';
      coverageAuditPanelState.selectedMarketId = '';
      coverageAuditPanelState.eventDetail = null;
      coverageAuditPanelState.page = 1;
      // Exibe imediatamente os dados já presentes na auditoria corrente.
      // A hierarquia detalhada é hidratada em segundo plano sem apagar a tela.
      coverageAuditPanelState.housePanel = null;
      renderCoverageAuditPanel();
      loadCoverageAuditPanelHouseData().then(renderCoverageAuditPanel).catch((error) => {
        const box = document.getElementById('covAuditTabBody');
        if (box) box.textContent = error.message || 'Falha ao abrir casa.';
      });
    });
  });

  body.querySelectorAll('[data-cov-sport]').forEach((button) => {
    const openSport = () => {
      coverageAuditPanelState.selectedSport = button.dataset.covSport;
      coverageAuditPanelState.selectedCompetition = '';
      coverageAuditPanelState.selectedEventId = '';
      coverageAuditPanelState.selectedMarketId = '';
      coverageAuditPanelState.eventDetail = null;
      coverageAuditPanelState.page = 1;
      renderCoverageAuditPanel();
      loadCoverageAuditPanelHouseData().then(renderCoverageAuditPanel).catch((error) => {
        const box = document.getElementById('covAuditTabBody');
        if (box) box.textContent = error.message || 'Falha ao abrir modalidade.';
      });
    };
    // Clique simples continua compatível; duplo clique também abre diretamente, como operação preferida.
    button.addEventListener('click', openSport);
    button.addEventListener('dblclick', (event) => { event.preventDefault(); });
  });

  body.querySelectorAll('[data-cov-competition]').forEach((button) => {
    button.addEventListener('click', () => {
      coverageAuditPanelState.selectedCompetition = button.dataset.covCompetition;
      coverageAuditPanelState.selectedEventId = '';
      coverageAuditPanelState.selectedMarketId = '';
      coverageAuditPanelState.eventDetail = null;
      coverageAuditPanelState.page = 1;
      loadCoverageAuditPanelHouseData().then(renderCoverageAuditPanel).catch((error) => {
        const box = document.getElementById('covAuditTabBody');
        if (box) box.textContent = error.message || 'Falha ao abrir competição.';
      });
    });
  });

  body.querySelectorAll('[data-cov-event]').forEach((button) => {
    button.addEventListener('click', () => {
      coverageAuditPanelState.selectedEventId = button.dataset.covEvent;
      coverageAuditPanelState.selectedMarketId = '';
      loadCoverageAuditPanelHouseData().then(renderCoverageAuditPanel).catch((error) => {
        const box = document.getElementById('covAuditTabBody');
        if (box) box.textContent = error.message || 'Falha ao abrir evento.';
      });
    });
  });

  body.querySelector('#covEventPrev')?.addEventListener('click', () => {
    if (coverageAuditPanelState.page <= 1) return;
    coverageAuditPanelState.page -= 1;
    loadCoverageAuditPanelHouseData().then(renderCoverageAuditPanel).catch(() => null);
  });

  body.querySelector('#covEventNext')?.addEventListener('click', () => {
    coverageAuditPanelState.page += 1;
    loadCoverageAuditPanelHouseData().then(renderCoverageAuditPanel).catch(() => null);
  });

  body.querySelectorAll('[data-cov-market]').forEach((button) => {
    button.addEventListener('click', () => {
      coverageAuditPanelState.selectedMarketId = button.dataset.covMarket;
      renderCoverageAuditPanel();
    });
  });

  body.querySelector('#covNavBack')?.addEventListener('click', () => {
    if (coverageAuditPanelState.selectedMarketId) coverageAuditPanelState.selectedMarketId = '';
    else if (coverageAuditPanelState.selectedEventId) { coverageAuditPanelState.selectedEventId = ''; coverageAuditPanelState.eventDetail = null; }
    else if (coverageAuditPanelState.selectedCompetition) coverageAuditPanelState.selectedCompetition = '';
    else if (coverageAuditPanelState.selectedSport) coverageAuditPanelState.selectedSport = '';
    else { coverageAuditPanelState.selectedHouseId = ''; coverageAuditPanelState.housePanel = null; }
    coverageAuditPanelState.requestVersion += 1;
    coverageAuditPanelState.page = 1;
    renderCoverageAuditPanel();
  });

  body.querySelector('#covNavClear')?.addEventListener('click', () => {
    coverageAuditPanelState.requestVersion += 1;
    Object.assign(coverageAuditPanelState, { selectedHouseId: '', selectedSport: '', selectedCompetition: '', selectedEventId: '', selectedMarketId: '', page: 1, housePanel: null, eventDetail: null, loading: false });
    renderCoverageAuditPanel();
  });
}

function syncLiveAuditWorkspace() {
  const tab = coverageAuditPanelState.activeTab;
  const coverageRoot = document.getElementById('coverageAuditPanelRoot');
  if (coverageRoot) coverageRoot.dataset.activeWorkspace = tab;
  document.querySelectorAll('[data-live-audit-workspace]').forEach((element) => {
    const groups = String(element.dataset.liveAuditWorkspace || '').split(/\s+/);
    element.hidden = !groups.includes(tab);
  });
}

function renderCoverageAuditEventDetailHtml(detail, selectedMarketId = '') {
  if (!detail?.found || !detail?.event) return 'Selecione um evento para ver mercados e runners.';
  const event = detail.event;
  const markets = Array.isArray(event.markets) ? event.markets : [];
  return markets.map((market) => {
    const marketId = String(market.marketId || market.marketType || market.marketName || '');
    const expanded = selectedMarketId && marketId === String(selectedMarketId);
    const rows = (market.runners || []).slice(0, 30).map((runner) => {
      const back = runner.back ?? 'NÃO COLETADO';
      const lay = runner.lay ?? 'NÃO COLETADO';
      const liquidity = runner.liquidityOrVolume ?? 'NÃO DISPONÍVEL';
      const timestamp = runner.updatedAt || 'NÃO COLETADO';
      const freshness = runner.updatedAt ? covFreshness(Date.now() - Date.parse(runner.updatedAt)) : { label: 'N/D', state: 'UNKNOWN' };
      return `Runner original/normalizado: ${escapeHtml(runner.runnerName || 'NÃO COLETADO')} | runnerId/selectionId:${escapeHtml(runner.runnerId || 'NÃO COLETADO')} | BACK:${escapeHtml(String(back))} | LAY:${escapeHtml(String(lay))} | Liquidez:${escapeHtml(String(liquidity))} | Timestamp:${escapeHtml(String(timestamp))} | Freshness:${escapeHtml(freshness.label)} ${escapeHtml(freshness.state)} | Source:${escapeHtml(event.house || 'NÃO DISPONÍVEL')} | Validação:${runner.runnerName && runner.runnerId ? 'ACEITO' : 'REJEITADO/INCOMPLETO'}`;
    }).join('<br>');
    const marketFreshness = market.lastUpdatedAt ? covFreshness(Date.now() - Date.parse(market.lastUpdatedAt)) : { label: 'N/D', state: 'UNKNOWN' };
    const oddsCount = (market.runners || []).filter((runner) => Number(runner.back) > 0 || Number(runner.lay) > 0 || Number(runner.lastMatchedPrice) > 0).length;
    return `<div style="border-top:1px solid rgba(255,255,255,.1);padding-top:6px;margin-top:6px;"><button type="button" data-cov-market="${escapeHtml(marketId)}" style="${expanded ? 'border-color:#34d399;' : ''}">${escapeHtml(market.marketName || market.marketType || market.marketId)}</button> · Original: ${escapeHtml(market.marketName || 'NÃO COLETADO')} · Canônico: ${escapeHtml(market.marketType || 'NÃO DISPONÍVEL')} · MarketId: ${escapeHtml(market.marketId || 'NÃO COLETADO')} · Runners: ${covNum(market.runnerCount)} · Odds: ${oddsCount} · Status: ${escapeHtml(market.status || 'NÃO DISPONÍVEL')} · Freshness: ${escapeHtml(marketFreshness.label)} ${escapeHtml(marketFreshness.state)}${expanded ? `<br>${rows || 'Sem runners visíveis.'}` : ''}</div>`;
  }).join('');
}

function liveAuditSelectedHouses() {
  const container = document.getElementById('liveAuditHouseList');
  if (!container) return [];
  return [...container.querySelectorAll('input[type="checkbox"][data-house-id]:checked')]
    .map((item) => item.dataset.houseId)
    .filter(Boolean);
}

function liveAuditCurrentEvent() {
  return liveAuditState.selectedEvent?.canonicalEvent || '';
}

function liveAuditFormatSaoPaulo(value) {
  const ts = Date.parse(String(value || ''));
  if (!Number.isFinite(ts)) return 'UNKNOWN';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(ts)).replace(',', ' •') + ' — Brasilia';
}

function liveAuditValidationLabel(value) {
  const status = String(value || 'NOT_VALIDATED').toUpperCase();
  if (status === 'HOMOLOGATED') return 'HOMOLOGADA';
  if (status === 'REVALIDATION_REQUIRED') return 'REVALIDACAO';
  if (status === 'FAILED_VALIDATION') return 'FALHOU';
  return 'NAO VALIDADA';
}

function liveAuditRefreshSelectionSnapshot() {
  liveAuditState.selectedHouses = new Set(liveAuditSelectedHouses());
}

async function liveAuditRemoveFromAudit(houseId) {
  const id = String(houseId || '').trim();
  if (!id) return;
  const container = document.getElementById('liveAuditHouseList');
  const checkbox = container?.querySelector(`input[data-house-id="${id.replace(/"/g, '\\"')}"]`);
  if (checkbox) checkbox.checked = false;
  liveAuditRefreshSelectionSnapshot();
  const output = document.getElementById('liveAuditHistoryOutput');
  if (output) {
    output.textContent = JSON.stringify({ success: true, action: 'remove-from-audit', houseId: id, removedAt: new Date().toISOString() }, null, 2);
  }
}

function liveAuditSetModalityOptions(options = [], selectedValue = '') {
  const select = document.getElementById('liveAuditEventModality');
  if (!select) return;
  const current = selectedValue || select.value || '';
  liveAuditState.modalityOptions = Array.isArray(options) ? options : [];
  select.innerHTML = `<option value="">Todas</option>${liveAuditState.modalityOptions.map((item) => `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`).join('')}`;
  if (current && [...select.options].some((opt) => opt.value === current)) select.value = current;
}

async function liveAuditLoadModalityOptions() {
  const houses = liveAuditSelectedHouses();
  const params = new URLSearchParams({ houses: houses.join(',') });
  const result = await fetchJson(`/api/live-audit/events/search?${params.toString()}`);
  if (!result.success) return;
  liveAuditState.modalityOptionsAll = result.result?.availableSports || [];
  liveAuditSetModalityOptions(liveAuditState.modalityOptionsAll, document.getElementById('liveAuditEventModality')?.value || '');
}

async function liveAuditLoadHouses() {
  const container = document.getElementById('liveAuditHouseList');
  const validationSelect = document.getElementById('liveAuditValidationHouse');
  if (!container || !validationSelect) return;
  container.textContent = 'Carregando casas...';
  try {
    const response = await fetchJson('/api/live-audit/houses');
    if (!response.success) {
      container.textContent = response.error || 'Falha ao carregar casas.';
      return;
    }
    const houses = response.houses || [];
    liveAuditState.houses = houses;
    const persistedSelection = liveAuditSelectedHouses();
    const selected = new Set(persistedSelection.length ? persistedSelection : houses.map((house) => house.houseId));
    liveAuditState.selectedHouses = selected;

    // Se não houver casas, mostrar estado vazio com botão operacional
    if (!houses.length) {
      container.innerHTML = `
        <div style="padding: 20px; text-align: center; border: 2px solid rgba(255, 255, 255, 0.2); border-radius: 4px; background: rgba(0, 0, 0, 0.3);">
          <div style="font-size: 16px; font-weight: bold; color: #fff; margin-bottom: 8px;">NENHUMA CASA CADASTRADA</div>
          <div style="font-size: 14px; color: #ccc; margin-bottom: 16px;">Cadastre uma casa para iniciar uma auditoria.</div>
          <button type="button" id="liveAuditAddHouseButton" style="padding: 10px 20px; background: #007bff; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">+ ADICIONAR CASA</button>
        </div>
      `;
      const addHouseBtn = document.getElementById('liveAuditAddHouseButton');
      if (addHouseBtn) {
        addHouseBtn.addEventListener('click', () => {
          // Abrir painel legado no cadastro oficial de casas (Discovery Engine)
          const legacyToggle = document.getElementById('fe-legacy-toggle');
          if (legacyToggle) legacyToggle.click();
          const assistantTab = document.querySelector('nav button[data-tab="assistant"]');
          if (assistantTab) assistantTab.click();
          setTimeout(() => {
            const discoveryCard = document.querySelector('[data-module-id="discovery-engine"]');
            if (discoveryCard) {
              const configBtn = discoveryCard.querySelector('[data-module-action="configure"]');
              if (configBtn) configBtn.click();
            }
          }, 200);
        });
      }
      validationSelect.innerHTML = '<option value="">Selecione</option>';
      return;
    }

    container.innerHTML = houses.map((house) => {
      const checked = selected.has(house.houseId);
      return `<div class="live-audit-house-card" data-live-audit-house-row="${escapeHtml(house.houseId)}"><div class="live-audit-house-main"><label style="display:flex;gap:8px;align-items:center;min-width:0;"><input type="checkbox" data-house-id="${escapeHtml(house.houseId)}" ${checked ? 'checked' : ''} /><span class="live-audit-house-name">${escapeHtml(house.houseName || house.houseId)}</span></label><div class="live-audit-house-meta"><span class="live-audit-chip">Discovery: ${house.readerActive ? 'OK' : 'PENDENTE'}</span><span class="live-audit-chip">Profile: ${escapeHtml(house.profileVersion || '2.0.0')}</span><span class="live-audit-chip">Auditoria: ${escapeHtml(liveAuditValidationLabel(house.validationStatus))}</span></div></div><div class="live-audit-row-actions"><button type="button" class="live-audit-secondary-btn" data-live-audit-toggle-tech="${escapeHtml(house.houseId)}">Detalhes</button><button type="button" class="live-audit-danger-btn" data-live-audit-remove-house="${escapeHtml(house.houseId)}">Remover</button></div></div><div id="liveAuditTech-${escapeHtml(house.houseId)}" style="display:none;padding:6px 8px 8px 8px;font-size:11px;color:#a7b0ba;">UUID: ${escapeHtml(house.houseId)}${house.readerId ? ` · READER: ${escapeHtml(house.readerId)}` : ''}</div>`;
    }).join('');

    validationSelect.innerHTML = `<option value="">Selecione</option>${houses.map((house) => `<option value="${escapeHtml(house.houseId)}">${escapeHtml(house.houseName || house.houseId)}</option>`).join('')}`;

    container.querySelectorAll('input[type="checkbox"][data-house-id]').forEach((input) => {
      input.addEventListener('change', () => {
        liveAuditRefreshSelectionSnapshot();
        liveAuditLoadModalityOptions().catch(() => null);
      });
    });
    container.querySelectorAll('[data-live-audit-toggle-tech]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.liveAuditToggleTech;
        const details = document.getElementById(`liveAuditTech-${id}`);
        if (!details) return;
        const open = details.style.display !== 'none';
        details.style.display = open ? 'none' : 'block';
      });
    });
    container.querySelectorAll('[data-live-audit-remove-house]').forEach((button) => {
      button.addEventListener('click', () => liveAuditRemoveFromAudit(button.dataset.liveAuditRemoveHouse));
    });
    await liveAuditLoadModalityOptions();
  } catch (error) {
    container.textContent = error.message || 'Falha ao carregar casas.';
  }
}

function liveAuditCoverageRowsForCandidate(item) {
  const selectedHouses = liveAuditSelectedHouses();
  const byHouse = new Map((item.coverageByHouse || []).map((entry) => [String(entry.houseId), entry]));
  const diagnostics = new Map((item.houseDiagnostics || []).map((entry) => [String(entry.houseId), entry]));
  return selectedHouses.map((houseId) => {
    const house = liveAuditState.houses.find((row) => String(row.houseId) === String(houseId));
    const found = byHouse.get(String(houseId));
    const detail = diagnostics.get(String(houseId));
    const status = detail?.finalStatus || (found ? 'ENCONTRADO' : 'NAO_ENCONTRADO');
    return {
      houseId,
      houseName: house?.houseName || houseId,
      found: Boolean(found),
      status,
      confidence: detail?.finalScore ?? null,
      originalName: found?.originalName || '-',
      startTimeBrasilia: found?.startTimeBrasilia || '-',
      diagnostic: detail || null,
    };
  });
}

function liveAuditRenderSearchingState() {
  const container = document.getElementById('liveAuditEventCandidates');
  if (!container) return;
  const houses = liveAuditSelectedHouses();
  const names = houses.map((id) => liveAuditState.houses.find((item) => item.houseId === id)?.houseName || id);
  container.innerHTML = `<div class="live-audit-candidate"><div class="live-audit-candidate-title">PESQUISANDO EVENTO...</div><div style="font-size:12px;opacity:.9;">Processando filtros por casa selecionada.</div><div style="display:grid;grid-template-columns:repeat(2,minmax(220px,1fr));gap:8px;margin-top:10px;">${names.map((name) => `<div style="border:1px solid rgba(255,255,255,.12);border-radius:6px;padding:8px;font-size:12px;"><strong>${escapeHtml(name)}</strong><br><span style="color:#f2c94c;">PESQUISANDO...</span></div>`).join('')}</div></div>`;
}

function liveAuditDiagnosticToHtml(rows = []) {
  if (!rows.length) return '<div>Sem diagnóstico técnico.</div>';
  return rows.map((row) => {
    return `<div style="border-top:1px solid rgba(255,255,255,.1);padding:6px 0;"><strong>${escapeHtml(row.houseId)}</strong> · RAW_CANDIDATES: ${escapeHtml(String(row.rawCandidates ?? 0))}<br>SPORT_MATCH: ${escapeHtml(row.sportMatch || '-')}; PARTICIPANT_A_MATCH: ${escapeHtml(row.participantAMatch || '-')}; PARTICIPANT_B_MATCH: ${escapeHtml(row.participantBMatch || '-')}<br>${escapeHtml(row.dateStatus || '-')} · ${escapeHtml(row.timeStatus || '-')} · ORDER: ${escapeHtml(row.orderMatch || '-')}<br>FINAL_SCORE: ${escapeHtml(String(row.finalScore ?? 0))}; FINAL_STATUS: ${escapeHtml(row.finalStatus || '-')}; REJECTION_REASON: ${escapeHtml(row.rejectionReason || '-')}</div>`;
  }).join('');
}

function liveAuditRenderEventCandidates(result = {}) {
  const container = document.getElementById('liveAuditEventCandidates');
  if (!container) return;
  const outcome = result.outcome || '';
  if (outcome === 'DADOS_INSUFICIENTES') {
    container.innerHTML = '<div class="live-audit-candidate"><div class="live-audit-candidate-title">DADOS INSUFICIENTES</div><div>Informe pelo menos modalidade, data, horário ou participante para iniciar a busca.</div></div>';
    liveAuditState.selectedEvent = null;
    return;
  }

  const best = result.selectedCandidate || null;
  const ambiguities = result.conflictingCandidates || [];
  if (!best && !ambiguities.length) {
    container.innerHTML = `<div class="live-audit-candidate"><div class="live-audit-candidate-title">EVENTO NAO ENCONTRADO</div><div>0 de ${liveAuditSelectedHouses().length} casas.</div></div>`;
    liveAuditState.selectedEvent = null;
    return;
  }

  if (result.ambiguous && ambiguities.length) {
    container.innerHTML = `<div class="live-audit-candidate"><div class="live-audit-candidate-title">AMBIGUIDADE DETECTADA</div>${ambiguities.map((item) => `<div style="border-top:1px solid rgba(255,255,255,.1);padding-top:8px;margin-top:8px;"><strong>${escapeHtml(item.eventOriginalName || item.canonicalEvent)}</strong><br><small>${escapeHtml(item.sport || 'UNKNOWN')} · ${escapeHtml(item.startTimeBrasilia || liveAuditFormatSaoPaulo(item.startTime))}<br>ORDEM: ${escapeHtml(item.orderStatus || 'ORDEM_DIRETA')} · CONFIANCA: ${escapeHtml(item.confidence || 'REVISAR')}</small></div>`).join('')}</div>`;
    liveAuditState.selectedEvent = null;
    return;
  }

  const coverageRows = liveAuditCoverageRowsForCandidate(best);
  const foundCount = coverageRows.filter((item) => item.status === 'ENCONTRADO').length;
  const technicalRows = coverageRows.map((item) => item.diagnostic).filter(Boolean);
  const funnelText = (result.funnelCounts || []).map((step) => `${step.stage}: ${step.count}`).join('  |  ');
  container.innerHTML = `<div class="live-audit-candidate"><div class="live-audit-candidate-title">EVENTO IDENTIFICADO</div><div><strong>${escapeHtml(best.eventOriginalName || best.canonicalEvent)}</strong></div><div style="margin-top:6px;font-size:12px;">${escapeHtml(best.sport || 'UNKNOWN')} · ${escapeHtml(best.startTimeBrasilia || liveAuditFormatSaoPaulo(best.startTime))}</div><div style="margin-top:6px;font-size:12px;">CASAS SELECIONADAS: ${coverageRows.length} · EVENTO ENCONTRADO EM: ${foundCount}</div>${funnelText ? `<div style="margin-top:6px;font-size:11px;opacity:.9;">FUNIL: ${escapeHtml(funnelText)}</div>` : ''}<div class="live-audit-coverage-grid">${coverageRows.map((item) => `<div class="live-audit-coverage-item"><div><strong>${escapeHtml(item.houseName)}</strong></div><div class="${item.status === 'ENCONTRADO' ? 'live-audit-coverage-ok' : 'live-audit-coverage-miss'}">${escapeHtml(item.status === 'INCERTO' ? '? INCERTO' : item.status === 'ENCONTRADO' ? '✓ ENCONTRADO' : '— NAO ENCONTRADO')}</div><div>Nome: ${escapeHtml(item.originalName || '-')}</div><div>Horario: ${escapeHtml(item.startTimeBrasilia || '-')}</div><div>Confianca: ${escapeHtml(item.confidence == null ? '-' : String(item.confidence))}</div></div>`).join('')}</div><details style="margin-top:8px;"><summary style="cursor:pointer;">Detalhes tecnicos</summary><small>Canonical: ${escapeHtml(best.canonicalEvent || '-')} · Ordem: ${escapeHtml(best.orderStatus || '-')} · Confianca: ${escapeHtml(best.confidence || '-')}</small><div style="margin-top:8px;font-size:11px;">${liveAuditDiagnosticToHtml(technicalRows)}</div></details><div style="margin-top:10px;"><button type="button" data-live-audit-event="${escapeHtml(best.canonicalEvent)}">ANEXAR EVENTO</button></div></div>`;
  container.querySelector('[data-live-audit-event]')?.addEventListener('click', () => {
      liveAuditState.selectedEvent = best;
      const output = document.getElementById('liveAuditHistoryOutput');
      if (output && best) {
        output.textContent = JSON.stringify({ selectedEvent: best, coverage: coverageRows }, null, 2);
      }
  });
}

async function liveAuditSearchEvents() {
  const houses = liveAuditSelectedHouses();
  liveAuditRenderSearchingState();
  const query = '';
  const modality = document.getElementById('liveAuditEventModality')?.value?.trim() || '';
  const eventDate = document.getElementById('liveAuditEventDate')?.value?.trim() || '';
  const eventTime = document.getElementById('liveAuditEventTime')?.value?.trim() || '';
  const participantA = document.getElementById('liveAuditParticipantA')?.value?.trim() || '';
  const participantB = document.getElementById('liveAuditParticipantB')?.value?.trim() || '';
  const params = new URLSearchParams({
    query,
    modality,
    eventDate,
    eventTime,
    participantA,
    participantB,
    houses: houses.join(','),
  });
  const result = await fetchJson(`/api/live-audit/events/search?${params.toString()}`);
  if (!result.success) throw new Error(result.error || 'Falha na pesquisa de eventos.');
  liveAuditRenderEventCandidates(result.result || {});
  const options = result.result?.availableSports || liveAuditState.modalityOptionsAll || liveAuditState.modalityOptions;
  liveAuditState.modalityOptionsAll = options;
  liveAuditSetModalityOptions(options, modality);
}

function liveAuditClearSearchContext() {
  const ids = [
    'liveAuditEventModality',
    'liveAuditEventDate',
    'liveAuditEventTime',
    'liveAuditParticipantA',
    'liveAuditParticipantB',
  ];
  ids.forEach((id) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.value = '';
  });
  const panel = document.getElementById('liveAuditEventCandidates');
  if (panel) panel.textContent = 'Nenhum evento selecionado.';
  liveAuditState.selectedEvent = null;
}

async function liveAuditLoadMarkets() {
  const canonicalEvent = liveAuditCurrentEvent();
  const houses = liveAuditSelectedHouses();
  if (!canonicalEvent) throw new Error('Selecione um evento antes de carregar mercados.');
  const response = await fetchJson(`/api/live-audit/markets?canonicalEvent=${encodeURIComponent(canonicalEvent)}&houses=${encodeURIComponent(houses.join(','))}`);
  if (!response.success) throw new Error(response.error || 'Falha ao carregar mercados.');
  const payload = response.markets || { markets: [] };
  liveAuditState.markets = payload.markets || [];

  const panel = document.getElementById('liveAuditMarketsPanel');
  const select = document.getElementById('liveAuditMarketSelect');
  if (panel) panel.textContent = JSON.stringify(payload.markets || [], null, 2);
  if (select) {
    const uniqueKeys = [...new Set((payload.markets || []).map((item) => item.marketKey).filter(Boolean))];
    select.innerHTML = `<option value="">Selecione um mercado</option>${uniqueKeys.map((key) => `<option value="${escapeHtml(key)}">${escapeHtml(key)}</option>`).join('')}`;
    if (liveAuditState.selectedMarketKey && uniqueKeys.includes(liveAuditState.selectedMarketKey)) {
      select.value = liveAuditState.selectedMarketKey;
    }
  }
}

async function liveAuditLoadMarketView() {
  const canonicalEvent = liveAuditCurrentEvent();
  const houses = liveAuditSelectedHouses();
  const marketKey = document.getElementById('liveAuditMarketSelect')?.value || liveAuditState.selectedMarketKey;
  if (!canonicalEvent || !marketKey) throw new Error('Selecione evento e mercado para abrir o painel de odds.');
  liveAuditState.selectedMarketKey = marketKey;
  const response = await fetchJson(`/api/live-audit/market-view?canonicalEvent=${encodeURIComponent(canonicalEvent)}&marketKey=${encodeURIComponent(marketKey)}&houses=${encodeURIComponent(houses.join(','))}`);
  if (!response.success) throw new Error(response.error || 'Falha no painel de odds em tempo real.');
  liveAuditState.latestMarketView = response.market || null;

  const meta = document.getElementById('liveAuditRealtimeMeta');
  const output = document.getElementById('liveAuditRealtimeOutput');
  if (meta) {
    const metadata = response.market?.metadata || [];
    meta.innerHTML = metadata.map((item) => `HOUSE ${escapeHtml(item.houseId)} · READER UPDATE FREQUENCY: ${item.readerUpdateFrequencyMs || 'n/a'}ms · LAST RECEIVED: ${escapeHtml(item.lastReceivedUpdate || 'n/a')} · DATA AGE: ${item.dataAgeMs == null ? 'n/a' : `${item.dataAgeMs}ms`}`).join('<br>') || 'Sem metadados para o mercado selecionado.';
  }
  if (output) output.textContent = JSON.stringify(response.market || {}, null, 2);
}

async function liveAuditStartRealtime() {
  if (liveAuditRealtimeTimer) clearInterval(liveAuditRealtimeTimer);
  await liveAuditLoadMarketView();
  const seconds = Number(document.getElementById('liveAuditRefreshSeconds')?.value || 3);
  const intervalMs = Math.max(1000, seconds * 1000);
  liveAuditRealtimeTimer = setInterval(() => {
    liveAuditLoadMarketView().catch((error) => {
      const output = document.getElementById('liveAuditRealtimeOutput');
      if (output) output.textContent = error.message || 'Erro na atualização realtime.';
    });
  }, intervalMs);
}

function liveAuditStopRealtime() {
  if (liveAuditRealtimeTimer) {
    clearInterval(liveAuditRealtimeTimer);
    liveAuditRealtimeTimer = null;
  }
}

async function liveAuditViewRaw() {
  const output = document.getElementById('liveAuditRealtimeOutput');
  const house = liveAuditSelectedHouses()[0] || '';
  const canonicalEvent = liveAuditCurrentEvent();
  const market = liveAuditState.latestMarketView?.rows?.[0]?.sourceMarketId || '';
  const selection = liveAuditState.latestMarketView?.rows?.[0]?.selection || '';
  const response = await fetchJson(`/api/live-audit/raw?houseId=${encodeURIComponent(house)}&canonicalEvent=${encodeURIComponent(canonicalEvent)}&sourceMarketId=${encodeURIComponent(market)}&selection=${encodeURIComponent(selection)}`);
  if (!response.success) throw new Error(response.error || 'Falha ao carregar RAW.');
  if (output) output.textContent = JSON.stringify(response.raw || {}, null, 2);
}

async function liveAuditLoadArbitrage() {
  const houses = liveAuditSelectedHouses();
  const query = document.getElementById('liveAuditEventSearch')?.value?.trim() || '';
  const response = await fetchJson(`/api/live-audit/arbitrage-audit?houses=${encodeURIComponent(houses.join(','))}&query=${encodeURIComponent(query)}`);
  if (!response.success) throw new Error(response.error || 'Falha ao carregar auditoria de arbitragem.');
  liveAuditState.latestArbitrageAudit = response.audit || null;
  const output = document.getElementById('liveAuditArbitrageOutput');
  if (output) output.textContent = JSON.stringify(response.audit || {}, null, 2);
}

function liveAuditCopyArbitrage() {
  const payload = liveAuditState.latestArbitrageAudit;
  if (!payload) return;
  navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).catch(() => {
    const output = document.getElementById('liveAuditArbitrageOutput');
    if (output) output.textContent = 'Falha ao copiar para clipboard.';
  });
}

function liveAuditExportArbitrage() {
  const payload = liveAuditState.latestArbitrageAudit;
  if (!payload) return;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `live-audit-arbitrage-${Date.now()}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

async function liveAuditRefreshValidationStatus() {
  const response = await fetchJson('/api/live-audit/validation/status');
  if (!response.success) throw new Error(response.error || 'Falha ao carregar status de homologação.');
  const panel = document.getElementById('liveAuditValidationStatus');
  if (panel) panel.textContent = JSON.stringify(response.validation || {}, null, 2);
}

async function liveAuditHomologate() {
  const houseId = document.getElementById('liveAuditValidationHouse')?.value || '';
  if (!houseId) throw new Error('Selecione uma casa para homologar.');
  const checklistRaw = document.getElementById('liveAuditValidationChecklist')?.value || '{}';
  let checklist;
  try {
    checklist = JSON.parse(checklistRaw);
  } catch {
    throw new Error('Checklist inválido. Use JSON válido.');
  }
  const notes = document.getElementById('liveAuditValidationNotes')?.value || '';
  const eventName = liveAuditState.selectedEvent?.eventOriginalName || null;
  const sport = liveAuditState.selectedEvent?.sport || null;
  const market = liveAuditState.selectedMarketKey || null;
  const response = await fetchJson('/api/live-audit/validation/homologate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      houseId,
      checklist,
      notes,
      testedEvents: eventName ? [eventName] : [],
      testedSports: sport ? [sport] : [],
      testedMarkets: market ? [market] : [],
      evidenceReferences: [],
      appVersion: '4.0.0',
    }),
  });
  if (!response.success) throw new Error(response.error || 'Falha na homologação manual.');
  await liveAuditRefreshValidationStatus();
}

async function liveAuditInvalidateHomologation() {
  const houseId = document.getElementById('liveAuditValidationHouse')?.value || '';
  const reason = document.getElementById('liveAuditInvalidateReason')?.value?.trim() || '';
  if (!houseId) throw new Error('Selecione uma casa para invalidar homologação.');
  if (!reason) throw new Error('Informe o motivo da invalidação.');
  const response = await fetchJson('/api/live-audit/validation/invalidate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ houseId, reason, targetStatus: 'REVALIDATION_REQUIRED' }),
  });
  if (!response.success) throw new Error(response.error || 'Falha ao invalidar homologação.');
  await liveAuditRefreshValidationStatus();
}

async function liveAuditSaveAuditRecord() {
  const houseId = document.getElementById('liveAuditValidationHouse')?.value || '';
  const house = liveAuditState.houses.find((item) => item.houseId === houseId);
  const response = await fetchJson('/api/live-audit/audits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      houseId,
      house: house?.houseName || houseId,
      sport: liveAuditState.selectedEvent?.sport || null,
      event: liveAuditState.selectedEvent?.eventOriginalName || null,
      market: liveAuditState.selectedMarketKey || null,
      result: 'PASS',
      notes: document.getElementById('liveAuditValidationNotes')?.value || '',
      evidence: { canonicalEvent: liveAuditCurrentEvent(), marketKey: liveAuditState.selectedMarketKey || null },
    }),
  });
  if (!response.success) throw new Error(response.error || 'Falha ao salvar registro de auditoria.');
  const output = document.getElementById('liveAuditHistoryOutput');
  if (output) output.textContent = JSON.stringify(response.audit || {}, null, 2);
}

async function liveAuditReportIssue() {
  const houseId = document.getElementById('liveAuditValidationHouse')?.value || liveAuditSelectedHouses()[0] || '';
  const type = document.getElementById('liveAuditIssueType')?.value || 'OTHER';
  const observed = document.getElementById('liveAuditIssueObserved')?.value || '';
  const expected = document.getElementById('liveAuditIssueExpected')?.value || '';
  const note = document.getElementById('liveAuditIssueNote')?.value || '';
  const canonicalEvent = liveAuditCurrentEvent();
  const sourceMarketId = liveAuditState.latestMarketView?.rows?.[0]?.sourceMarketId || '';
  const selection = liveAuditState.latestMarketView?.rows?.[0]?.selection || '';

  const response = await fetchJson('/api/live-audit/issues/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type,
      houseId,
      canonicalEvent,
      sourceMarketId,
      selection,
      observed,
      expected,
      note,
      technicalContext: {
        selectedHouses: liveAuditSelectedHouses(),
        marketKey: liveAuditState.selectedMarketKey,
      },
    }),
  });
  if (!response.success) throw new Error(response.error || 'Falha ao reportar inconsistência.');
  const output = document.getElementById('liveAuditIssueOutput');
  if (output) output.textContent = JSON.stringify(response.issue || {}, null, 2);
}

async function liveAuditLoadIssuesHistory() {
  const response = await fetchJson('/api/live-audit/issues/history');
  if (!response.success) throw new Error(response.error || 'Falha ao carregar histórico de inconsistências.');
  const output = document.getElementById('liveAuditIssueOutput');
  if (output) output.textContent = JSON.stringify(response.history || {}, null, 2);
}

async function liveAuditLoadAuditHistory() {
  const response = await fetchJson('/api/live-audit/audits/history');
  if (!response.success) throw new Error(response.error || 'Falha ao carregar histórico de auditorias.');
  const output = document.getElementById('liveAuditHistoryOutput');
  if (output) output.textContent = JSON.stringify(response.history || {}, null, 2);
}

async function liveAuditLoadHomologationHistory() {
  const response = await fetchJson('/api/live-audit/validation/history');
  if (!response.success) throw new Error(response.error || 'Falha ao carregar histórico de homologações.');
  const output = document.getElementById('liveAuditHistoryOutput');
  if (output) output.textContent = JSON.stringify(response.history || {}, null, 2);
}

function selectedSourceIntelligenceHouses() {
  const container = document.getElementById('sourceIntelligenceHouses');
  if (!container) return [];
  return [...container.querySelectorAll('input[type="checkbox"][data-house-id]:checked')]
    .map((item) => item.dataset.houseId)
    .filter(Boolean);
}

function sourceIntelligenceDurationMinutes() {
  const preset = document.getElementById('sourceIntelligenceDurationPreset');
  const custom = document.getElementById('sourceIntelligenceDurationCustom');
  const value = preset?.value === 'custom' ? Number(custom?.value || 5) : Number(preset?.value || 5);
  if (!Number.isFinite(value)) return 5;
  return Math.min(30, Math.max(1, Math.round(value)));
}

function renderSourceIntelligenceProgress(progress = {}) {
  const elapsed = document.getElementById('sourceIntelligenceElapsed');
  const houses = document.getElementById('sourceIntelligenceHousesAnalyzed');
  const commonEvents = document.getElementById('sourceIntelligenceCommonEvents');
  const commonMarkets = document.getElementById('sourceIntelligenceCommonMarkets');
  const quotesCompared = document.getElementById('sourceIntelligenceQuotesCompared');
  const changesObserved = document.getElementById('sourceIntelligenceChangesObserved');
  if (elapsed) elapsed.textContent = `${Number(progress.elapsedSeconds || 0)}s`;
  if (houses) houses.textContent = Array.isArray(progress.housesAnalyzed) && progress.housesAnalyzed.length ? progress.housesAnalyzed.join(' · ') : '-';
  if (commonEvents) commonEvents.textContent = String(progress.commonEventsFound || 0);
  if (commonMarkets) commonMarkets.textContent = String(progress.commonMarketsFound || 0);
  if (quotesCompared) quotesCompared.textContent = String(progress.quotesCompared || 0);
  if (changesObserved) changesObserved.textContent = String(progress.changesObserved || 0);
}

function renderSourceIntelligenceHistoryPanel() {
  const panel = document.getElementById('sourceIntelligenceHistoryPanel');
  if (!panel) return;
  if (!sourceIntelligenceHistoryCache.length) {
    panel.textContent = 'Nenhum historico disponivel.';
    return;
  }
  panel.innerHTML = sourceIntelligenceHistoryCache.slice(0, 12).map((item, index) => {
    const houses = Array.isArray(item.houses) ? item.houses.join(' · ') : '-';
    const runId = String(item.runId || '').slice(0, 12);
    const at = item.generatedAt ? new Date(item.generatedAt).toLocaleString('pt-BR') : '-';
    return `<div style="padding:6px 0; border-bottom:1px solid rgba(255,255,255,.1);"><strong>#${index + 1}</strong> ${escapeHtml(houses)}<br><small>${escapeHtml(at)} · run ${escapeHtml(runId)}</small></div>`;
  }).join('');
}

async function runSourceIntelligenceRequest() {
  const summary = document.getElementById('sourceIntelligenceSummary');
  const output = document.getElementById('sourceIntelligenceResult');
  if (!summary || !output) return;
  const houses = selectedSourceIntelligenceHouses();
  if (houses.length < 2) {
    summary.textContent = 'Selecione pelo menos 2 casas.';
    output.textContent = 'Selecione pelo menos 2 casas.';
    return;
  }
  summary.textContent = 'Executando diagnostico em tempo real...';
  output.textContent = 'Executando diagnostico...';
  renderSourceIntelligenceProgress({ elapsedSeconds: 0, housesAnalyzed: [], commonEventsFound: 0, commonMarketsFound: 0, quotesCompared: 0, changesObserved: 0 });
  try {
    const response = await fetchJson('/api/source-intelligence/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ houses, durationMinutes: sourceIntelligenceDurationMinutes() }),
    });
    if (!response.success) {
      summary.textContent = response.error || 'Diagnóstico indisponível.';
      output.textContent = response.error || 'Diagnóstico indisponível.';
      return;
    }
    sourceIntelligenceActiveJobId = response.jobId;
    let finished = false;
    while (!finished && sourceIntelligenceActiveJobId) {
      const status = await fetchJson(`/api/source-intelligence/jobs/${encodeURIComponent(sourceIntelligenceActiveJobId)}`);
      if (!status.success || !status.job) {
        summary.textContent = status.error || 'Falha ao obter progresso do diagnostico.';
        output.textContent = summary.textContent;
        return;
      }
      renderSourceIntelligenceProgress(status.job.progress || {});
      if (status.job.status === 'completed') {
        const result = status.job.result || {};
        sourceIntelligenceLatestResult = result;
        summary.innerHTML = `<strong>${escapeHtml(result.houses?.join(' · ') || 'Diagnostico')}</strong><br>${escapeHtml(result.humanSummary || 'Resumo indisponivel.')}`;
        output.textContent = JSON.stringify(result, null, 2);
        finished = true;
        sourceIntelligenceActiveJobId = null;
        await refreshSourceIntelligenceHistory();
      } else if (status.job.status === 'failed') {
        summary.textContent = status.job.error || 'Falha no diagnostico.';
        output.textContent = summary.textContent;
        finished = true;
        sourceIntelligenceActiveJobId = null;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  } catch (error) {
    summary.textContent = error.message || 'Erro ao executar diagnóstico.';
    output.textContent = error.message || 'Erro ao executar diagnóstico.';
  }
}

async function refreshSourceIntelligenceHistory() {
  const summary = document.getElementById('sourceIntelligenceSummary');
  const output = document.getElementById('sourceIntelligenceResult');
  if (!summary || !output) return;
  try {
    const response = await fetchJson('/api/source-intelligence/history');
    if (!response.success) {
      summary.textContent = response.error || 'Histórico indisponível.';
      output.textContent = response.error || 'Histórico indisponível.';
      return;
    }
    const history = response.history || [];
    sourceIntelligenceHistoryCache = history;
    renderSourceIntelligenceHistoryPanel();
    summary.textContent = history.length ? `${history.length} execucao(oes) registrada(s).` : 'Nenhum historico disponivel.';
    if (!sourceIntelligenceLatestResult && history.length) {
      sourceIntelligenceLatestResult = history[0];
      output.textContent = JSON.stringify(history[0], null, 2);
    }
  } catch (error) {
    summary.textContent = error.message || 'Erro ao carregar histórico.';
    output.textContent = error.message || 'Erro ao carregar histórico.';
  }
}

function sourceIntelligenceSelectAllHouses() {
  const container = document.getElementById('sourceIntelligenceHouses');
  if (!container) return;
  container.querySelectorAll('input[type="checkbox"][data-house-id]').forEach((item) => {
    item.checked = true;
  });
}

function sourceIntelligenceClearAllHouses() {
  const container = document.getElementById('sourceIntelligenceHouses');
  if (!container) return;
  container.querySelectorAll('input[type="checkbox"][data-house-id]').forEach((item) => {
    item.checked = false;
  });
}

function exportSourceIntelligenceJson() {
  const data = sourceIntelligenceLatestResult || sourceIntelligenceHistoryCache[0] || null;
  if (!data) {
    const summary = document.getElementById('sourceIntelligenceSummary');
    if (summary) summary.textContent = 'Nenhum resultado para exportar.';
    return;
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const suffix = String(data.runId || Date.now());
  a.href = url;
  a.download = `source-intelligence-${suffix}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function compareSourceIntelligenceWithPrevious() {
  const summary = document.getElementById('sourceIntelligenceSummary');
  const output = document.getElementById('sourceIntelligenceResult');
  const current = sourceIntelligenceLatestResult || sourceIntelligenceHistoryCache[0] || null;
  if (!current?.runId) {
    if (summary) summary.textContent = 'Execute ou carregue um historico para comparar.';
    return;
  }
  try {
    const response = await fetchJson(`/api/source-intelligence/history/compare?current=${encodeURIComponent(current.runId)}`);
    if (!response.success) {
      if (summary) summary.textContent = response.error || 'Comparacao indisponivel.';
      if (output) output.textContent = response.error || 'Comparacao indisponivel.';
      return;
    }
    if (summary) summary.textContent = `Comparacao concluida: ${response.comparison?.currentRunId || '-'} vs ${response.comparison?.previousRunId || '-'}`;
    if (output) output.textContent = JSON.stringify(response.comparison || {}, null, 2);
  } catch (error) {
    if (summary) summary.textContent = error.message || 'Erro ao comparar historico.';
    if (output) output.textContent = error.message || 'Erro ao comparar historico.';
  }
}

function initializeFoundationModules() {
  const patchOutput = document.getElementById('patchManagerResult');
  const backupOutput = document.getElementById('backupManagerResult');
  const testOutput = document.getElementById('testRunnerResult');
  const auditOutput = document.getElementById('auditorResult');
  const comparisonOutput = document.getElementById('comparisonResult');
  const body = (data) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

  document.getElementById('createOfficialPatch')?.addEventListener('click', () => foundationRequest('/api/foundation/patches', body({
    name: document.getElementById('patchName').value, version: document.getElementById('patchVersion').value,
    author: document.getElementById('patchAuthor').value, description: document.getElementById('patchDescription').value,
    basePath: document.getElementById('patchBasePath').value, targetPath: document.getElementById('patchTargetPath').value,
  }), patchOutput));
  document.getElementById('applyOfficialPatch')?.addEventListener('click', () => foundationRequest('/api/foundation/patches/apply', body({ patchFile: document.getElementById('patchFilePath').value, targetPath: document.getElementById('patchApplyTarget').value }), patchOutput));
  document.getElementById('refreshPatchHistory')?.addEventListener('click', async () => {
    const response = await foundationRequest('/api/foundation/patches', {}, patchOutput);const container = document.getElementById('patchHistory');container.innerHTML = '';
    for (const item of response?.result || []) { const row = document.createElement('div');const label = document.createElement('span');label.textContent = `${item.date || item.createdAt} · ${item.name || item.patchId} · ${item.status}`;row.appendChild(label);if (item.applicationId && item.status === 'applied') { const rollback = document.createElement('button');rollback.textContent = 'Rollback';rollback.addEventListener('click', () => foundationRequest(`/api/foundation/patches/${encodeURIComponent(item.applicationId)}/rollback`, body({}), patchOutput));row.appendChild(rollback); }container.appendChild(row); }
    if (!container.children.length) container.textContent = 'Sem histórico.';
  });

  document.getElementById('createOfficialBackup')?.addEventListener('click', () => foundationRequest('/api/foundation/backups', body({ name: document.getElementById('backupName').value, sourcePath: document.getElementById('backupSourcePath').value, type: document.getElementById('backupType').value }), backupOutput));
  document.getElementById('refreshBackupHistory')?.addEventListener('click', async () => {
    const response = await foundationRequest('/api/foundation/backups', {}, backupOutput);const container = document.getElementById('backupHistory');container.innerHTML = '';
    for (const item of response?.result || []) { const row = document.createElement('div');const label = document.createElement('span');label.textContent = `${item.createdAt} · ${item.name} · ${item.type} · ${item.files} arquivos`;row.appendChild(label);const restore = document.createElement('button');restore.textContent = 'Restaurar';restore.addEventListener('click', () => { if (confirm(`Restaurar o backup ${item.name}? Um backup de segurança será criado.`)) foundationRequest(`/api/foundation/backups/${encodeURIComponent(item.id)}/restore`, body({ targetPath: item.sourcePath }), backupOutput); });row.appendChild(restore);const remove = document.createElement('button');remove.textContent = 'Excluir';remove.addEventListener('click', () => { if (confirm(`Excluir o backup ${item.name}?`)) foundationRequest(`/api/foundation/backups/${encodeURIComponent(item.id)}`, { method: 'DELETE' }, backupOutput); });row.appendChild(remove);container.appendChild(row); }
    if (!container.children.length) container.textContent = 'Sem histórico.';
  });

  document.querySelectorAll('[data-test-group]').forEach((button) => button.addEventListener('click', () => foundationRequest('/api/foundation/tests/run', body({ group: button.dataset.testGroup }), testOutput)));
  document.getElementById('runCompleteAudit')?.addEventListener('click', () => foundationRequest('/api/foundation/audit/run', body({}), auditOutput));
  document.getElementById('runSourceIntelligence')?.addEventListener('click', () => runSourceIntelligenceRequest());
  document.getElementById('refreshSourceIntelligenceHistory')?.addEventListener('click', () => refreshSourceIntelligenceHistory());
  document.getElementById('exportSourceIntelligenceJson')?.addEventListener('click', () => exportSourceIntelligenceJson());
  document.getElementById('compareSourceIntelligenceHistory')?.addEventListener('click', () => compareSourceIntelligenceWithPrevious());
  document.getElementById('sourceIntelligenceSelectAll')?.addEventListener('click', () => sourceIntelligenceSelectAllHouses());
  document.getElementById('sourceIntelligenceClearAll')?.addEventListener('click', () => sourceIntelligenceClearAllHouses());
  document.getElementById('sourceIntelligenceDurationPreset')?.addEventListener('change', (event) => {
    const row = document.getElementById('sourceIntelligenceCustomDurationRow');
    if (row) row.style.display = event.target.value === 'custom' ? '' : 'none';
  });
  document.getElementById('runComparison')?.addEventListener('click', () => foundationRequest('/api/foundation/compare', body({ type: document.getElementById('comparisonType').value, leftPath: document.getElementById('comparisonLeft').value, rightPath: document.getElementById('comparisonRight').value }), comparisonOutput));
  populateSourceIntelligenceHouses();

  document.getElementById('liveAuditSelectAllHouses')?.addEventListener('click', () => {
    const container = document.getElementById('liveAuditHouseList');
    if (!container) return;
    container.querySelectorAll('input[type="checkbox"][data-house-id]').forEach((item) => { item.checked = true; });
    liveAuditState.selectedHouses = new Set(liveAuditSelectedHouses());
    liveAuditLoadModalityOptions().catch(() => null);
  });
  document.getElementById('liveAuditClearHouses')?.addEventListener('click', () => {
    const container = document.getElementById('liveAuditHouseList');
    if (!container) return;
    container.querySelectorAll('input[type="checkbox"][data-house-id]').forEach((item) => { item.checked = false; });
    liveAuditState.selectedHouses = new Set();
    liveAuditLoadModalityOptions().catch(() => null);
  });
  document.getElementById('liveAuditRefreshHouses')?.addEventListener('click', () => liveAuditLoadHouses().catch((error) => {
    const panel = document.getElementById('liveAuditHouseList');
    if (panel) panel.textContent = error.message || 'Falha ao atualizar casas.';
  }));
  document.getElementById('liveAuditDatePickerOpen')?.addEventListener('click', () => {
    const input = document.getElementById('liveAuditEventDate');
    if (!input) return;
    if (typeof input.showPicker === 'function') input.showPicker();
    else input.focus();
  });
  document.getElementById('liveAuditSearchEvent')?.addEventListener('click', () => liveAuditSearchEvents().catch((error) => {
    const panel = document.getElementById('liveAuditEventCandidates');
    if (panel) panel.innerHTML = `<div class="live-audit-candidate"><div class="live-audit-candidate-title">ERRO NA PESQUISA</div><div>${escapeHtml(error.message || 'Falha na pesquisa de eventos.')}</div></div>`;
  }));
  document.getElementById('liveAuditClearEventSearch')?.addEventListener('click', () => liveAuditClearSearchContext());
  document.getElementById('liveAuditLoadMarkets')?.addEventListener('click', () => liveAuditLoadMarkets().catch((error) => {
    const panel = document.getElementById('liveAuditMarketsPanel');
    if (panel) panel.textContent = error.message || 'Falha ao carregar mercados.';
  }));
  document.getElementById('liveAuditMarketSelect')?.addEventListener('change', () => {
    liveAuditState.selectedMarketKey = document.getElementById('liveAuditMarketSelect')?.value || '';
  });
  document.getElementById('liveAuditStartRealtime')?.addEventListener('click', () => liveAuditStartRealtime().catch((error) => {
    const output = document.getElementById('liveAuditRealtimeOutput');
    if (output) output.textContent = error.message || 'Falha no realtime.';
  }));
  document.getElementById('liveAuditStopRealtime')?.addEventListener('click', () => liveAuditStopRealtime());
  document.getElementById('liveAuditViewRaw')?.addEventListener('click', () => liveAuditViewRaw().catch((error) => {
    const output = document.getElementById('liveAuditRealtimeOutput');
    if (output) output.textContent = error.message || 'Falha no RAW.';
  }));
  document.getElementById('liveAuditLoadArbitrage')?.addEventListener('click', () => liveAuditLoadArbitrage().catch((error) => {
    const output = document.getElementById('liveAuditArbitrageOutput');
    if (output) output.textContent = error.message || 'Falha na auditoria de arbitragem.';
  }));
  document.getElementById('liveAuditCopyArbitrage')?.addEventListener('click', () => liveAuditCopyArbitrage());
  document.getElementById('liveAuditExportArbitrage')?.addEventListener('click', () => liveAuditExportArbitrage());
  document.getElementById('liveAuditRefreshValidation')?.addEventListener('click', () => liveAuditRefreshValidationStatus().catch((error) => {
    const panel = document.getElementById('liveAuditValidationStatus');
    if (panel) panel.textContent = error.message || 'Falha ao carregar status.';
  }));
  document.getElementById('liveAuditHomologate')?.addEventListener('click', () => liveAuditHomologate().catch((error) => {
    const panel = document.getElementById('liveAuditValidationStatus');
    if (panel) panel.textContent = error.message || 'Falha na homologação manual.';
  }));
  document.getElementById('liveAuditInvalidate')?.addEventListener('click', () => liveAuditInvalidateHomologation().catch((error) => {
    const panel = document.getElementById('liveAuditValidationStatus');
    if (panel) panel.textContent = error.message || 'Falha ao invalidar homologação.';
  }));
  document.getElementById('liveAuditSaveAuditRecord')?.addEventListener('click', () => liveAuditSaveAuditRecord().catch((error) => {
    const panel = document.getElementById('liveAuditHistoryOutput');
    if (panel) panel.textContent = error.message || 'Falha ao salvar auditoria.';
  }));
  document.getElementById('liveAuditReportIssue')?.addEventListener('click', () => liveAuditReportIssue().catch((error) => {
    const panel = document.getElementById('liveAuditIssueOutput');
    if (panel) panel.textContent = error.message || 'Falha ao reportar inconsistência.';
  }));
  document.getElementById('liveAuditLoadIssues')?.addEventListener('click', () => liveAuditLoadIssuesHistory().catch((error) => {
    const panel = document.getElementById('liveAuditIssueOutput');
    if (panel) panel.textContent = error.message || 'Falha ao carregar inconsistências.';
  }));
  document.getElementById('liveAuditLoadAuditHistory')?.addEventListener('click', () => liveAuditLoadAuditHistory().catch((error) => {
    const panel = document.getElementById('liveAuditHistoryOutput');
    if (panel) panel.textContent = error.message || 'Falha ao carregar histórico de auditorias.';
  }));
  document.getElementById('liveAuditLoadHomologationHistory')?.addEventListener('click', () => liveAuditLoadHomologationHistory().catch((error) => {
    const panel = document.getElementById('liveAuditHistoryOutput');
    if (panel) panel.textContent = error.message || 'Falha ao carregar histórico de homologações.';
  }));
  document.getElementById('liveAuditOpenSourceIntelligence')?.addEventListener('click', () => {
    const button = document.querySelector('nav button[data-tab="source-intelligence"]');
    if (button) button.click();
  });
  document.getElementById('openDiscoveryRegistration')?.addEventListener('click', async () => {
    setActiveTab('assistant');
    assistantModuleTitle.textContent = 'CADASTRAR CASA / EXCHANGE';
    await renderDiscoveryConfiguration();
  });

}

window.addEventListener('load', () => {
  // Garantir que o painel legado inicia oculto ao carregar
  const _panel = document.getElementById('fe-legacy-panel');
  if (_panel) _panel.hidden = true;

  const restoredTab = decodeURIComponent(location.hash.slice(1)) || sessionStorage.getItem('fallah.activeTab') || 'dashboard';
  setActiveTab(restoredTab, { replace: true });
  loadPreferencesLocal();
  applyUiPreferences();
  syncPreferencesForm();
  loadDashboard();
  installMonacoEditor();
  loadAssistantModules();
  updateGlobalClock();
  updateRuntimeStats();
  initializeFoundationModules();
  window.addEventListener('resize', () => {
    if (editor) editor.layout();
  });
  const operationalStatus = document.getElementById('systemOperationalStatus');
  const refreshOperationalMode = async () => {
    try {
      const result = await fetchJson('/api/pipeline/status');
      const mode = result.pipeline?.engine?.operationalMode || 'ONLINE';
      if (operationalStatus) operationalStatus.textContent = mode === 'OFFLINE' ? 'SISTEMA OFFLINE — cadastro liberado' : 'SISTEMA ONLINE — coleta ativa';
    } catch { if (operationalStatus) operationalStatus.textContent = 'Status indisponível'; }
  };
  document.getElementById('systemOfflineButton')?.addEventListener('click', async () => {
    if (operationalStatus) operationalStatus.textContent = 'Desligando coletas...';
    const result = await fetchJson('/api/pipeline/operational-mode', { method: 'PATCH', body: JSON.stringify({ mode: 'OFFLINE' }) });
    if (operationalStatus) operationalStatus.textContent = result.success ? 'SISTEMA OFFLINE — cadastro liberado' : (result.error || 'Falha ao desligar');
  });
  document.getElementById('systemOnlineButton')?.addEventListener('click', async () => {
    if (operationalStatus) operationalStatus.textContent = 'Ligando coletas...';
    const result = await fetchJson('/api/pipeline/operational-mode', { method: 'PATCH', body: JSON.stringify({ mode: 'ONLINE' }) });
    if (operationalStatus) operationalStatus.textContent = result.success ? 'SISTEMA ONLINE — coleta ativa' : (result.error || 'Falha ao ligar');
  });
  setInterval(updateGlobalClock, 1000);
  setInterval(updateRuntimeStats, 4000);
  createMissionButton.addEventListener('click', createMission);
  refreshMissions.addEventListener('click', () => loadMissions());
  loadMoreMissions?.addEventListener('click', () => loadMissions(missionPage + 1, true));
  closeMissionDetails.addEventListener('click', closeMissionDetailsView);
  runScanner.addEventListener('click', runScannerJob);
  loadMoreScanner?.addEventListener('click', async () => {
    const response = await fetchJson(`/api/scanner/tree?page=${scannerTreePage + 1}&limit=500`);
    if (!response.success) return;
    scannerTreeData = [...scannerTreeData, ...response.tree];scannerTreePage = response.pagination?.page || scannerTreePage + 1;scannerTreePages = response.pagination?.pages || scannerTreePages;
    scannerTree.innerHTML = '';scannerTree.appendChild(renderScannerTree(scannerTreeData));loadMoreScanner.classList.toggle('hidden', scannerTreePage >= scannerTreePages);
  });
  cancelScanner.addEventListener('click', cancelScannerJob);
  setInterval(() => { if (document.querySelector('#missions.active')) loadMissions(); }, 15000);
  setInterval(() => { if (document.querySelector('#chat.active')) loadConversations(); }, 20000);
  newConversation.addEventListener('click', createNewConversation);
  loadMoreConversations?.addEventListener('click', () => loadConversations(conversationPage + 1, true));
  renameConversation.addEventListener('click', renameCurrentConversation);
  duplicateConversationButton?.addEventListener('click', duplicateCurrentConversation);
  pinConversationButton?.addEventListener('click', toggleCurrentConversationPin);
  copyConversationButton?.addEventListener('click', copyEntireConversation);
  shareConversationButton?.addEventListener('click', prepareShareCurrentConversation);
  clearConversationButton?.addEventListener('click', clearCurrentConversation);
  deleteConversationButton?.addEventListener('click', deleteCurrentConversation);
  clearAllConversationsButton?.addEventListener('click', clearEveryConversation);
  exportConversation.addEventListener('click', () => exportCurrentConversation('json'));
  exportConversationTxt?.addEventListener('click', () => exportCurrentConversation('txt'));
  exportConversationMd?.addEventListener('click', () => exportCurrentConversation('md'));
  importConversationButton.addEventListener('click', () => chatImportFile.click());
  chatImportFile.addEventListener('change', handleChatImportFile);
  chatConversationSearch.addEventListener('input', filterConversationList);
  chatConversationSort?.addEventListener('change', filterConversationList);
  chatSearch.addEventListener('input', () => {
    const filterText = chatSearch.value.trim().toLowerCase();
    document.querySelectorAll('.chat-item-body').forEach((body) => {
      const item = body.closest('.chat-item');
      item.classList.toggle('hidden', filterText && !body.textContent.toLowerCase().includes(filterText));
    });
  });
  cancelChat.addEventListener('click', cancelChatGeneration);
  chatAttachmentButton.addEventListener('click', () => {
    const visible = !chatAttachmentMenu.classList.contains('hidden');
    chatAttachmentMenu.classList.toggle('hidden', visible);
    chatAttachmentButton.setAttribute('aria-expanded', String(!visible));
  });
  chatAttachmentMenu?.querySelectorAll('[data-attachment-action]').forEach((button) => button.addEventListener('click', async () => {
    const action = button.dataset.attachmentAction;
    chatAttachmentMenu.classList.add('hidden');chatAttachmentButton.setAttribute('aria-expanded', 'false');
    if (action === 'clipboard') await addClipboardAttachment();else openChatAttachmentPicker(action);
  }));
  chatAttachment.addEventListener('change', handleChatAttachmentSelection);
  chatInput.addEventListener('input', autoResizeChatInput);
  chatInput.addEventListener('dragover', (event) => { event.preventDefault();chatInput.dataset.dragging = 'true'; });
  chatInput.addEventListener('dragleave', () => { delete chatInput.dataset.dragging; });
  chatInput.addEventListener('drop', async (event) => { event.preventDefault();delete chatInput.dataset.dragging;await addChatAttachmentFiles(Array.from(event.dataTransfer?.files || [])); });
  [chatSpeed, chatProfile, chatEnterBehavior].forEach((control) => control?.addEventListener('change', () => localStorage.setItem(`fallah.chat.${control.id}`, control.value)));
  [chatSpeed, chatProfile, chatEnterBehavior].forEach((control) => { if (control) control.value = localStorage.getItem(`fallah.chat.${control.id}`) || control.value; });
  sendChat.addEventListener('click', sendChatMessage);
  refreshAssistantModules.addEventListener('click', loadAssistantModules);
  savePreferences.addEventListener('click', persistPreferences);
  openPreferencesTop.addEventListener('click', () => setActiveTab('preferences'));
  toggleTheme.addEventListener('click', toggleThemeMode);
  toolbarSettings.addEventListener('click', () => setActiveTab('preferences'));
  toolbarNewFile.addEventListener('click', () => promptCreate('file', currentDirectory || ''));
  toolbarNewFolder.addEventListener('click', () => promptCreate('folder', currentDirectory || ''));
  toolbarPaste.addEventListener('click', () => pasteNode(currentDirectory || ''));
  toolbarCopy.addEventListener('click', () => {
    const node = getSelectedExplorerNode();
    if (node) copyNode(node);
  });
  toolbarCut.addEventListener('click', () => {
    const node = getSelectedExplorerNode();
    if (node) cutNode(node);
  });
  toolbarDuplicate.addEventListener('click', () => {
    const node = getSelectedExplorerNode();
    if (node) duplicateNode(node);
  });
  toolbarMove.addEventListener('click', () => {
    const node = getSelectedExplorerNode();
    if (node) moveNode(node);
  });
  toolbarRename.addEventListener('click', () => {
    const node = getSelectedExplorerNode();
    if (node) promptRename(node);
  });
  toolbarDelete.addEventListener('click', () => {
    const node = getSelectedExplorerNode();
    if (node) promptDelete(node);
  });
  toolbarFavorite.addEventListener('click', () => {
    const node = getSelectedExplorerNode();
    if (node) toggleFavorite(node.path);
  });
  toolbarZip.addEventListener('click', () => {
    const node = getSelectedExplorerNode();
    if (node) createZipFromNode(node);
  });
  toolbarExtract.addEventListener('click', () => {
    setActiveTab('zip');
    zipResult.textContent = 'Use o botão de importação ZIP para extrair o conteúdo.';
  });
  toolbarImport.addEventListener('click', () => setActiveTab('zip'));
  toolbarExport.addEventListener('click', () => {
    zipPath.value = currentDirectory || '.';
    createZip.click();
    setActiveTab('zip');
  });
  chatInput.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      const start = chatInput.selectionStart;chatInput.setRangeText('  ', start, chatInput.selectionEnd, 'end');autoResizeChatInput();return;
    }
    const enterSends = chatEnterBehavior?.value !== 'newline';
    if (event.key === 'Enter' && (event.ctrlKey || (enterSends && !event.shiftKey))) {
      event.preventDefault();
      sendChatMessage();
    }
  });
  missionSearch.addEventListener('input', () => {
    renderMissionList(applyMissionFilters(allMissions));
    clearTimeout(missionSearch.reloadTimer);missionSearch.reloadTimer = setTimeout(loadMissions, 250);
  });
  missionStatusFilter.addEventListener('change', () => renderMissionList(applyMissionFilters(allMissions)));
  missionPriorityFilter.addEventListener('change', () => renderMissionList(applyMissionFilters(allMissions)));
  missionCategoryFilter.addEventListener('input', () => renderMissionList(applyMissionFilters(allMissions)));
  cancelTerminal.addEventListener('click', cancelTerminalCommand);
  if (aiProviderSelect) {
    aiProviderSelect.addEventListener('change', async () => {
      const selectedId = aiProviderSelect.value;
      try {
        const response = await fetchJson('/api/ai-manager/active', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ providerId: selectedId }),
        });
        if (response.success) {
          aiManagerConfig = response.config;
          renderAiManager();
        }
      } catch (error) {
        // Best effort update.
      }
    });
  }
  if (aiSaveButton) {
    aiSaveButton.addEventListener('click', saveAiManagerConfig);
  }
  if (aiTestButton) {
    aiTestButton.addEventListener('click', testAiManagerProvider);
  }
  toggleAiApiKey?.addEventListener('click', () => {
    const showing = aiProviderApiKey.type === 'text';aiProviderApiKey.type = showing ? 'password' : 'text';toggleAiApiKey.textContent = showing ? 'Mostrar chave' : 'Ocultar chave';
  });
  copyAiApiKey?.addEventListener('click', () => {
    if (aiProviderApiKey.value) copyTextToClipboard(aiProviderApiKey.value);
    else aiManagerMessage.textContent = 'Digite a chave para copiá-la; a chave persistida permanece protegida.';
  });
  document.addEventListener('keydown', (event) => {
    if (event.altKey && event.key === '1') setActiveTab('dashboard');
    if (event.altKey && event.key === '2') setActiveTab('assistant');
    if (event.altKey && event.key === '3') setActiveTab('explorer');
    if (event.altKey && event.key === '4') setActiveTab('editor');
    if (event.altKey && event.key === '5') setActiveTab('chat');
  });
  exportProjectZip.addEventListener('click', async () => {
    zipPath.value = '.';
    await requestZipCreation('.', { autoDownload: true });
  });
  if (smartCleanupButton) {
    smartCleanupButton.addEventListener('click', runSmartCleanup);
  }
  cleanupIncludeBackups?.addEventListener('change', runSmartCleanup);
  confirmSmartCleanup?.addEventListener('click', applySmartCleanup);
  cancelSmartCleanup?.addEventListener('click', () => { cleanupPreviewPanel.hidden = true;currentCleanupPreview = null; });
  importZip.addEventListener('click', () => zipImportFile.click());
  zipImportFile.addEventListener('change', async () => {
    const file = zipImportFile.files?.[0];
    if (!file) return;
    setZipBusy(true, 'Importando arquivo ZIP...');
    const data = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(data);
    try {
      const sendImport = (confirmOverwrite = false) => fetchJson('/api/zip/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: file.name, data: base64, confirmOverwrite }),
      });
      let response = await sendImport(false);
      if (response.code === 'ZIP_OVERWRITE_CONFIRMATION_REQUIRED') {
        const sample = (response.conflicts || []).slice(0, 5).join('\n');
        const confirmed = window.confirm(`${response.error}\n\n${sample}${response.conflicts?.length > 5 ? '\n...' : ''}`);
        if (!confirmed) { zipResult.textContent = 'Importação cancelada; nenhum arquivo foi sobrescrito.';return; }
        response = await sendImport(true);
      }
      if (response.success) {
        zipResult.textContent = `Projeto importado com sucesso. ${response.entriesCount || 0} item(ns), ${response.overwritten || 0} sobrescrito(s).`;
        await loadProjectTree();
        listFolder('');
      } else {
        zipResult.textContent = response.error;
      }
    } catch (error) {
      zipResult.textContent = 'Não foi possível importar o ZIP.';
    } finally {
      setZipBusy(false);
      zipImportFile.value = null;
    }
  });
});
