'use strict';

const defaults = {
  providerMode: 'auto',
  dryRun: true,
  onlyYourChats: true,
  confirmBeforeRun: true,
  maxDeletes: 50,
  delayMs: 900,
};

const providerMeta = {
  unknown: {
    label: 'Unknown',
    scopeLabel: 'Restrict to supported chats',
    tips: 'Open chatgpt.com or claude.ai in the active tab first.',
    lockScope: false,
  },
  chatgpt: {
    label: 'ChatGPT',
    scopeLabel: 'Restrict to Your chats',
    tips: 'Run dry mode first after ChatGPT UI updates.',
    lockScope: false,
  },
  claude: {
    label: 'Claude',
    scopeLabel: 'Restrict to Recents (Projects protected)',
    tips: 'Claude runs only from claude.ai/recents to avoid Projects.',
    lockScope: true,
  },
};

const els = {
  providerMode: document.getElementById('providerMode'),
  providerStatus: document.getElementById('providerStatus'),
  dryRun: document.getElementById('dryRun'),
  onlyYourChats: document.getElementById('onlyYourChats'),
  scopeLabel: document.getElementById('scopeLabel'),
  confirmBeforeRun: document.getElementById('confirmBeforeRun'),
  maxDeletes: document.getElementById('maxDeletes'),
  delayMs: document.getElementById('delayMs'),
  start: document.getElementById('start'),
  stop: document.getElementById('stop'),
  refresh: document.getElementById('refresh'),
  status: document.getElementById('status'),
  tips: document.getElementById('tips'),
  logs: document.getElementById('logs'),
};

function getProviderFromUrl(url) {
  if (!url) return 'unknown';
  if (url.startsWith('https://chatgpt.com/')) return 'chatgpt';
  if (url.startsWith('https://claude.ai/')) return 'claude';
  return 'unknown';
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

function setStatus(text) {
  els.status.textContent = text;
}

function setTips(text) {
  els.tips.textContent = text;
}

function renderLogs(lines) {
  els.logs.textContent = (lines || []).slice(0, 40).join('\n');
}

function readConfigFromUi() {
  return {
    providerMode: els.providerMode.value,
    dryRun: !!els.dryRun.checked,
    onlyYourChats: !!els.onlyYourChats.checked,
    confirmBeforeRun: !!els.confirmBeforeRun.checked,
    maxDeletes: Math.max(1, Number(els.maxDeletes.value) || defaults.maxDeletes),
    delayMs: Math.max(200, Number(els.delayMs.value) || defaults.delayMs),
  };
}

function writeConfigToUi(cfg) {
  els.providerMode.value = cfg.providerMode;
  els.dryRun.checked = cfg.dryRun;
  els.onlyYourChats.checked = cfg.onlyYourChats;
  els.confirmBeforeRun.checked = cfg.confirmBeforeRun;
  els.maxDeletes.value = String(cfg.maxDeletes);
  els.delayMs.value = String(cfg.delayMs);
}

function formatSummary(s) {
  return `Running: ${s.running} | Deleted: ${s.deleted} | Scanned: ${s.scanned}`;
}

function applyProviderUi(detectedProvider, selectedMode) {
  const selectedProvider = selectedMode === 'auto' ? detectedProvider : selectedMode;
  const meta = providerMeta[selectedProvider] || providerMeta.unknown;
  const detectedMeta = providerMeta[detectedProvider] || providerMeta.unknown;

  els.providerStatus.textContent = `Detected site: ${detectedMeta.label}`;
  els.scopeLabel.textContent = meta.scopeLabel;
  els.onlyYourChats.disabled = meta.lockScope;
  if (meta.lockScope) {
    els.onlyYourChats.checked = true;
  }

  const mismatch =
    selectedMode !== 'auto' &&
    detectedProvider !== 'unknown' &&
    selectedMode !== detectedProvider;

  if (mismatch) {
    setTips(`Selected provider (${meta.label}) does not match active tab (${detectedMeta.label}).`);
    return;
  }

  setTips(meta.tips);
}

async function saveConfig(cfg) {
  await chrome.storage.local.set({ tsConfig: cfg });
}

async function loadConfig() {
  const data = await chrome.storage.local.get('tsConfig');
  const cfg = Object.assign({}, defaults, data.tsConfig || {});
  writeConfigToUi(cfg);
  return cfg;
}

async function sendToActiveTab(message) {
  const tab = await getActiveTab();
  if (!tab || !tab.id) {
    throw new Error('No active tab found.');
  }

  const provider = getProviderFromUrl(tab.url);
  if (provider === 'unknown') {
    throw new Error('Open chatgpt.com or claude.ai in the active tab first.');
  }

  return chrome.tabs.sendMessage(tab.id, message);
}

async function refreshStatus() {
  const tab = await getActiveTab();
  const detectedProvider = getProviderFromUrl(tab && tab.url);
  applyProviderUi(detectedProvider, els.providerMode.value);

  try {
    const res = await sendToActiveTab({ type: 'TS_GET_STATUS' });
    if (!res || !res.ok) {
      setStatus('Controller not ready. Refresh the active tab.');
      renderLogs([]);
      return;
    }

    applyProviderUi(res.state.detectedProvider || detectedProvider, els.providerMode.value);
    setStatus(formatSummary(res.state));
    renderLogs(res.state.logs || []);
  } catch (err) {
    setStatus('Idle');
    setTips(err.message);
    renderLogs([]);
  }
}

async function startRun() {
  const cfg = readConfigFromUi();
  await saveConfig(cfg);
  setStatus('Starting...');

  try {
    const res = await sendToActiveTab({ type: 'TS_START', config: cfg });
    if (!res || !res.ok) {
      throw new Error((res && res.error) || 'Failed to start.');
    }
    applyProviderUi(res.state.detectedProvider || 'unknown', cfg.providerMode);
    setStatus(formatSummary(res.state));
    renderLogs(res.state.logs || []);
  } catch (err) {
    setStatus('Start failed');
    setTips(err.message);
  }
}

async function stopRun() {
  try {
    const res = await sendToActiveTab({ type: 'TS_STOP' });
    if (!res || !res.ok) {
      throw new Error((res && res.error) || 'Failed to stop.');
    }
    setStatus(formatSummary(res.state));
    renderLogs(res.state.logs || []);
  } catch (err) {
    setTips(err.message);
  }
}

let pollTimer = null;

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(refreshStatus, 1500);
}

document.addEventListener('DOMContentLoaded', async () => {
  const cfg = await loadConfig();
  applyProviderUi('unknown', cfg.providerMode);
  await refreshStatus();
  startPolling();

  els.start.addEventListener('click', startRun);
  els.stop.addEventListener('click', stopRun);
  els.refresh.addEventListener('click', refreshStatus);

  [
    els.providerMode,
    els.dryRun,
    els.onlyYourChats,
    els.confirmBeforeRun,
    els.maxDeletes,
    els.delayMs,
  ].forEach((el) => {
    el.addEventListener('change', async () => {
      const nextCfg = readConfigFromUi();
      await saveConfig(nextCfg);
      applyProviderUi(getProviderFromUrl((await getActiveTab())?.url), nextCfg.providerMode);
    });
  });
});
