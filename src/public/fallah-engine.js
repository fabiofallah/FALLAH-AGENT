/* FALLAH ENGINE — Interface JS
 * Integra HOME + painel de arbitragem com os endpoints já validados.
 * NÃO altera readers, normalizer, matching, pipeline ou motor de arbitragem.
 */
(function () {
  'use strict';

  // Garantir que o painel legado sempre inicia oculto (previne restauração de BFCache)
  const _legacyPanel = document.getElementById('fe-legacy-panel');
  if (_legacyPanel) _legacyPanel.hidden = true;

  // ── STATE ──────────────────────────────────────────────────────────────
  const state = {
    page: 'fe-home',
    opportunities: [],
    coverageAudit: null,
    seenIds: new Set(),
    houses: [],
    connectingHouses: new Set(),
    houseConnectionErrors: new Map(),
    connectAllRunning: false,
    filters: {
      type: 'all',      // 2 | 3 | all
      profitMin: 0.01,
      sports: new Set(),
      market: '',
      houses: new Set(),
      method: 'all',
    },
    sound: { muted: false, volume: 0.7, current: 'cash' },
    autoRefreshMs: 3000,
    autoTimer: null,
    autoActive: true,
    refreshInFlight: false,
    cycleSample: null,
    startedAt: Date.now(),
    capital: 100,
    collectionAudit: null,
    collectionFilters: {
      houseId: '',
      sport: '',
      competition: '',
      phase: 'all',
      price: 'all',
      liquidity: 'all',
      crossed: 'all',
      page: 1,
      pageSize: 100,
    },
    logsPanel: null,
    logsFilters: {
      house: 'ALL',
      level: 'ALL',
      type: 'ALL',
      period: 'REALTIME',
    },
  };

  const SETTINGS_KEY = 'fallah.engine.operator-settings.v2';
  function saveOperatorSettings() {
    const value = {
      filters: { ...state.filters, houses: [...state.filters.houses], sports: [...state.filters.sports], market: '', method: 'all' },
      sound: { ...state.sound },
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(value));
  }
  function loadOperatorSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
      if (!saved) return;
      state.filters = { ...state.filters, ...(saved.filters || {}), houses: new Set(saved.filters?.houses || []), sports: new Set(saved.filters?.sports || (saved.filters?.sport ? [saved.filters.sport] : [])), market: '', method: 'all' };
      state.sound = { ...state.sound, ...(saved.sound || {}) };
    } catch { localStorage.removeItem(SETTINGS_KEY); }
  }
  loadOperatorSettings();

  const SOUND_URLS = {
    cash: 'data:audio/wav;base64,' + generateTone(880, 0.14, 'square'),
    coin: 'data:audio/wav;base64,' + generateTone(1200, 0.08, 'sine'),
    bell: 'data:audio/wav;base64,' + generateTone(880, 0.18, 'triangle'),
  };

  // generate a minimal inline tone as base64-wav (no copyrighted assets)
  function generateTone(freq, dur, type) {
    const sampleRate = 22050, samples = Math.floor(sampleRate * dur);
    const buf = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buf);
    const writeStr = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
    writeStr(0, 'RIFF'); view.setUint32(4, 36 + samples * 2, true);
    writeStr(8, 'WAVE'); writeStr(12, 'fmt '); view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true);
    writeStr(36, 'data'); view.setUint32(40, samples * 2, true);
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate, env = Math.max(0, 1 - t / dur);
      let s = 0;
      if (type === 'square') s = Math.sin(2 * Math.PI * freq * t) > 0 ? 1 : -1;
      else if (type === 'triangle') s = (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * freq * t));
      else s = Math.sin(2 * Math.PI * freq * t);
      view.setInt16(44 + i * 2, Math.round(s * env * 16000), true);
    }
    const bytes = new Uint8Array(buf);
    let b64 = '';
    const chunkSz = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSz) b64 += btoa(String.fromCharCode(...bytes.subarray(i, i + chunkSz)));
    return b64;
  }

  // ── NAVIGATION ────────────────────────────────────────────────────────
  function navigate(pageId) {
    document.querySelectorAll('.fe-page').forEach((p) => p.classList.remove('active'));
    const target = document.getElementById(pageId);
    if (target) { target.classList.add('active'); state.page = pageId; }
  }

  // delegate nav buttons
  document.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-nav]');
    if (!nav) return;
    const target = nav.dataset.nav;
    // if it's a legacy tab, show legacy panel instead
    if (!target.startsWith('fe-')) {
      openLegacy(target);
    } else {
      navigate(target);
    }
  });

  // ── LEGACY PANEL ──────────────────────────────────────────────────────
  function openLegacy(tab) {
    const panel = document.getElementById('fe-legacy-panel');
    if (!panel) return;
    panel.hidden = false;
    // activate the correct legacy tab
    if (tab) {
      const btn = document.querySelector(`nav button[data-tab="${tab}"]`);
      if (btn) btn.click();
    }
  }

  const legacyToggleBtn = document.getElementById('fe-legacy-toggle');
  if (legacyToggleBtn) legacyToggleBtn.addEventListener('click', () => openLegacy('dashboard'));

  const legacyCloseBtn = document.getElementById('fe-legacy-close');
  if (legacyCloseBtn) legacyCloseBtn.addEventListener('click', () => {
    const panel = document.getElementById('fe-legacy-panel');
    if (panel) panel.hidden = true;
  });

  // secondary nav
  document.getElementById('fe-sec-diagnostico')?.addEventListener('click', () => openLegacy('live-audit-lab'));
  document.getElementById('fe-sec-backup')?.addEventListener('click', () => openLegacy('backup-manager'));
  document.getElementById('fe-sec-logs')?.addEventListener('click', () => openLegacy('logs-bets-exchanges'));
  document.getElementById('fe-coverage-details')?.addEventListener('click', () => openLegacy('live-audit-lab'));

  // ── CLOCK ─────────────────────────────────────────────────────────────
  function updateClock() {
    const now = new Date();
    const ts = now.toLocaleTimeString('pt-BR');
    const ds = now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' });
    const clockEl = document.getElementById('fe-clock-time');
    const dateEl = document.getElementById('fe-clock-date');
    const arbClock = document.getElementById('fe-arb-clock');
    if (clockEl) clockEl.textContent = ts;
    if (dateEl) dateEl.textContent = ds;
    if (arbClock) arbClock.textContent = ts;
    // uptime
    const elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
    const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
    const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    const uptimeEl = document.getElementById('fe-uptime');
    if (uptimeEl) uptimeEl.textContent = `${h}:${m}:${s}`;
  }
  setInterval(updateClock, 1000);
  updateClock();

  // ── PIPELINE STATUS ────────────────────────────────────────────────────
  async function loadPipelineStatus() {
    try {
      const res = await fetch('/api/pipeline/status');
      const json = await res.json();
      if (!json.success) return;
      const pipeline = json.pipeline || {};
      const readers = pipeline.readers || [];

      // houses
      const houseMap = new Map();
      for (const r of readers) {
        if (!r.houseId) continue;
        const key = r.houseId;
        if (!houseMap.has(key)) {
          const runtimeStatus = String(r.runtime?.status || '').toLowerCase();
          const runtimeAlive = ['connected', 'degraded', 'running', 'reconnecting', 'starting', 'waiting'].includes(runtimeStatus);
          const hasCollectionProof = Boolean(r.runtime?.firstSuccessfulRequestAt || r.runtime?.lastCaptureAt || r.runtime?.lastSuccessAt);
          houseMap.set(key, {
            id: r.houseId,
            name: r.houseName || r.houseId,
            active: Boolean(r.active),
            online: runtimeAlive && r.runtime?.heartbeatHealthy !== false && hasCollectionProof,
            cycles: r.runtime?.cycles || 0,
          });
        }
      }
      let configuredHouses = [];
      try {
        const houseRes = await fetch('/api/discovery/houses');
        const houseJson = await houseRes.json();
        if (houseJson.success) configuredHouses = houseJson.houses || [];
      } catch (_) {}
      // PATCH 114.2: discovery registry is the single UI authority.
      // Deleted or disabled houses can never be resurrected by stale readers.
      const activeConfigured = configuredHouses.filter((h) => h && h.active !== false && !h.blocked);
      const activeIds = new Set(activeConfigured.map((h) => String(h.id)));
      for (const configured of activeConfigured) {
        const current = houseMap.get(configured.id);
        if (current) { current.active = true; current.name = configured.name || current.name; }
        else houseMap.set(configured.id, { id: configured.id, name: configured.name || configured.id, active: true, online: false, cycles: 0 });
      }
      state.houses = [...houseMap.values()].filter((h) => activeIds.has(String(h.id)));

      // init selected houses
      if (state.filters.houses.size === 0) {
        for (const h of state.houses) state.filters.houses.add(h.id);
      }

      renderHousePills();
      renderHouseFilters();

      const onlineCount = state.houses.filter((h) => h.online).length;
      const countEl = document.getElementById('fe-houses-count');
      if (countEl) countEl.textContent = onlineCount;
      const offlineCountEl = document.getElementById('fe-houses-offline-count');
      if (offlineCountEl) offlineCountEl.textContent = Math.max(0, state.houses.length - onlineCount);

      const statusDot = document.getElementById('fe-status-dot');
      const statusLabel = document.getElementById('fe-system-status');
      const statusLabelText = document.getElementById('fe-status-label');
      if (onlineCount > 0) {
        statusDot?.classList.remove('offline');
        statusLabel?.classList.remove('offline');
        statusLabel?.classList.add('online');
        if (statusLabelText) statusLabelText.textContent = 'SISTEMA ONLINE';
        document.getElementById('fe-system-online')?.classList.add('online-active');
        document.getElementById('fe-system-offline')?.classList.remove('offline-active');
      } else {
        statusDot?.classList.add('offline');
        statusLabel?.classList.remove('online');
        statusLabel?.classList.add('offline');
        if (statusLabelText) statusLabelText.textContent = 'SISTEMA OFFLINE';
        document.getElementById('fe-system-online')?.classList.remove('online-active');
        document.getElementById('fe-system-offline')?.classList.add('offline-active');
      }

      const enginesEl = document.getElementById('fe-engines-active');
      if (enginesEl) enginesEl.textContent = `${onlineCount} / ${state.houses.length}`;

      // Real completed-cycle rate observed between status samples.
      const lpsEl = document.getElementById('fe-lps');
      if (lpsEl) {
        const now = Date.now();
        const cycles = readers.reduce((sum, reader) => sum + Number(reader.runtime?.cycles || 0), 0);
        const previous = state.cycleSample;
        const elapsedSeconds = previous ? (now - previous.at) / 1000 : 0;
        const completed = previous ? Math.max(0, cycles - previous.cycles) : 0;
        lpsEl.textContent = elapsedSeconds > 0 ? (completed / elapsedSeconds).toFixed(3) : '0.000';
        state.cycleSample = { at: now, cycles };
      }
    } catch {
      // ignore
    }
  }

  async function loadOfflineHouseStatus() {
    try {
      const res = await fetch('/api/discovery/houses');
      const json = await res.json();
      if (!json.success) return;
      state.houses = (json.houses || []).map((house) => ({
        id: house.id,
        name: house.name || house.id,
        active: Boolean(house.active),
        online: false,
        cycles: 0,
      }));
      if (state.filters.houses.size === 0) for (const house of state.houses) state.filters.houses.add(house.id);
      renderHousePills();
      renderHouseFilters();
      const countEl = document.getElementById('fe-houses-count');
      if (countEl) countEl.textContent = '0';
      const offlineCountEl = document.getElementById('fe-houses-offline-count');
      if (offlineCountEl) offlineCountEl.textContent = String(state.houses.length);
      const statusLabelText = document.getElementById('fe-status-label');
      const statusLabel = document.getElementById('fe-system-status');
      document.getElementById('fe-status-dot')?.classList.add('offline');
      statusLabel?.classList.remove('online');
      statusLabel?.classList.add('offline');
      if (statusLabelText) statusLabelText.textContent = 'SISTEMA OFFLINE';
      document.getElementById('fe-system-online')?.classList.remove('online-active');
      document.getElementById('fe-system-offline')?.classList.add('offline-active');
      const enginesEl = document.getElementById('fe-engines-active');
      if (enginesEl) enginesEl.textContent = `0 / ${state.houses.length}`;
      const lpsEl = document.getElementById('fe-lps');
      if (lpsEl) lpsEl.textContent = '0.000';
    } catch {
      // Keep the administrative UI available even if the registry is unavailable.
    }
  }

  async function loadCoverageAudit() {
    try {
      const res = await fetch('/api/pipeline/coverage/audit');
      const json = await res.json();
      if (!json?.success || !json?.audit) return;
      state.coverageAudit = json.audit;
      renderCoverageAudit();
    } catch {
      // ignore
    }
  }

  async function loadCollectionAudit() {
    try {
      if (!state.collectionFilters.houseId && state.houses.length > 0) {
        state.collectionFilters.houseId = state.houses[0].id;
      }

      const query = new URLSearchParams({
        houseId: String(state.collectionFilters.houseId || ''),
        sport: String(state.collectionFilters.sport || ''),
        competition: String(state.collectionFilters.competition || ''),
        page: String(state.collectionFilters.page || 1),
        pageSize: String(state.collectionFilters.pageSize || 100),
      });

      const res = await fetch(`/api/pipeline/audit/panel?${query.toString()}`);
      const json = await res.json();
      if (!json?.success || !json?.panel) return;

      state.collectionAudit = json.panel;
      renderCollectionAudit();
    } catch {
      // ignore
    }
  }

  async function loadLogsPanel() {
    try {
      const params = new URLSearchParams({
        house: String(state.logsFilters.house || 'ALL'),
        level: String(state.logsFilters.level || 'ALL'),
        type: String(state.logsFilters.type || 'ALL'),
        period: String(state.logsFilters.period || 'REALTIME'),
      });
      const res = await fetch(`/api/pipeline/logs/panel?${params.toString()}`);
      const json = await res.json();
      if (!json?.success || !json?.logs) return;
      state.logsPanel = json.logs;
      renderLogsPanel();
    } catch {
      // ignore
    }
  }

  function renderLogsPanel() {
    const panel = state.logsPanel;
    const houseSelect = document.getElementById('lbe-house');
    const summaryEl = document.getElementById('lbe-summary');
    const sourceEl = document.getElementById('lbe-source-profile');
    const crossingEl = document.getElementById('lbe-crossing');
    const timelineEl = document.getElementById('lbe-timeline');
    const entriesEl = document.getElementById('lbe-entries');
    const outputEl = document.getElementById('lbe-output');
    if (!summaryEl || !timelineEl || !entriesEl) return;

    if (!panel) {
      summaryEl.textContent = 'Sem dados de logs no momento.';
      if (sourceEl) sourceEl.textContent = 'Sem análise de origem disponível.';
      if (crossingEl) crossingEl.textContent = 'Sem dados de cruzamento disponíveis.';
      timelineEl.textContent = 'Sem timeline disponível.';
      entriesEl.textContent = 'Sem entradas.';
      const avgUpdateEl = document.getElementById('fe-avg-update');
      if (avgUpdateEl) avgUpdateEl.textContent = 'Aguardando dados';
      return;
    }

    if (houseSelect) {
      const houses = Array.isArray(panel.houses) ? panel.houses : [];
      houseSelect.innerHTML = ['<option value="ALL">Todas as casas</option>', ...houses.map((h) => `<option value="${escAttr(h)}">${escHtml(h)}</option>`)].join('');
      houseSelect.value = state.logsFilters.house || 'ALL';
    }

    const summaryRows = (panel.summary || []).map((row) => {
      const lastCollection = row.lastCollectionAt ? new Date(row.lastCollectionAt).toLocaleTimeString('pt-BR') : '-';
      const lastFresh = row.lastFreshAt ? new Date(row.lastFreshAt).toLocaleTimeString('pt-BR') : '-';
      const avgFresh = Number.isFinite(Number(row.avgFreshIntervalMs)) && Number(row.avgFreshIntervalMs) > 0
        ? formatIntervalMs(Number(row.avgFreshIntervalMs))
        : '-';
      return `<div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,.08)"><strong>${escHtml(row.house)}</strong> | ${escHtml(row.status)} | Última coleta: ${lastCollection} | Última odd: ${lastFresh} | Média fresh: ${escHtml(avgFresh)} | Erros: ${Number(row.errors || 0)} | Timeouts: ${Number(row.timeouts || 0)} | 429: ${Number(row.rate429 || 0)}</div>`;
    }).join('');
    summaryEl.innerHTML = summaryRows || 'Sem resumo de saúde.';

    if (sourceEl) {
      const profiles = Array.isArray(panel.sourceProfiles) ? panel.sourceProfiles : [];
      sourceEl.innerHTML = profiles.map((row) => {
        const symbol = row.symbol || '?';
        const group = row.group ? ` ${row.group}` : '';
        const confidence = Number.isFinite(Number(row.confidence)) ? `${Number(row.confidence)}%` : 'N/D';
        const peers = Array.isArray(row.correlatedWith) && row.correlatedWith.length ? row.correlatedWith.join(', ') : '-';
        const sportInfo = row.bySportMeasured ? `Por esporte: ${escHtml(String(row.bySportSummary || 'medido'))}` : 'Por esporte: ainda não medido; sem bloqueio automático por modalidade';
        return `<div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08)"><strong>${escHtml(symbol)} ${escHtml(row.house)}${escHtml(group)}</strong> — ${escHtml(row.label || 'Indeterminada')} · confiança ${escHtml(confidence)}<br><small>Correlacionadas: ${escHtml(peers)} · ${sportInfo}</small></div>`;
      }).join('') || 'Sem classificação de origem. Execute Inteligência de Fontes para obter evidência.';
    }

    if (crossingEl) {
      const rows = Array.isArray(panel.crossingSummary) ? panel.crossingSummary : [];
      crossingEl.innerHTML = rows.map((row) => `<div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.08)"><strong>${escHtml(row.house)}</strong> · matching: ${Number(row.matching || 0)} · arbitragem: ${Number(row.arbitrage || 0)} · rejeições: ${Number(row.rejected || 0)}<br><small>${escHtml(row.note || 'Sem evidência suficiente no período selecionado.')}</small></div>`).join('') || 'Sem evidência de cruzamentos no período selecionado.';
    }

    const timelineRows = (panel.timeline || []).slice(-200).reverse().map((item) => {
      const ts = item.timestamp ? new Date(item.timestamp).toLocaleString('pt-BR') : '-';
      return `<div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,.08)">[${escHtml(ts)}] [${escHtml(item.house)}] [${escHtml(item.status)}] ${escHtml(item.message || '')}</div>`;
    }).join('');
    timelineEl.innerHTML = timelineRows || 'Sem eventos de timeline.';

    const entryRows = (panel.entries || []).slice(0, 500).map((entry) => {
      const ts = entry.timestamp ? new Date(entry.timestamp).toLocaleString('pt-BR') : '-';
      return `<div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,.08)">[${escHtml(ts)}] [${escHtml(entry.house)}] [${escHtml(entry.level)}] [${escHtml(entry.component)}] ${escHtml(entry.message || '')}</div>`;
    }).join('');
    entriesEl.innerHTML = entryRows || 'Sem linhas para os filtros atuais.';

    if (outputEl) {
      outputEl.textContent = `Entradas filtradas: ${Number(panel.totalEntries || 0)}\nRotação: ${Number(panel.rotationBytes || 0)} bytes\nAtualizado em: ${new Date(panel.generatedAt || Date.now()).toLocaleString('pt-BR')}`;
    }

    const avgUpdateEl = document.getElementById('fe-avg-update');
    if (avgUpdateEl) {
      const averageMs = Number(panel.averageFreshUpdateMs || 0);
      if (Number.isFinite(averageMs) && averageMs > 0) avgUpdateEl.textContent = formatIntervalMs(averageMs);
      else avgUpdateEl.textContent = 'Aguardando dados';
    }
  }

  function formatIntervalMs(ms) {
    const seconds = Math.max(1, Math.round(Number(ms || 0) / 1000));
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remain = seconds % 60;
    return remain ? `${minutes}m ${remain}s` : `${minutes}m`;
  }

  function renderCoverageAudit() {
    const grid = document.getElementById('fe-coverage-grid');
    const stamp = document.getElementById('fe-coverage-stamp');
    const card = document.getElementById('fe-coverage-card');
    if (!grid) return;

    const audit = state.coverageAudit;
    if (!audit?.houses) {
      grid.innerHTML = '<div class="fe-coverage-empty">Cobertura indisponível no momento.</div>';
      return;
    }

    const houses = Object.entries(audit.houses);
    if (houses.length === 0) {
      grid.innerHTML = '<div class="fe-coverage-empty">Nenhuma casa encontrada na auditoria.</div>';
      return;
    }

    const rows = houses.map(([houseName, house]) => {
      const valid = Number(house.eventosValidos || 0);
      const markets = Number(house.mercados || 0);
      const selections = Number(house.selecoes || 0);
      const odds = Number(house.oddsValidas || 0);
      const live = Number(house.live || 0);
      const prematch = Number(house.prematch || 0);
      const received = house.eventosRecebidos === 'TOTAL_DA_FONTE_NAO_DETERMINAVEL'
        ? 'N/D'
        : Number(house.eventosRecebidos || 0);
      const back = Number(house.backValidos || 0);
      const lay = Number(house.layValidos || 0);
      const updatedAt = String(house?.freshness?.lastOperationalUpdate || '');
      const ageMs = Number(house?.freshness?.operationalAgeMs || 0);
      const ageSec = Number.isFinite(ageMs) ? Math.max(0, Math.floor(ageMs / 1000)) : null;
      const ageText = ageSec === null ? '-' : (ageSec < 60 ? `${ageSec}s` : `${Math.floor(ageSec / 60)}m`);
      const updatedText = updatedAt ? new Date(updatedAt).toLocaleTimeString('pt-BR') : '-';
      const collectionStatus = house?.paginacao?.coletaParcialDetectada
        ? 'PARCIAL'
        : (house.eventosRecebidos === 'TOTAL_DA_FONTE_NAO_DETERMINAVEL' ? 'NAO_DETERMINAVEL' : 'COMPLETA');

      let status = 'OFFLINE';
      let statusClass = 'red';
      if (house.readerActive && house.dadoFresco) {
        status = 'FRESCO';
        statusClass = 'green';
      } else if (house.readerActive) {
        status = 'PARCIAL';
        statusClass = 'yellow';
      }

      return `<div class="fe-coverage-row">
        <div class="name">${escHtml(houseName)}</div>
        <div class="status ${statusClass}">${status}</div>
        <div>Up: ${updatedText}</div>
        <div>Age: ${ageText}</div>
        <div>Ev: ${received}/${valid}</div>
        <div>Mkt: ${markets}</div>
        <div>Sel: ${selections}</div>
        <div>Odds: ${odds}</div>
        <div>B/L: ${back}/${lay}</div>
        <div>L/P: ${live}/${prematch}</div>
        <div>Col: ${collectionStatus}</div>
      </div>`;
    }).join('');

    grid.innerHTML = rows;
    renderCoverageSportReport(card, audit);
    const eligibilityCounts = audit?.arbitrageHouseEligibility?.counts || {};
    const summary = document.getElementById('fe-diagnostic-summary');
    if (summary) {
      summary.textContent = `${Number(eligibilityCounts.ELIGIBLE || 0)} ELIGIBLE | ${Number(eligibilityCounts.CONDITIONAL || 0)} CONDITIONAL | ${Number(eligibilityCounts.BLOCKED || 0)} BLOCKED`;
    }
    if (stamp) {
      const ts = audit.generatedAt ? new Date(audit.generatedAt) : new Date();
      const totalValid = Number(audit?.totals?.totalEventosValidos || 0);
      stamp.textContent = `Atualizado ${ts.toLocaleTimeString('pt-BR')} · Eventos válidos: ${totalValid}`;
    }
  }

  function renderCoverageSportReport(card, audit) {
    if (!card) return;
    const rows = Array.isArray(audit?.relatorioPorEsporte6Casas)
      ? audit.relatorioPorEsporte6Casas
      : [];

    let container = document.getElementById('fe-coverage-sport');
    if (!container) {
      container = document.createElement('section');
      container.id = 'fe-coverage-sport';
      container.className = 'fe-coverage-sport';
      card.appendChild(container);
    }

    if (rows.length === 0) {
      container.innerHTML = '<h4>RELATORIO POR ESPORTE (6 CASAS)</h4><div class="fe-coverage-empty">Sem dados por esporte no momento.</div>';
      return;
    }

    const top = rows
      .filter((row) => Number(row.eventos || 0) > 0 || Number(row.mercados || 0) > 0)
      .sort((a, b) => Number(b.mercados || 0) - Number(a.mercados || 0))
      .slice(0, 24);

    const html = top.map((row) => {
      const casa = escHtml(String(row.casa || 'N/A'));
      const esporte = escHtml(String(row.esporte || 'UNKNOWN'));
      const eventos = Number(row.eventos || 0);
      const mercados = Number(row.mercados || 0);
      const selecoes = Number(row.selecoes || 0);
      const back = Number(row.backUtilizaveis || 0);
      const lay = Number(row.layUtilizaveis || 0);
      const sem = Number(row.semLiquidez || 0);
      return `<div class="fe-coverage-sport-row">
        <div>
          <div class="house">${casa}</div>
          <div class="sport">${esporte}</div>
        </div>
        <div>E:${eventos} M:${mercados} Sel:${selecoes} B:${back} L:${lay} SemLiq:${sem}</div>
      </div>`;
    }).join('');

    container.innerHTML = `<h4>RELATORIO POR ESPORTE (6 CASAS)</h4><div class="fe-coverage-sport-grid">${html}</div>`;
  }

  function escAttr(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function toNum(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function ensureCollectionPanel() {
    const card = document.getElementById('fe-coverage-card');
    if (!card) return null;

    let panel = document.getElementById('fe-collection-panel');
    if (!panel) {
      panel = document.createElement('section');
      panel.id = 'fe-collection-panel';
      panel.className = 'fe-collection-panel';
      panel.innerHTML = `
        <div class="fe-collection-head">
          <h4>EVENTOS COLETADOS (AUDITORIA)</h4>
          <button class="fe-btn-ghost-sm" id="fe-collection-refresh">ATUALIZAR EVENTOS</button>
        </div>
        <div class="fe-collection-filters">
          <select id="fe-col-house" class="fe-select"></select>
          <select id="fe-col-sport" class="fe-select"></select>
          <select id="fe-col-competition" class="fe-select"></select>
          <select id="fe-col-phase" class="fe-select">
            <option value="all">Live + Prematch</option>
            <option value="live">Somente Live</option>
            <option value="prematch">Somente Prematch</option>
          </select>
          <select id="fe-col-price" class="fe-select">
            <option value="all">Com e sem preço</option>
            <option value="with">Com preço</option>
            <option value="without">Sem preço</option>
          </select>
          <select id="fe-col-liquidity" class="fe-select">
            <option value="all">Com e sem liquidez</option>
            <option value="with">Com liquidez</option>
            <option value="without">Sem liquidez</option>
          </select>
          <select id="fe-col-crossed" class="fe-select">
            <option value="all">Cruzado + não cruzado</option>
            <option value="yes">Cruzado</option>
            <option value="no">Não cruzado</option>
          </select>
        </div>
        <div class="fe-collection-meta" id="fe-collection-meta">Carregando auditoria de eventos...</div>
        <div class="fe-collection-table" id="fe-collection-table"></div>
        <div class="fe-collection-pagination">
          <button class="fe-btn-ghost-sm" id="fe-col-prev">ANTERIOR</button>
          <span id="fe-col-page-label">Página 1</span>
          <button class="fe-btn-ghost-sm" id="fe-col-next">PRÓXIMA</button>
        </div>
      `;
      card.appendChild(panel);
    }

    if (!panel.dataset.bound) {
      panel.dataset.bound = '1';

      panel.querySelector('#fe-collection-refresh')?.addEventListener('click', async () => {
        await loadCollectionAudit();
      });

      panel.querySelector('#fe-col-house')?.addEventListener('change', async (e) => {
        state.collectionFilters.houseId = String(e.target.value || '');
        state.collectionFilters.page = 1;
        await loadCollectionAudit();
      });

      panel.querySelector('#fe-col-sport')?.addEventListener('change', async (e) => {
        state.collectionFilters.sport = String(e.target.value || '');
        state.collectionFilters.page = 1;
        await loadCollectionAudit();
      });

      panel.querySelector('#fe-col-competition')?.addEventListener('change', async (e) => {
        state.collectionFilters.competition = String(e.target.value || '');
        state.collectionFilters.page = 1;
        await loadCollectionAudit();
      });

      panel.querySelector('#fe-col-phase')?.addEventListener('change', (e) => {
        state.collectionFilters.phase = String(e.target.value || 'all');
        renderCollectionAudit();
      });

      panel.querySelector('#fe-col-price')?.addEventListener('change', (e) => {
        state.collectionFilters.price = String(e.target.value || 'all');
        renderCollectionAudit();
      });

      panel.querySelector('#fe-col-liquidity')?.addEventListener('change', (e) => {
        state.collectionFilters.liquidity = String(e.target.value || 'all');
        renderCollectionAudit();
      });

      panel.querySelector('#fe-col-crossed')?.addEventListener('change', (e) => {
        state.collectionFilters.crossed = String(e.target.value || 'all');
        renderCollectionAudit();
      });

      panel.querySelector('#fe-col-prev')?.addEventListener('click', async () => {
        if (state.collectionFilters.page <= 1) return;
        state.collectionFilters.page -= 1;
        await loadCollectionAudit();
      });

      panel.querySelector('#fe-col-next')?.addEventListener('click', async () => {
        const totalPages = Math.max(1, Math.ceil(toNum(state.collectionAudit?.selected?.events?.total) / toNum(state.collectionFilters.pageSize)));
        if (state.collectionFilters.page >= totalPages) return;
        state.collectionFilters.page += 1;
        await loadCollectionAudit();
      });
    }

    return panel;
  }

  function renderCollectionAudit() {
    const panel = ensureCollectionPanel();
    if (!panel) return;

    const houseSel = panel.querySelector('#fe-col-house');
    const sportSel = panel.querySelector('#fe-col-sport');
    const compSel = panel.querySelector('#fe-col-competition');
    const phaseSel = panel.querySelector('#fe-col-phase');
    const priceSel = panel.querySelector('#fe-col-price');
    const liqSel = panel.querySelector('#fe-col-liquidity');
    const crossedSel = panel.querySelector('#fe-col-crossed');
    const metaEl = panel.querySelector('#fe-collection-meta');
    const tableEl = panel.querySelector('#fe-collection-table');
    const pageLabel = panel.querySelector('#fe-col-page-label');
    const prevBtn = panel.querySelector('#fe-col-prev');
    const nextBtn = panel.querySelector('#fe-col-next');

    if (!state.collectionAudit?.selected) {
      if (metaEl) metaEl.textContent = 'Auditoria de eventos indisponível para a casa selecionada.';
      if (tableEl) tableEl.innerHTML = '<div class="fe-coverage-empty">Sem eventos para exibir no momento.</div>';
      return;
    }

    const houses = Array.isArray(state.collectionAudit.houses) ? state.collectionAudit.houses : [];
    const selected = state.collectionAudit.selected || {};
    const options = selected.options || {};
    const eventsPayload = selected.events || {};
    const auditBreakdown = selected.auditBreakdown || {};
    const rawItems = Array.isArray(eventsPayload.items) ? eventsPayload.items : [];

    if (houseSel) {
      houseSel.innerHTML = houses.map((h) => `<option value="${escAttr(h.houseId)}">${escHtml(h.house || h.houseId)}</option>`).join('');
      if (!state.collectionFilters.houseId && houses[0]) state.collectionFilters.houseId = houses[0].houseId;
      houseSel.value = state.collectionFilters.houseId;
    }

    if (sportSel) {
      const sports = Array.isArray(options.sports) ? options.sports : [];
      sportSel.innerHTML = `<option value="">Todos os esportes</option>${sports.map((s) => `<option value="${escAttr(s)}">${escHtml(s)}</option>`).join('')}`;
      sportSel.value = state.collectionFilters.sport || '';
    }

    if (compSel) {
      const competitions = Array.isArray(options.competitions) ? options.competitions : [];
      compSel.innerHTML = `<option value="">Todas as competições</option>${competitions.map((c) => `<option value="${escAttr(c)}">${escHtml(c)}</option>`).join('')}`;
      compSel.value = state.collectionFilters.competition || '';
    }

    if (phaseSel) phaseSel.value = state.collectionFilters.phase;
    if (priceSel) priceSel.value = state.collectionFilters.price;
    if (liqSel) liqSel.value = state.collectionFilters.liquidity;
    if (crossedSel) crossedSel.value = state.collectionFilters.crossed;

    const filteredItems = rawItems.filter((item) => {
      if (state.collectionFilters.phase === 'live' && !item.inPlay) return false;
      if (state.collectionFilters.phase === 'prematch' && item.inPlay) return false;

      const hasPrice = toNum(item.runnerUsablePriceCount) > 0;
      if (state.collectionFilters.price === 'with' && !hasPrice) return false;
      if (state.collectionFilters.price === 'without' && hasPrice) return false;

      const hasLiquidity = toNum(item.runnerLiquidityCount) > 0;
      if (state.collectionFilters.liquidity === 'with' && !hasLiquidity) return false;
      if (state.collectionFilters.liquidity === 'without' && hasLiquidity) return false;

      const crossed = Boolean(item.crossedStatus);
      if (state.collectionFilters.crossed === 'yes' && !crossed) return false;
      if (state.collectionFilters.crossed === 'no' && crossed) return false;

      return true;
    });

    const totalEvents = toNum(eventsPayload.total);
    const totalPages = Math.max(1, Math.ceil(totalEvents / toNum(state.collectionFilters.pageSize)));
    const page = Math.max(1, toNum(eventsPayload.page) || state.collectionFilters.page);
    state.collectionFilters.page = page;

    if (metaEl) {
      metaEl.textContent = `Source: ${toNum(auditBreakdown.sourceEvents)} · Raw: ${toNum(auditBreakdown.rawRecords)} · Persistidos: ${toNum(auditBreakdown.persistedRecords)} · Válidos: ${toNum(auditBreakdown.validEvents)} · Current: ${toNum(auditBreakdown.currentEvents)} · Stale: ${toNum(auditBreakdown.staleEvents)} · Visíveis: ${totalEvents} · Página: ${rawItems.length} · Filtrados: ${filteredItems.length} · ${page}/${totalPages}`;
    }

    if (pageLabel) pageLabel.textContent = `Página ${page} de ${totalPages}`;
    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = page >= totalPages;

    if (filteredItems.length === 0) {
      if (tableEl) tableEl.innerHTML = '<div class="fe-coverage-empty">Nenhum evento atende os filtros atuais.</div>';
      return;
    }

    const rows = filteredItems.map((row) => {
      const inPlay = row.inPlay ? 'LIVE' : 'PRE';
      const crossed = row.crossedStatus ? 'SIM' : 'NAO';
      const updated = row.lastUpdatedAt ? new Date(row.lastUpdatedAt).toLocaleTimeString('pt-BR') : '-';
      return `<div class="fe-col-row">
        <div class="house">${escHtml(row.house || '-')}</div>
        <div>${escHtml(row.sport || '-')}</div>
        <div>${escHtml(row.competition || '-')}</div>
        <div class="event" title="${escAttr(row.eventName || '-')}">${escHtml(row.eventName || '-')}</div>
        <div>${inPlay}</div>
        <div>M:${toNum(row.marketCount)}</div>
        <div>R:${toNum(row.runnerCount)}</div>
        <div>P:${toNum(row.runnerUsablePriceCount)}</div>
        <div>L:${toNum(row.runnerLiquidityCount)}</div>
        <div>SemLiq:${toNum(row.runnerNoLiquidityCount)}</div>
        <div>Cruz:${crossed}</div>
        <div>Up:${updated}</div>
      </div>`;
    }).join('');

    if (tableEl) {
      tableEl.innerHTML = `<div class="fe-col-head">
        <div>CASA</div>
        <div>ESPORTE</div>
        <div>COMPETICAO</div>
        <div>EVENTO</div>
        <div>FASE</div>
        <div>MERCADOS</div>
        <div>RUNNERS</div>
        <div>COM PRECO</div>
        <div>COM LIQ.</div>
        <div>SEM LIQ.</div>
        <div>CRUZADO</div>
        <div>ATUALIZ.</div>
      </div>${rows}`;
    }
  }

  const HOUSE_CONNECT_TIMEOUT_MS = 60000;

  async function fetchWithTimeout(url, options = {}, timeoutMs = HOUSE_CONNECT_TIMEOUT_MS + 5000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try { return await fetch(url, { ...options, signal: controller.signal }); }
    finally { clearTimeout(timer); }
  }

  async function waitForHouseOnline(id, timeoutMs = HOUSE_CONNECT_TIMEOUT_MS) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      await loadPipelineStatus();
      const house = state.houses.find((h) => h.id === id);
      if (house?.online) return { online: true, elapsedMs: Date.now() - started };
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return { online: false, elapsedMs: Date.now() - started };
  }

  async function setHouseActive(id, active, button, { waitForProof = false } = {}) {
    if (button) button.disabled = true;
    const houseBefore = state.houses.find((h) => h.id === id);
    if (active) state.connectingHouses.add(id); else state.connectingHouses.delete(id);
    state.houseConnectionErrors.delete(id);
    renderHousePills();
    try {
      const res = await fetchWithTimeout(`/api/discovery/houses/${encodeURIComponent(id)}/active`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Falha ao alterar casa.');
      const house = state.houses.find((h) => h.id === id);
      if (house) { house.active = active; if (!active) house.online = false; }
      if (!active) {
        state.connectingHouses.delete(id);
        renderHousePills();
        return { online: false, disabled: true };
      }
      if (waitForProof) {
        const proof = await waitForHouseOnline(id);
        state.connectingHouses.delete(id);
        if (!proof.online) {
          const name = houseBefore?.name || house?.name || id;
          const reason = `TIMEOUT: ${name} não comprovou coleta válida em ${Math.round(HOUSE_CONNECT_TIMEOUT_MS/1000)}s`;
          state.houseConnectionErrors.set(id, reason);
          // PATCH 75: timeout de prova NÃO desabilita a casa.
          // Ela permanece habilitada para continuar tentando/reconectar no runtime
          // e para ser restaurada automaticamente após reinício do aplicativo.
          const current = state.houses.find((h) => h.id === id);
          if (current) { current.active = true; current.online = false; }
        }
        renderHousePills();
        return proof;
      }
      setTimeout(loadPipelineStatus, 500);
      setTimeout(() => { state.connectingHouses.delete(id); loadPipelineStatus(); }, HOUSE_CONNECT_TIMEOUT_MS);
      return { online: false, pending: true };
    } catch (error) {
      state.connectingHouses.delete(id);
      state.houseConnectionErrors.set(id, String(error?.message || error));
      renderHousePills();
      if (!waitForProof) window.alert(`Não foi possível ${active ? 'ligar' : 'desligar'} a casa: ${error.message}`);
      return { online: false, error: String(error?.message || error) };
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function setAllHousesActive(active) {
    if (state.connectAllRunning) return;
    state.connectAllRunning = true;
    const globalButtons = [...document.querySelectorAll('#fe-houses-on-all, #fe-houses-off-all')];
    globalButtons.forEach((b) => { b.disabled = true; });
    try {
      if (!active) {
        for (const house of [...state.houses]) await setHouseActive(house.id, false, null, { waitForProof:false });
        return;
      }
      // PATCH 100: retry only houses that are actually offline at the beginning of this action.
      // The progress counter now represents the retry batch, not the position in all 15 houses.
      // This prevents misleading states such as "CONECTANDO 4/15" while 14 are already online.
      const pending = state.houses.filter((house) => !house.online);
      for (let index = 0; index < pending.length; index += 1) {
        const house = pending[index];
        const latest = state.houses.find((item) => item.id === house.id);
        if (latest?.online) continue;
        const onBtn = document.getElementById('fe-houses-on-all');
        if (onBtn) onBtn.textContent = `RECONECTANDO ${index + 1}/${pending.length}`;
        await setHouseActive(house.id, true, null, { waitForProof:true });
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
    } finally {
      state.connectAllRunning = false;
      const onBtn = document.getElementById('fe-houses-on-all');
      if (onBtn) onBtn.textContent = 'LIGAR TODAS';
      globalButtons.forEach((b) => { b.disabled = false; });
      await loadPipelineStatus();
    }
  }

  function renderHousePills() {
    const onlineEl = document.getElementById('fe-houses-pills-online');
    const offlineEl = document.getElementById('fe-houses-pills-offline');
    const arbBar = document.getElementById('fe-arb-houses-bar');
    if (!onlineEl || !offlineEl) return;

    const onlineHouses = state.houses.filter((h) => h.online);
    const offlineHouses = state.houses.filter((h) => !h.online);
    const controlHtml = (houses, emptyText) => houses.map((h) => {
      const isConnecting = state.connectingHouses.has(h.id);
      const hasError = state.houseConnectionErrors.has(h.id);
      const visualState = h.online ? 'online' : (isConnecting ? 'connecting' : 'offline');
      const stateLabel = h.online ? 'ONLINE' : (isConnecting ? 'CONECTANDO / AGUARDANDO COLETA' : (hasError ? `OFFLINE — ${state.houseConnectionErrors.get(h.id)}` : 'OFFLINE'));
      return `<div class="fe-house-control"><span class="fe-house-control-name" title="${escAttr(h.name)}">${escHtml(h.name)}</span><span class="fe-house-dot ${visualState}" aria-label="${escAttr(h.name)}: ${stateLabel}" title="${stateLabel}"></span><button type="button" class="fe-house-mini-switch ${h.active ? 'is-on' : 'is-off'}" data-house-toggle="${escAttr(h.id)}" data-next-active="${h.active ? 'false' : 'true'}" title="${h.active ? 'Desligar' : 'Ligar'} ${escAttr(h.name)}">${h.active ? 'OFF' : 'ON'}</button></div>`;
    }).join('') || `<div class="fe-coverage-empty">${emptyText}</div>`;

    onlineEl.innerHTML = controlHtml(onlineHouses, 'Nenhuma casa online.');
    offlineEl.innerHTML = controlHtml(offlineHouses, 'Nenhuma casa offline.');
    onlineEl.classList.toggle('fe-houses-overflow', onlineHouses.length > 24);
    offlineEl.classList.toggle('fe-houses-overflow', offlineHouses.length > 24);

    const onlineGroupCount = document.getElementById('fe-houses-online-group-count');
    const offlineGroupCount = document.getElementById('fe-houses-offline-group-count');
    if (onlineGroupCount) onlineGroupCount.textContent = onlineHouses.length;
    if (offlineGroupCount) offlineGroupCount.textContent = offlineHouses.length;

    const arbHtml = state.houses.map((h) => `<span class="fe-house-pill ${h.online ? 'online' : ''}"><span>${escHtml(h.name)}</span> <span>${h.online ? '●' : '○'}</span></span>`).join('');
    if (arbBar) arbBar.innerHTML = arbHtml;

    document.querySelectorAll('#fe-houses-pills-online [data-house-toggle], #fe-houses-pills-offline [data-house-toggle]').forEach((btn) => btn.addEventListener('click', (event) => {
      event.stopPropagation();
      setHouseActive(btn.dataset.houseToggle, btn.dataset.nextActive === 'true', btn);
    }));
    const totalEl = document.getElementById('fe-houses-total');
    if (totalEl) totalEl.textContent = state.houses.length;
  }

  document.getElementById('fe-houses-on-all')?.addEventListener('click', () => setAllHousesActive(true));
  document.getElementById('fe-houses-off-all')?.addEventListener('click', () => setAllHousesActive(false));


  function renderHouseFilters() {
    const listEl = document.getElementById('fe-filter-houses-list');
    if (!listEl) return;
    listEl.innerHTML = state.houses.map((h) =>
      `<label class="fe-house-filter-row">
        <input type="checkbox" data-house="${h.id}" ${state.filters.houses.has(h.id) ? 'checked' : ''} />
        <span>${h.name}</span>
        <span class="fe-house-pill ${h.online ? 'online' : ''}" style="margin-left:auto">${h.online ? '●' : '○'}</span>
      </label>`
    ).join('');
    listEl.querySelectorAll('input[data-house]').forEach((cb) => {
      cb.addEventListener('change', (e) => {
        const id = e.target.dataset.house;
        if (e.target.checked) state.filters.houses.add(id);
        else state.filters.houses.delete(id);
        applyFiltersAndRender();
      });
    });
  }

  // ── ENGINE STATUS + OPPORTUNITIES ─────────────────────────────────────
  async function loadEngineStatus() {
    try {
      const res = await fetch('/api/arbitrage-engine/status');
      const json = await res.json();
      if (!json.success) return;
      const engine = json.engine || {};
      state.engineStatus = engine;
      // PATCH 132: grade operacional = verdade do ciclo atual. Nunca renderizar
      // REVALIDATION_PENDING/SOURCE_INVALIDATED nem lucro abaixo do minimo ativo.
      const configuredMinProfit = Number(engine.config?.minimumProfitPercent ?? state.filters?.minProfit ?? 0);
      const opps = (engine.opportunities || []).filter((op) =>
        String(op.lifecycleStatus || op.status || '').toUpperCase() === 'EXECUTABLE' &&
        op.mathematicallyVerified !== false &&
        Number(op.arbitragePercent ?? op.netMarginPercent ?? -Infinity) >= configuredMinProfit
      );
      const newOnes = [];

      for (const op of opps) {
        if (!state.seenIds.has(op.id)) {
          state.seenIds.add(op.id);
          newOnes.push(op);
        }
      }

      state.opportunities = opps;
      if (!state.__sportsRendered) { renderSportFilters(); state.__sportsRendered = true; }

      if (newOnes.length > 0) playAlert();

      const lastUpdateEl = document.getElementById('fe-arb-last-update');
      if (lastUpdateEl) { const ts = Date.parse(engine.stats?.lastEvaluationAt || ''); lastUpdateEl.textContent = Number.isFinite(ts) ? new Date(ts).toLocaleTimeString('pt-BR') : '--:--:--'; }

      const proof = {
        'fe-proof-events': engine.stats?.EVENTS_COLLECTED,
        'fe-proof-common': engine.stats?.EVENTS_IN_2_PLUS_HOUSES,
        'fe-proof-markets': engine.stats?.MARKETS_MATCHED,
        'fe-proof-quotes': engine.stats?.QUOTES_CURRENT,
        'fe-proof-combos': engine.stats?.COMBINATIONS_GENERATED,
        'fe-proof-bb': engine.stats?.BACK_BACK_CALCULATED,
        'fe-proof-bl': engine.stats?.BACK_LAY_CALCULATED,
        'fe-proof-nway': engine.stats?.N_WAY_CALCULATED,
        'fe-proof-math': engine.stats?.MATHEMATICAL_ARBITRAGES,
        'fe-proof-exec': engine.stats?.EXECUTABLE_ARBITRAGES,
        'fe-proof-rej-temporal': engine.stats?.REJECTED_BY_TEMPORAL,
        'fe-proof-rej-market': engine.stats?.REJECTED_BY_MARKET,
        'fe-proof-rej-runner': engine.stats?.REJECTED_BY_RUNNER,
        'fe-proof-rej-math': engine.stats?.REJECTED_BY_MATHEMATICS,
      };
      Object.entries(proof).forEach(([id, value]) => { const el = document.getElementById(id); if (el) el.textContent = Number(value || 0).toLocaleString('pt-BR'); });

      const marketsEl = document.getElementById('fe-arb-markets');
      if (marketsEl) {
        const stats = engine.stats || {};
        // QUOTES_CURRENT = fresh records currently passing validation (true "monitored markets")
        marketsEl.textContent = stats.CURRENT_UNIQUE_MARKETS !== undefined ? Number(stats.CURRENT_UNIQUE_MARKETS).toLocaleString('pt-BR') : (stats.MARKETS_MATCHED !== undefined ? Number(stats.MARKETS_MATCHED).toLocaleString('pt-BR') : '0');
      }

      applyFiltersAndRender();
    } catch {
      // ignore
    }
  }

  function applyFiltersAndRender() {
    let opps = state.opportunities.slice();
    const now = Date.now();

    const homeCountEl = document.getElementById('fe-arb-count');
    if (homeCountEl) homeCountEl.textContent = state.opportunities.length;

    // filter by house
    if (state.filters.houses.size > 0 && state.filters.houses.size < state.houses.length) {
      opps = opps.filter((op) =>
        (op.legs || []).some((leg) => state.filters.houses.has(String(leg.houseId)))
      );
    }

    // filter by type (2 / 3 houses)
    if (state.filters.type !== 'all') {
      const count = Number(state.filters.type);
      opps = opps.filter((op) => new Set((op.legs || []).map((l) => l.houseId)).size === count);
    }

    // filter profit
    opps = opps.filter((op) => Number(op.arbitragePercent || 0) >= state.filters.profitMin);


    // PATCH 100: operator may select multiple sports. Market and calculation method are always ALL.
    if (state.filters.sports.size > 0 && !state.filters.sports.has('__NONE__')) {
      const alias = (v) => { const x=String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); const m={automobilismo:'motorsport','formula 1':'motorsport',motorsport:'motorsport',futebol:'football',football:'football',soccer:'football',tenis:'tennis',tennis:'tennis',basquete:'basketball',basketball:'basketball',beisebol:'baseball',baseball:'baseball','futebol americano':'american_football','american football':'american_football','hoquei no gelo':'ice_hockey','ice hockey':'ice_hockey',criquete:'cricket',cricket:'cricket',ciclismo:'cycling',cycling:'cycling',boxe:'boxing',boxing:'boxing',golfe:'golf',golf:'golf',dardos:'darts',darts:'darts',mma:'mma','rugby league':'rugby_league','rugby union':'rugby_union'}; return m[x]||x.replace(/\s+/g,'_'); };
      const selected = new Set([...state.filters.sports].map(alias));
      const total=JSON.parse(document.getElementById('fe-filter-sports-list')?.dataset.sports || '[]').length;
      if (state.filters.sports.size < total) opps = opps.filter((op) => selected.has(alias(op.sport)));
    } else if (state.filters.sports.has('__NONE__')) opps=[];

    // sort by profit desc
    opps.sort((a, b) => Number(b.arbitragePercent || 0) - Number(a.arbitragePercent || 0));

    // update home counter
    renderOpportunities(opps);
  }

  function renderOpportunities(opps) {
    const listEl = document.getElementById('fe-arb-list');
    if (!listEl) return;

    const countEl = document.getElementById('fe-arb-opp-count');
    const bestEl = document.getElementById('fe-arb-best-profit');
    const avgEl = document.getElementById('fe-arb-avg-profit');
    const badgeEl = document.getElementById('fe-arb-badge');
    const topBadgeEl = document.getElementById('fe-alerts-badge');

    if (countEl) countEl.textContent = opps.length;
    if (opps.length > 0) {
      const profits = opps.map((o) => Number(o.arbitragePercent || 0));
      if (bestEl) bestEl.textContent = Math.max(...profits).toFixed(2) + '%';
      if (avgEl) avgEl.textContent = (profits.reduce((a, b) => a + b, 0) / profits.length).toFixed(2) + '%';
      if (badgeEl) { badgeEl.textContent = opps.length; badgeEl.hidden = false; }
      if (topBadgeEl) { topBadgeEl.textContent = opps.length; topBadgeEl.hidden = false; }
    } else {
      if (bestEl) bestEl.textContent = '0%';
      if (avgEl) avgEl.textContent = '0%';
      if (badgeEl) badgeEl.hidden = true;
      if (topBadgeEl) topBadgeEl.hidden = true;
    }

    const renderSignature = opps.map((o) => `${o.id}:${Number(o.arbitragePercent||0).toFixed(4)}:${(o.legs||[]).map(l=>`${l.houseId}:${l.type}:${Number(l.odd||0).toFixed(4)}`).join(',')}`).join('|');
    if (state.__lastOpportunityRenderSignature === renderSignature && listEl.dataset.renderedOnce === '1') return;
    state.__lastOpportunityRenderSignature = renderSignature;
    listEl.dataset.renderedOnce = '1';

    if (opps.length === 0) {
      listEl.innerHTML = `<div class="fe-arb-empty" id="fe-arb-empty">
        <i class="ri-search-eye-line"></i>
        <p>NENHUMA ARBITRAGEM DISPONÍVEL NO MOMENTO</p>
        <small>Monitorando dados reais em tempo real...</small>
      </div>`;
      return;
    }

    const rows = opps.map((op) => {
      const profit = Number(op.arbitragePercent || 0).toFixed(2);
      const houses = [...new Set((op.legs || []).map((l) => l.houseId))];
      const houseCount = houses.size || houses.length;
      const eventName = humanEventName(op);
      const market = humanMarketName(op.market);
      const status = String(op.lifecycleStatus || op.status || 'UNKNOWN').toUpperCase();
      const age = op.detectedAt ? Math.floor((Date.now() - Date.parse(op.detectedAt)) / 1000) : null;
      const ageStr = age !== null ? (age < 60 ? `${age}s atrás` : `${Math.floor(age / 60)}m atrás`) : '-';
      const netMoney = op.netProfit != null ? `R$ ${Number(op.netProfit).toFixed(2)}` : '';
      const selectionsHtml = (op.legs || []).map((leg) => `<div class="fe-opp-selection-line">${escHtml(humanSelection(leg.selection || '-'))}</div>`).join('');
      const eventTime = humanDateTime(op.event?.startTime);

      const housesHtml = (op.legs || []).map((leg) => {
        const hName = getHouseName(leg.houseId);
        const side = String(leg.type || '').toUpperCase();
        const sideClass = side === 'LAY' ? 'fe-opp-side-lay' : 'fe-opp-side-back';
        return `<div class="fe-opp-house-line">
          <span class="fe-opp-house-name">${escHtml(hName)}</span>
          <span class="${sideClass}">${side}</span>
        </div>`;
      }).join('');

      const oddsHtml = (op.legs || []).map((leg) => `<span>${Number(leg.odd || 0).toFixed(2)}</span>`).join('');

      // PATCH 129: ABRIR always opens the audit/calculator panel. Each leg inside
      // that panel has its own source/deep-link button, so the operator can verify
      // the exact market at every house instead of being sent to only one leg.
      const openBtn = `<button class="fe-opp-open" onclick="feOpenCalc('${escHtml(op.id)}')">ABRIR <i class='ri-calculator-line'></i></button>`;

      return `<div class="fe-arb-row" style="content-visibility:auto;contain-intrinsic-size:90px" onclick="feOpenCalc('${escHtml(op.id)}')" data-opp-id="${escHtml(op.id)}">
        <div><div class="fe-opp-profit">${profit}%</div><div class="fe-opp-profit-money">${netMoney}</div><div class="fe-opp-profit-houses">${houseCount} CASAS</div></div>
        <div class="fe-opp-event">
          <span class="fe-opp-event-name">${escHtml(eventName)}</span>
          <span class="fe-opp-event-comp">${escHtml(humanSport(op.sport || ''))}</span>
          <span class="fe-opp-event-time">${escHtml(eventTime)}</span>
          <span class="fe-opp-event-comp">${escHtml(status)}</span>
        </div>
        <div class="fe-opp-market">${escHtml(market)}</div>
        <div class="fe-opp-sel">${selectionsHtml}</div>
        <div class="fe-opp-houses">${housesHtml}</div>
        <div class="fe-opp-odds">${oddsHtml}</div>
        <div class="fe-opp-profit-cell">${profit}%</div>
        <div class="fe-opp-age">${ageStr}</div>
        <div onclick="event.stopPropagation()">${openBtn}</div>
      </div>`;
    }).join('');

    listEl.innerHTML = rows;
  }

  function getHouseName(houseId) {
    const h = state.houses.find((x) => x.id === String(houseId || ''));
    return h ? h.name : String(houseId || '').substring(0, 8);
  }

  function humanSport(value) {
    const key = String(value || '').toLowerCase();
    if (key.includes('football') || key.includes('futebol') || key === 'soccer') return 'Futebol';
    if (key.includes('tennis') || key.includes('tenis')) return 'Tênis';
    if (key.includes('basket')) return 'Basquete';
    return value || '-';
  }

  function humanSelection(value) {
    const raw = String(value || '');
    if (raw.startsWith('participant:')) return raw.replace(/^participant:/, '').trim();
    if (raw.startsWith('over:')) return `Mais de ${raw.replace('over:', '')}`;
    if (raw.startsWith('under:')) return `Menos de ${raw.replace('under:', '')}`;
    if (raw.startsWith('htft:')) return `Intervalo/Final ${raw.replace('htft:', '').replace('_', ' / ')}`;
    return raw;
  }

  function humanMarketName(market) {
    const type = String(market?.type || market?.canonicalMarketType || '').toUpperCase();
    const period = String(market?.period || '').toUpperCase();
    const line = market?.line !== undefined && market?.line !== null ? String(market.line).replace('.', ',') : null;
    const periodLabel = period === 'FIRST_HALF' ? '1º Tempo (HT)' : period === 'SECOND_HALF' ? '2º Tempo' : 'Jogo Completo (FT)';
    if (type === 'OVER_UNDER') return `Mais/Menos ${line || '-'} gols — ${periodLabel}`;
    if (type === 'MATCH_ODDS' || type === 'WINNER') return `Resultado da Partida — ${periodLabel}`;
    if (type === 'HALF_TIME_FULL_TIME') return 'Intervalo/Final';
    return `${type || 'Mercado'} — ${periodLabel}`;
  }

  function humanEventName(op) {
    const participants = Array.isArray(op?.event?.participants) ? op.event.participants : [];
    if (participants.length === 2) return `${participants[0]} x ${participants[1]}`;
    return String(op?.event?.key || '').replace(/\|/g, ' x ');
  }

  function humanDateTime(value) {
    const ts = Date.parse(value || '');
    if (!Number.isFinite(ts)) return '-';
    const d = new Date(ts);
    const date = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const time = d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
    return `${date} às ${time}`;
  }

  // PATCH 132: tentativa explicita de abertura da URL real capturada.
  // Mantem href real no DOM para auditoria. Se o shell Electron bloquear popups,
  // a URL e copiada para a area de transferencia como fallback visivel, sem congelar a UI.
  window.feOpenSourceLink = function(event, anchor) {
    event?.preventDefault();
    const url = String(anchor?.dataset?.sourceUrl || anchor?.href || '').trim();
    if (!/^https?:\/\//i.test(url)) return false;
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
      return false;
    } catch (_) {
      try { if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url); } catch (_) {}
      return false;
    }
  };

  function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── CALCULATOR ─────────────────────────────────────────────────────────
  window.feOpenCalc = function (oppId) {
    const op = state.opportunities.find((o) => o.id === oppId);
    if (!op) return;
    renderCalc(op);
    document.getElementById('fe-calc-modal').hidden = false;
  };

  window.feCloseCalc = function () { const modal = document.getElementById('fe-calc-modal'); if (modal) modal.hidden = true; };
  document.addEventListener('click', (event) => {
    if (event.target?.closest?.('#fe-calc-close')) { event.preventDefault(); event.stopPropagation(); window.feCloseCalc(); }
    if (event.target?.id === 'fe-calc-modal') window.feCloseCalc();
  });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') window.feCloseCalc(); });

  function renderCalc(op) {
    const body = document.getElementById('fe-calc-body');
    if (!body) return;
    const eventName = humanEventName(op);
    const market = humanMarketName(op.market);
    const bankroll = state.capital;
    const detectedAt = humanDateTime(op.detectedAt);

    const calcLegs = (op.legs || []).map((leg) => {
      const rate = Number(leg.commissionRate || 0);
      const odd = Number(leg.odd || 0);
      const effectiveOdd = 1 + ((odd - 1) * (1 - rate / 100));
      return { ...leg, effectiveOdd, odd, rate };
    });

    let legsWithStake = [];
    let grossProfit = 0;
    let netProfit = 0;
    let totalComm = 0;
    let capitalUsed = 0;

    if (String(op.type || '').toUpperCase() === 'BACK_LAY') {
      const back = calcLegs.find((l) => String(l.type || '').toLowerCase() === 'back');
      const lay = calcLegs.find((l) => String(l.type || '').toLowerCase() === 'lay');
      if (back && lay && lay.odd > 1) {
        const ratio = back.effectiveOdd / (lay.odd - (lay.rate / 100));
        const backStake = bankroll / (1 + ratio * (lay.odd - 1));
        const layStake = backStake * ratio;
        const liability = layStake * (lay.odd - 1);
        const winProfit = backStake * (back.odd - 1) * (1 - back.rate / 100) - liability;
        const loseProfit = layStake * (1 - lay.rate / 100) - backStake;
        grossProfit = Math.min(backStake * (back.odd - 1) - liability, layStake - backStake);
        netProfit = Math.min(winProfit, loseProfit);
        capitalUsed = backStake + liability;
        totalComm = (backStake * Math.max(0, back.odd - 1) * (back.rate / 100)) + (layStake * (lay.rate / 100));
        legsWithStake = calcLegs.map((leg) => {
          if (String(leg.type || '').toLowerCase() === 'back') return { ...leg, stake: backStake, liability: 0 };
          return { ...leg, stake: layStake, liability };
        });
      }
    } else {
      const implied = calcLegs.reduce((sum, l) => sum + (l.effectiveOdd > 0 ? 1 / l.effectiveOdd : 0), 0);
      legsWithStake = calcLegs.map((l) => ({
        ...l,
        stake: implied > 0 ? bankroll * ((1 / l.effectiveOdd) / implied) : 0,
      }));
      const payout = implied > 0 ? bankroll / implied : 0;
      grossProfit = Number(op.grossProfit || (payout - bankroll));
      netProfit = Number(op.netProfit || grossProfit);
      totalComm = legsWithStake.reduce((s, l) => s + (l.stake * Math.max(0, l.odd - 1) * (l.rate / 100)), 0);
      capitalUsed = legsWithStake.reduce((s, l) => s + Number(l.stake || 0), 0);
    }

    const profitPct = capitalUsed > 0 ? ((netProfit / capitalUsed) * 100).toFixed(2) : '0.00';
    const expired = op.legs?.some((l) => !Number.isFinite(Number(l.odd)) || Number(l.odd) <= 1);

    const legsHtml = legsWithStake.map((leg) => {
      const hName = getHouseName(leg.houseId);
      const side = String(leg.type || '').toUpperCase();
      const liability = side === 'LAY' ? Number(leg.liability || (leg.stake * (leg.odd - 1))).toFixed(2) : '-';
      const isApiSource = /(^|\/)api(\/|\.|$)|-api\./i.test(String(leg.url || ''));
      const sourceLinkLabel = (['deepLink','marketUrl','derivedMarketUrl','discoveredUrl'].includes(String(leg.urlType || '')) ? 'ABRIR MERCADO' : (String(leg.urlType || '') === 'eventUrl' ? 'ABRIR EVENTO' : 'ABRIR CASA'));
      const publicLink = leg.url && !isApiSource
        ? `<a class="fe-opp-open" href="${escHtml(leg.url)}" target="_blank" rel="noopener noreferrer" data-source-url="${escHtml(leg.url)}" onclick="return feOpenSourceLink(event, this)" title="${escHtml(leg.url)}" style="display:inline-flex;align-items:center;gap:6px;">${sourceLinkLabel} <i class='ri-external-link-line'></i></a>`
        : `<span style="font-size:10px;color:var(--fe-text3)">LINK PÚBLICO NÃO RECEBIDO DO READER</span>`;
      // PATCH 136: API provenance stays internal/logged. Operator only sees the
      // public event/market action because that is what is useful for rapid validation.
      const linkButton = `<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">${publicLink}</div>`;
      return `<div class="fe-calc-leg">
        <div><div class="fe-calc-leg-label">CASA</div><div class="fe-calc-leg-val">${escHtml(hName)}</div><div class="fe-calc-leg-label">MERCADO</div><div class="fe-calc-leg-val">${escHtml(humanSelection(leg.selection || '-'))}</div></div>
        <div><div class="fe-calc-leg-label">LADO</div><div class="fe-calc-leg-val">${side}</div><div class="fe-calc-leg-label">ODD</div><div class="fe-calc-leg-val">${Number(leg.odd).toFixed(2)}</div></div>
        <div><div class="fe-calc-leg-label">STAKE</div><div class="fe-calc-leg-val">R$ ${Number(leg.stake || 0).toFixed(2)}</div><div class="fe-calc-leg-label">RESPONSABILIDADE</div><div class="fe-calc-leg-val">${liability === '-' ? '-' : 'R$ ' + liability}</div></div>
        <div><div class="fe-calc-leg-label">COMISSÃO</div><div class="fe-calc-leg-val">${Number(leg.rate).toFixed(2)}%</div><div class="fe-calc-leg-label">ODD EFETIVA</div><div class="fe-calc-leg-val">${Number(leg.effectiveOdd).toFixed(4)}</div></div>
        <div style="grid-column:1 / -1;display:flex;justify-content:flex-end;">${linkButton}</div>
      </div>`;
    }).join('');

    body.innerHTML = `
      ${expired ? '<div class="fe-calc-expired"><i class="ri-alert-line"></i> OPORTUNIDADE EXPIRADA — ODDS ALTERADAS</div>' : ''}
      <div class="fe-calc-event-info">
        <strong>${escHtml(eventName)}</strong><br>
        ${escHtml(humanSport(op.sport || ''))} · ${escHtml(market)}<br>
        Detectado: ${escHtml(detectedAt)}
      </div>
      <div class="fe-calc-capital-row">
        <label>CAPITAL TOTAL (R$)</label>
        <input type="number" id="fe-calc-capital" min="0.01" step="0.01" value="${bankroll}" />
        <button style="background:var(--fe-accent);color:#111;border:none;border-radius:6px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer" onclick="feRecalc('${escHtml(op.id)}')">RECALCULAR</button>
      </div>
      <div class="fe-calc-legs">${legsHtml}</div>
      <div class="fe-calc-summary">
        <div class="fe-calc-sum-item"><div class="fe-calc-sum-label">CAPITAL UTILIZADO</div><div class="fe-calc-sum-val">R$ ${Number(capitalUsed || 0).toFixed(2)}</div></div>
        <div class="fe-calc-sum-item"><div class="fe-calc-sum-label">LUCRO BRUTO</div><div class="fe-calc-sum-val green">R$ ${grossProfit.toFixed(2)}</div></div>
        <div class="fe-calc-sum-item"><div class="fe-calc-sum-label">COMISSÕES</div><div class="fe-calc-sum-val red">-R$ ${totalComm.toFixed(2)}</div></div>
        <div class="fe-calc-sum-item"><div class="fe-calc-sum-label">LUCRO LÍQUIDO</div><div class="fe-calc-sum-val ${netProfit >= 0 ? 'green' : 'red'}">R$ ${netProfit.toFixed(2)} (${profitPct}%)</div></div>
      </div>
      <div class="fe-calc-actions">
        <button style="background:none;border:1px solid var(--fe-border);color:var(--fe-text3);border-radius:6px;padding:8px 16px;font-size:12px;cursor:pointer" onclick="feCloseCalc()">FECHAR</button>
        <button style="background:var(--fe-bg3);border:1px solid var(--fe-border);color:var(--fe-text2);border-radius:6px;padding:8px 16px;font-size:12px;cursor:pointer;margin-left:auto" disabled title="Execução financeira real bloqueada nesta versão"><i class="ri-lock-line"></i> EXECUTAR — BLOQUEADO (SEGURANÇA)</button>
      </div>
    `;
  }

  window.feRecalc = function (oppId) {
    const capInput = document.getElementById('fe-calc-capital');
    if (capInput) state.capital = Math.max(0.01, Number(capInput.value) || 0.01);
    const op = state.opportunities.find((o) => o.id === oppId);
    if (op) renderCalc(op);
  };

  // ── SOUND ─────────────────────────────────────────────────────────────
  async function playAlert() {
    if (state.sound.muted) return;
    const key = state.sound.current;
    if (key === 'custom') { const src=localStorage.getItem('fallah.customSound'); if(src){ const a=new Audio(src); a.volume=state.sound.volume; await a.play(); return; } }
    const frequencies = { cash: 880, coin: 1200, bell: 660 };
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') await ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = key === 'cash' ? 'square' : key === 'bell' ? 'triangle' : 'sine';
        osc.frequency.value = frequencies[key] || 880;
        gain.gain.setValueAtTime(Math.max(0.001, state.sound.volume * 0.22), ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 0.22);
        osc.onended = () => ctx.close().catch(() => {});
        return;
      }
      const dataUrl = SOUND_URLS[key] || SOUND_URLS.cash;
      const audio = new Audio(dataUrl); audio.volume = state.sound.volume;
      await audio.play();
    } catch { /* sound failure must never affect the engine */ }
  }

  document.getElementById('fe-sound-mute')?.addEventListener('change', (e) => {
    state.sound.muted = e.target.checked;
  });

  document.getElementById('fe-sound-volume')?.addEventListener('input', (e) => {
    state.sound.volume = Number(e.target.value) / 100;
    const valEl = document.getElementById('fe-sound-volume-val');
    if (valEl) valEl.textContent = e.target.value + '%';
  });

  document.getElementById('fe-sound-select')?.addEventListener('change', (e) => {
    state.sound.current = e.target.value;
    const nameEl = document.getElementById('fe-arb-sound-name');
    if (nameEl) nameEl.textContent = e.target.options[e.target.selectedIndex]?.text || '';
  });

  document.getElementById('fe-sound-test')?.addEventListener('click', async (e) => {
    const button = e.currentTarget;
    const was = state.sound.muted;
    state.sound.muted = false;
    try {
      await playAlert();
      if (button) button.title = 'Som testado';
    } catch (error) {
      window.alert('Não foi possível reproduzir o som: ' + (error?.message || error));
    } finally {
      state.sound.muted = was;
    }
  });


  document.getElementById('fe-save-sound')?.addEventListener('click', (e) => { saveOperatorSettings(); flashButton(e.currentTarget,'✓ SOM SALVO'); });
  document.getElementById('fe-sound-add')?.addEventListener('change', (e) => {
    const file=e.target.files?.[0]; if(!file) return; if(file.size>1500000){ window.alert('Use um áudio de até 1,5 MB.'); return; }
    const reader=new FileReader(); reader.onload=()=>{ localStorage.setItem('fallah.customSound', String(reader.result)); localStorage.setItem('fallah.customSoundName', file.name); const sel=document.getElementById('fe-sound-select'); if(sel){ let o=sel.querySelector('option[value=custom]'); if(!o){o=document.createElement('option');o.value='custom';sel.appendChild(o);} o.textContent='Personalizado — '+file.name; sel.value='custom'; state.sound.current='custom'; } saveOperatorSettings(); }; reader.readAsDataURL(file);
  });

  document.getElementById('fe-sound-remove')?.addEventListener('click', (e) => {
    localStorage.removeItem('fallah.customSound');
    localStorage.removeItem('fallah.customSoundName');
    const sel = document.getElementById('fe-sound-select');
    sel?.querySelector('option[value=custom]')?.remove();
    state.sound.current = 'cash';
    if (sel) sel.value = 'cash';
    saveOperatorSettings();
    flashButton(e.currentTarget, '✓ REMOVIDO');
  });

  document.getElementById('fe-arb-sound-btn')?.addEventListener('click', () => {
    const cb = document.getElementById('fe-sound-mute');
    if (cb) { cb.checked = !cb.checked; state.sound.muted = cb.checked; }
  });

  // ── FILTERS WIRING ────────────────────────────────────────────────────
  document.querySelectorAll('#fe-arb-type-filter .fe-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#fe-arb-type-filter .fe-pill').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.filters.type = btn.dataset.value;
      applyFiltersAndRender();
    });
  });

  document.getElementById('fe-filter-profit-min')?.addEventListener('input', (e) => {
    state.filters.profitMin = Number(e.target.value);
    const valEl = document.getElementById('fe-filter-profit-min-val');
    if (valEl) valEl.textContent = Number(e.target.value).toFixed(2) + ' %';
    const input = document.getElementById('fe-filter-profit-min-input');
    if (input) input.value = Number(e.target.value).toFixed(2);
    applyFiltersAndRender();
  });

  document.getElementById('fe-filter-profit-min-input')?.addEventListener('input', (e) => {
    const value = Math.max(0, Number(e.target.value || 0));
    state.filters.profitMin = value;
    const slider = document.getElementById('fe-filter-profit-min');
    if (slider) slider.value = String(Math.min(5, value));
    const label = document.getElementById('fe-filter-profit-min-val');
    if (label) label.textContent = value.toFixed(2) + ' %';
    applyFiltersAndRender();
  });

  document.getElementById('fe-save-settings')?.addEventListener('click', () => {
    saveOperatorSettings();
    const button = document.getElementById('fe-save-settings');
    if (button) { const old = button.textContent; button.textContent = 'CONFIGURAÇÕES SALVAS'; setTimeout(() => { button.textContent = old; }, 1500); }
  });

  const profitSlider = document.getElementById('fe-filter-profit-min');
  const profitInput = document.getElementById('fe-filter-profit-min-input');
  const profitLabel = document.getElementById('fe-filter-profit-min-val');
  if (profitSlider) profitSlider.value = String(Math.min(5, state.filters.profitMin));
  if (profitInput) profitInput.value = Number(state.filters.profitMin).toFixed(2);
  if (profitLabel) profitLabel.textContent = Number(state.filters.profitMin).toFixed(2) + ' %';


  document.getElementById('fe-save-profit')?.addEventListener('click', (e) => { saveOperatorSettings(); flashButton(e.currentTarget,'✓ LUCRO SALVO'); });


  const DEFAULT_SPORTS = ['🏎️ AUTOMOBILISMO','🏀 BASQUETE','⚾ BEISEBOL','🥊 BOXE','🚴 CICLISMO','🏏 CRÍQUETE','🎯 DARDOS','⚽ FUTEBOL','🏈 FUTEBOL AMERICANO','⛳ GOLFE','🏒 HÓQUEI NO GELO','🥊 MMA','🏉 RUGBY LEAGUE','🏉 RUGBY UNION','🎾 TÊNIS'];
  function sportValue(label) { return String(label || '').replace(/^\S+\s+/, '').trim(); }
  function renderSportFilters() {
    const list = document.getElementById('fe-filter-sports-list');
    if (!list) return;
    // PATCH 123: lista oficial fechada. Fontes nunca podem injetar categorias,
    // aliases em inglês, cassino, virtuais ou esportes fora do escopo na UI.
    const sports = DEFAULT_SPORTS.slice();
    const official = new Set(sports.map(sportValue));
    if (state.filters.sports.has('__NONE__')) state.filters.sports = new Set(['__NONE__']);
    else if (state.filters.sports.size === 0) state.filters.sports = new Set(official);
    else {
      const cleaned = new Set([...state.filters.sports].filter((sport) => official.has(sport)));
      state.filters.sports = cleaned.size ? cleaned : new Set(official);
    }
    list.dataset.sports = JSON.stringify(sports.map(sportValue));
    list.innerHTML = sports.map((label) => { const sport=sportValue(label); return `<label class="fe-house-filter-row"><input type="checkbox" data-sport="${escAttr(sport)}" ${state.filters.sports.has(sport) ? 'checked' : ''}/><span>${escHtml(label)}</span></label>`; }).join('');
    list.querySelectorAll('input[data-sport]').forEach((cb) => cb.addEventListener('change', (e) => {
      const sport = e.target.dataset.sport;
      if (e.target.checked) state.filters.sports.add(sport); else state.filters.sports.delete(sport);
      applyFiltersAndRender();
    }));
  }
  document.getElementById('fe-sports-all')?.addEventListener('click', () => {
    const list=document.getElementById('fe-filter-sports-list'); const sports=JSON.parse(list?.dataset.sports || '[]');
    state.filters.sports=new Set(sports); renderSportFilters(); applyFiltersAndRender();
  });
  document.getElementById('fe-sports-none')?.addEventListener('click', () => { state.filters.sports = new Set(['__NONE__']); renderSportFilters(); applyFiltersAndRender(); });
  document.getElementById('fe-save-sports')?.addEventListener('click', (e) => { saveOperatorSettings(); flashButton(e.currentTarget,'✓ ESPORTES SALVOS'); });
  renderSportFilters();

  document.getElementById('fe-houses-all')?.addEventListener('click', () => {
    state.filters.houses = new Set(state.houses.map((h) => h.id));
    renderHouseFilters();
    applyFiltersAndRender();
  });

  document.getElementById('fe-houses-none')?.addEventListener('click', () => {
    state.filters.houses.clear();
    renderHouseFilters();
    applyFiltersAndRender();
  });
  document.getElementById('fe-save-houses')?.addEventListener('click', (e) => { saveOperatorSettings(); flashButton(e.currentTarget,'✓ CASAS SALVAS'); });

  document.getElementById('fe-filter-clear')?.addEventListener('click', () => {
    state.filters.type = 'all';
    state.filters.profitMin = 0;
    state.filters.sports = new Set(JSON.parse(document.getElementById('fe-filter-sports-list')?.dataset.sports || '[]'));
    state.filters.market = '';
    state.filters.method = 'all';
    state.filters.houses = new Set(state.houses.map((h) => h.id));
    document.getElementById('fe-filter-profit-min').value = 0;
    document.getElementById('fe-filter-profit-min-val').textContent = '0.00 %';
    renderSportFilters();
    document.querySelectorAll('#fe-arb-type-filter .fe-pill').forEach((b) => b.classList.remove('active'));
    document.querySelector('#fe-arb-type-filter .fe-pill[data-value="all"]')?.classList.add('active');
    renderHouseFilters();
    applyFiltersAndRender();
  });

  document.getElementById('lbe-house')?.addEventListener('change', (e) => {
    state.logsFilters.house = String(e.target.value || 'ALL');
    loadLogsPanel();
  });
  document.getElementById('lbe-level')?.addEventListener('change', (e) => {
    state.logsFilters.level = String(e.target.value || 'ALL');
    loadLogsPanel();
  });
  document.getElementById('lbe-type')?.addEventListener('change', (e) => {
    state.logsFilters.type = String(e.target.value || 'ALL');
    loadLogsPanel();
  });
  document.getElementById('lbe-period')?.addEventListener('change', (e) => {
    state.logsFilters.period = String(e.target.value || 'REALTIME');
    loadLogsPanel();
  });
  function flashButton(button, text) {
    if (!button) return;
    const original = button.textContent;
    button.textContent = text;
    setTimeout(() => { button.textContent = original; }, 1800);
  }
  document.getElementById('lbe-refresh')?.addEventListener('click', async (event) => {
    await loadLogsPanel();
    flashButton(event.currentTarget, '✓ Atualizado');
  });
  document.getElementById('lbe-copy')?.addEventListener('click', async () => {
    const params = new URLSearchParams(state.logsFilters);
    const res = await fetch(`/api/pipeline/logs/copy-diagnostic?${params.toString()}`);
    const json = await res.json();
    if (!json?.success || !json?.diagnostic?.text) return;
    const text = String(json.diagnostic.text || '');
    await navigator.clipboard.writeText(text);
    const outputEl = document.getElementById('lbe-output');
    if (outputEl) outputEl.textContent = text;
    flashButton(document.getElementById('lbe-copy'), '✓ Copiado');
  });
  document.getElementById('lbe-export')?.addEventListener('click', (event) => {
    const params = new URLSearchParams(state.logsFilters);
    window.location.href = `/api/pipeline/logs/export-diagnostic?${params.toString()}`;
    event.currentTarget.textContent = 'Salvando...';
  });
  window.addEventListener('fallah-diagnostic-saved', (event) => {
    flashButton(document.getElementById('lbe-export'), '✓ Salvo');
    const outputEl = document.getElementById('lbe-output');
    if (outputEl) outputEl.textContent = `Diagnóstico salvo em:\n${String(event.detail || '')}`;
  });

  // ── AUTO REFRESH ──────────────────────────────────────────────────────
  // PATCH 123: auditorias pesadas em cadência separada para manter a UI responsiva.
  let slowAuditTimer = null;
  function startSlowAudits() {
    if (slowAuditTimer) clearInterval(slowAuditTimer);
    slowAuditTimer = setInterval(() => {
      if (!state.autoActive || state.refreshInFlight) return;
      Promise.allSettled([loadCoverageAudit(), loadCollectionAudit(), loadLogsPanel()]);
    }, 30000);
  }

  function startAutoRefresh() {
    if (state.autoTimer) clearInterval(state.autoTimer);
    state.autoTimer = setInterval(async () => {
      if (!state.autoActive || state.refreshInFlight) return;
      state.refreshInFlight = true;
      const lbl = document.getElementById('fe-arb-auto-label');
      const btn = document.getElementById('fe-arb-auto-btn');
      try {
        pulseRefreshIcon();
        // PATCH 121: footer remains mode-only; top icon visibly rotates on every real UI refresh.
        // PATCH 116.2: footer is a persistent mode indicator; cycle activity belongs to the 3s indicator.
        if (lbl) lbl.textContent = state.autoActive ? 'ATIVO' : 'INATIVO';
        if (btn) btn.style.background = state.autoActive ? 'rgba(0,230,118,.15)' : '';
        const cycleIndicator = document.querySelector('[data-auto-cycle-indicator], #fe-arb-auto-cycle, #fe-arb-refresh-indicator');
        if (cycleIndicator) { cycleIndicator.classList.remove('fallah-cycle-pulse'); void cycleIndicator.offsetWidth; cycleIndicator.classList.add('fallah-cycle-pulse'); }
        // PATCH 123: o ciclo visual de 3s consulta apenas os endpoints leves.
        // Auditorias/drill-down/logs são pesados e não podem bloquear scroll/cliques.
        await Promise.all([loadPipelineStatus(), loadEngineStatus()]);
      } finally {
        if (lbl) lbl.textContent = state.autoActive ? 'ATIVO' : 'INATIVO';
        if (btn) btn.style.background = state.autoActive ? 'rgba(0,230,118,.15)' : '';
        state.refreshInFlight = false;
      }
    }, state.autoRefreshMs);
  }

  async function pulseRefreshIcon() {
    const icon = document.querySelector('#fe-arb-refresh-btn i');
    if (icon) { icon.classList.remove('fe-spin-once'); void icon.offsetWidth; icon.classList.add('fe-spin-once'); }
  }

  document.getElementById('fe-arb-refresh-btn')?.addEventListener('click', async () => {
    pulseRefreshIcon();
    await Promise.all([loadPipelineStatus(), loadEngineStatus()]);
    await Promise.all([loadCoverageAudit(), loadCollectionAudit(), loadLogsPanel()]);
  });

  document.getElementById('fe-arb-refresh-now')?.addEventListener('click', async () => {
    await Promise.all([loadPipelineStatus(), loadEngineStatus()]);
    await Promise.all([loadCoverageAudit(), loadCollectionAudit(), loadLogsPanel()]);
  });

  document.getElementById('fe-arb-export')?.addEventListener('click', () => {
    const data = JSON.stringify(state.opportunities, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `fallah-arbitrage-${Date.now()}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  const intervalSelect = document.getElementById('fe-arb-auto-interval');
  if (intervalSelect) {
    const savedInterval = Number(localStorage.getItem('fallahArbAutoRefreshMs') || 3000);
    state.autoRefreshMs = [3000,5000,10000,15000,30000].includes(savedInterval) ? savedInterval : 3000;
    intervalSelect.value = String(state.autoRefreshMs);
    intervalSelect.addEventListener('change', () => {
      state.autoRefreshMs = Number(intervalSelect.value || 3000);
      localStorage.setItem('fallahArbAutoRefreshMs', String(state.autoRefreshMs));
      startAutoRefresh();
      pulseRefreshIcon();
    });
  }

  document.getElementById('fe-arb-auto-btn')?.addEventListener('click', () => {
    state.autoActive = !state.autoActive;
    const lbl = document.getElementById('fe-arb-auto-label');
    const btn = document.getElementById('fe-arb-auto-btn');
    if (lbl) lbl.textContent = state.autoActive ? 'ATIVO' : 'INATIVO';
    if (btn) btn.style.background = state.autoActive ? 'rgba(0,230,118,.15)' : '';
  });

  // ── BUILD / FOOTER ─────────────────────────────────────────────────────
  const buildEl = document.getElementById('fe-footer-build');
  if (buildEl) {
    const d = new Date();
    buildEl.textContent = `BUILD ${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
  }


  function showUtilityPanel(title, body) {
    let p=document.getElementById('fe-utility-panel'); if(!p){ p=document.createElement('div'); p.id='fe-utility-panel'; p.style.cssText='position:fixed;right:18px;top:82px;z-index:9999;width:min(520px,92vw);max-height:72vh;overflow:auto;background:#111827;border:1px solid #475569;border-radius:10px;padding:18px;color:#fff;box-shadow:0 18px 50px #000a'; document.body.appendChild(p); }
    p.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><b>${title}</b><button id="fe-util-close" class="fe-pill-sm">FECHAR</button></div><div style="margin-top:14px;line-height:1.55">${body}</div>`; p.querySelector('#fe-util-close').onclick=()=>p.remove();
  }
  function openAlerts(){ const st=state.engineStatus?.stats||{}; showUtilityPanel('CENTRAL DE ALERTAS', `<b>Motor:</b> ${Number(st.REAL_ARBITRAGE_OPPORTUNITIES||0)} oportunidades<br><b>Rejeições temporais:</b> ${Number(st.REJECTED_BY_TEMPORAL||0)}<br><b>Rejeições de mercado:</b> ${Number(st.REJECTED_BY_MARKET||0)}<br><b>Rejeições de runner:</b> ${Number(st.REJECTED_BY_RUNNER||0)}<br><b>Rejeições matemáticas:</b> ${Number(st.REJECTED_BY_MATHEMATICS||0)}<br><br>Esta central reflete o diagnóstico real do motor; não cria alertas simulados.`); }
  function openSettings(){ showUtilityPanel('CONFIGURAÇÕES GERAIS', `Inicialização: <b>ONLINE automática</b><br>Mercados: <b>TODOS, sempre ativos</b><br>Métodos: <b>TODOS, sempre ativos</b><br>Atualização do painel: <b>${state.autoRefreshMs/1000}s</b><br><br>Esportes, casas e som são salvos separadamente no painel lateral.`); }
  ['fe-alerts-btn','fe-arb-alerts-btn'].forEach(id=>document.getElementById(id)?.addEventListener('click',openAlerts));
  ['fe-settings-btn','fe-arb-config-btn'].forEach(id=>document.getElementById(id)?.addEventListener('click',openSettings));
  document.getElementById('fe-system-online')?.addEventListener('click',()=>setAllHousesActive(true));
  document.getElementById('fe-system-offline')?.addEventListener('click',()=>setAllHousesActive(false));

  // ── INIT ──────────────────────────────────────────────────────────────
  async function init() {
    await loadOfflineHouseStatus();
    await loadPipelineStatus();
    await loadEngineStatus();
    state.autoActive = true;
    const autoBtn=document.getElementById('fe-arb-auto-btn'); if(autoBtn) autoBtn.style.background='rgba(0,230,118,.15)';
    startAutoRefresh();
    startSlowAudits();
    setTimeout(() => setAllHousesActive(true), 800);
  }

  init();
})();
