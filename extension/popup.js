'use strict';

const defaults = {
  dryRun: true,
  onlyYourChats: true,
  confirmBeforeRun: true,
  maxDeletes: 50,
  delayMs: 900,
};

const els = {
  dryRun: document.getElementById('dryRun'),
  onlyYourChats: document.getElementById('onlyYourChats'),
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
    dryRun: !!els.dryRun.checked,
    onlyYourChats: !!els.onlyYourChats.checked,
    confirmBeforeRun: !!els.confirmBeforeRun.checked,
    maxDeletes: Math.max(1, Number(els.maxDeletes.value) || defaults.maxDeletes),
    delayMs: Math.max(200, Number(els.delayMs.value) || defaults.delayMs),
  };
}

function writeConfigToUi(cfg) {
  els.dryRun.checked = cfg.dryRun;
  els.onlyYourChats.checked = cfg.onlyYourChats;
  els.confirmBeforeRun.checked = cfg.confirmBeforeRun;
  els.maxDeletes.value = String(cfg.maxDeletes);
  els.delayMs.value = String(cfg.delayMs);
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
  if (!tab.url || !tab.url.startsWith('https://chatgpt.com/')) {
    throw new Error('Open chatgpt.com in the active tab first.');
  }
  return chrome.tabs.sendMessage(tab.id, message);
}

function formatSummary(s) {
  return `Running: ${s.running} | Deleted: ${s.deleted} | Scanned: ${s.scanned}`;
}

async function refreshStatus() {
  try {
    const res = await sendToActiveTab({ type: 'TS_GET_STATUS' });
    if (!res || !res.ok) {
      setStatus('Controller not ready. Refresh chatgpt.com tab.');
      return;
    }
    setStatus(formatSummary(res.state));
    renderLogs(res.state.logs || []);
    setTips('Run dry mode first after ChatGPT UI updates.');
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
  await loadConfig();
  await refreshStatus();
  startPolling();

  els.start.addEventListener('click', startRun);
  els.stop.addEventListener('click', stopRun);
  els.refresh.addEventListener('click', refreshStatus);

  [els.dryRun, els.onlyYourChats, els.confirmBeforeRun, els.maxDeletes, els.delayMs].forEach((el) => {
    el.addEventListener('change', async () => {
      await saveConfig(readConfigFromUi());
    });
  });
});
