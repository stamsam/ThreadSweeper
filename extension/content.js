'use strict';

(() => {
  if (window.__ThreadSweeperExtensionLoaded) return;
  window.__ThreadSweeperExtensionLoaded = true;

  const CHATGPT_SECTION_STOPS = ['projects', 'gpts', 'pinned', 'recent', 'recents', 'shared', 'archived'];
  const providerMeta = {
    unknown: { label: 'Unknown' },
    chatgpt: { label: 'ChatGPT' },
    claude: { label: 'Claude' },
  };

  const state = {
    running: false,
    stopRequested: false,
    deleted: 0,
    scanned: 0,
    logs: [],
    detectedProvider: detectProviderFromLocation(),
    activeProvider: null,
    config: {
      providerMode: 'auto',
      dryRun: true,
      onlyYourChats: true,
      maxDeletes: 50,
      delayMs: 900,
      confirmBeforeRun: true,
    },
  };

  function detectProviderFromLocation() {
    if (location.hostname === 'chatgpt.com') return 'chatgpt';
    if (location.hostname === 'claude.ai') return 'claude';
    return 'unknown';
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();

  const visible = (el) => {
    if (!el || !el.isConnected) return false;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  const clickLikeUser = (el) => {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach((type) => {
      el.dispatchEvent(new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: x,
        clientY: y,
      }));
    });
  };

  const log = (msg) => {
    const line = `${new Date().toLocaleTimeString()} ${msg}`;
    state.logs.unshift(line);
    state.logs = state.logs.slice(0, 200);
    console.log(`[ThreadSweeper] ${msg}`);
  };

  const highlight = (el, color) => {
    if (!el) return;
    const old = el.style.outline;
    el.style.outline = `2px solid ${color}`;
    setTimeout(() => {
      el.style.outline = old;
    }, 1000);
  };

  const findVisibleButtons = () => [...document.querySelectorAll('button')].filter(visible);

  const findVisibleButton = (predicate) => findVisibleButtons().find(predicate) || null;

  const snapshot = () => ({
    running: state.running,
    stopRequested: state.stopRequested,
    deleted: state.deleted,
    scanned: state.scanned,
    logs: state.logs.slice(0, 40),
    detectedProvider: state.detectedProvider,
    activeProvider: state.activeProvider,
    config: Object.assign({}, state.config),
  });

  const stop = () => {
    if (!state.running) return;
    state.stopRequested = true;
    log('Stop requested.');
  };

  function resolveProvider(providerMode) {
    const detectedProvider = detectProviderFromLocation();
    state.detectedProvider = detectedProvider;

    if (providerMode && providerMode !== 'auto') {
      if (providerMode !== detectedProvider) {
        return {
          ok: false,
          error: `Selected provider (${providerMeta[providerMode]?.label || providerMode}) does not match the active tab (${providerMeta[detectedProvider]?.label || detectedProvider}).`,
        };
      }
      return { ok: true, providerId: providerMode };
    }

    if (detectedProvider === 'unknown') {
      return { ok: false, error: 'Open chatgpt.com or claude.ai in the active tab first.' };
    }

    return { ok: true, providerId: detectedProvider };
  }

  function buildConfirmationText(providerId) {
    if (providerId === 'claude') {
      return `ThreadSweeper ${state.config.dryRun ? 'DRY RUN' : 'LIVE DELETE'}\n\nProvider: Claude\nScope: Recents only (Projects protected)\nMax deletes: ${state.config.maxDeletes}\n\nContinue?`;
    }

    return `ThreadSweeper ${state.config.dryRun ? 'DRY RUN' : 'LIVE DELETE'}\n\nProvider: ChatGPT\nOnly Your chats: ${state.config.onlyYourChats ? 'Yes' : 'No'}\nMax deletes: ${state.config.maxDeletes}\n\nContinue?`;
  }

  function parseChatGPTSidebarItems() {
    const roots = [...document.querySelectorAll('nav[aria-label="Chat history"], nav, aside')].filter(visible);
    const sidebar = roots[0];
    if (!sidebar) return [];

    return [...sidebar.querySelectorAll('a,button,h1,h2,h3,h4,[role="heading"]')]
      .filter(visible)
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          el,
          tag: el.tagName,
          y: Math.round(rect.y),
          text: norm(el.innerText || el.textContent || ''),
          aria: norm(el.getAttribute('aria-label') || ''),
        };
      })
      .sort((a, b) => a.y - b.y);
  }

  function findChatGPTBounds(items) {
    const lower = (s) => s.toLowerCase();
    const yourChats = items.find((item) => lower(item.text) === 'your chats');
    if (!yourChats) return null;

    const nextSection = items.find((item) => {
      if (item.y <= yourChats.y) return false;
      const text = lower(item.text);
      if (!text) return false;
      return CHATGPT_SECTION_STOPS.some((stop) => text === stop || text.startsWith(`${stop} `));
    });

    return {
      startY: yourChats.y,
      endY: nextSection ? nextSection.y : Number.POSITIVE_INFINITY,
    };
  }

  function findChatGPTTargetRow() {
    const items = parseChatGPTSidebarItems();
    if (!items.length) return null;

    let minY = -Infinity;
    let maxY = Number.POSITIVE_INFINITY;

    if (state.config.onlyYourChats) {
      const bounds = findChatGPTBounds(items);
      if (!bounds) {
        log('Could not locate "Your chats" section.');
        return null;
      }
      minY = bounds.startY;
      maxY = bounds.endY;
    }

    const links = items.filter((item) => item.tag === 'A' && item.text && item.y > minY && item.y < maxY);
    const menus = items.filter((item) => {
      if (item.tag !== 'BUTTON') return false;
      if (item.y <= minY || item.y >= maxY) return false;
      return /open conversation options/i.test(item.aria);
    });

    for (const link of links) {
      const menu = menus.find((btn) => Math.abs(btn.y - link.y) <= 8);
      if (menu) return { title: link.text, linkEl: link.el, menuEl: menu.el };
    }

    return null;
  }

  function findChatGPTDeleteItem() {
    const items = [...document.querySelectorAll('button,[role="menuitem"],[data-radix-collection-item]')].filter(visible);
    return items.find((el) => {
      const text = norm(el.innerText || el.textContent || el.getAttribute('aria-label'));
      return /^delete$/i.test(text) || /^delete chat$/i.test(text) || /delete/i.test(text);
    }) || null;
  }

  function findChatGPTConfirmDelete() {
    return findVisibleButton((el) => {
      const text = norm(el.innerText || el.textContent || el.getAttribute('aria-label'));
      return /^(delete|delete chat|confirm|yes, delete)$/i.test(text);
    });
  }

  async function runChatGPTSweep() {
    while (!state.stopRequested) {
      const row = findChatGPTTargetRow();
      if (!row) {
        log('No eligible ChatGPT chats found in the current sidebar view.');
        break;
      }

      state.scanned += 1;

      if (state.config.dryRun) {
        highlight(row.linkEl, '#f59e0b');
        row.linkEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
        log(`Would delete: ${row.title}`);
        if (state.scanned >= state.config.maxDeletes) {
          log(`Dry run reached max (${state.config.maxDeletes}).`);
          break;
        }
        await sleep(state.config.delayMs);
        continue;
      }

      highlight(row.linkEl, '#ef4444');
      clickLikeUser(row.menuEl);
      await sleep(450);

      const deleteItem = findChatGPTDeleteItem();
      if (!deleteItem) {
        log('Delete menu item not found. Stopping.');
        break;
      }

      clickLikeUser(deleteItem);
      await sleep(450);

      const confirmBtn = findChatGPTConfirmDelete();
      if (!confirmBtn) {
        log('Delete confirmation button not found. Stopping.');
        break;
      }

      clickLikeUser(confirmBtn);
      state.deleted += 1;
      log(`Deleted (${state.deleted}): ${row.title}`);

      if (state.deleted >= state.config.maxDeletes) {
        log(`Reached maxDeletes (${state.config.maxDeletes}).`);
        break;
      }

      await sleep(state.config.delayMs);
    }
  }

  function isClaudeRecentsPage() {
    return location.hostname === 'claude.ai' && location.pathname.startsWith('/recents');
  }

  function findClaudeActionButton(label) {
    const target = label.toLowerCase();
    return findVisibleButton((btn) => norm(btn.textContent).toLowerCase() === target);
  }

  function findClaudeDeleteSelectedButton() {
    return findVisibleButton((btn) => /delete\s+selected/i.test(norm(btn.textContent)));
  }

  function findClaudeConfirmDeleteButton() {
    return findVisibleButtons().find((btn) => {
      const text = norm(btn.textContent || btn.getAttribute('aria-label'));
      return btn.dataset.testid === 'delete-modal-confirm' || /^(delete|yes, delete)$/i.test(text);
    }) || null;
  }

  function findClaudeCheckboxForRow(row) {
    const direct = row.querySelector('input[type="checkbox"], button[role="checkbox"], [aria-checked]');
    if (direct && visible(direct)) return direct;

    const siblings = row.parentElement ? [...row.parentElement.querySelectorAll('input[type="checkbox"], button[role="checkbox"], [aria-checked]')] : [];
    return siblings.find(visible) || null;
  }

  function getClaudeRowTitle(row) {
    return norm(
      row.getAttribute('aria-label') ||
      row.querySelector('[title]')?.getAttribute('title') ||
      row.textContent
    );
  }

  function getClaudeRecentsRows() {
    const links = [...document.querySelectorAll('a[href*="/chat/"]')].filter(visible);
    const seen = new Set();
    const rows = [];

    for (const link of links) {
      const href = link.getAttribute('href') || '';
      if (!href.includes('/chat/')) continue;
      if (href.includes('/projects/')) continue;

      const row = link.closest('li, article, [role="listitem"], a, div');
      if (!row || seen.has(row)) continue;

      const text = getClaudeRowTitle(row);
      if (!text) continue;
      if (/project/i.test(text)) continue;

      const checkbox = findClaudeCheckboxForRow(row);
      if (!checkbox) continue;

      seen.add(row);
      rows.push({ row, checkbox, title: text });
    }

    return rows;
  }

  async function ensureClaudeSelectionMode() {
    if (findClaudeDeleteSelectedButton() || findClaudeActionButton('Select all')) return true;

    const selectBtn = findClaudeActionButton('Select');
    if (!selectBtn) return false;

    clickLikeUser(selectBtn);
    await sleep(450);
    return !!(findClaudeDeleteSelectedButton() || findClaudeActionButton('Select all') || getClaudeRecentsRows().length);
  }

  async function runClaudeSweep() {
    if (!isClaudeRecentsPage()) {
      throw new Error('Open claude.ai/recents first. Claude deletion runs only from Recents to protect Projects.');
    }

    if (!await ensureClaudeSelectionMode()) {
      throw new Error('Could not enter Claude selection mode. Refresh claude.ai/recents and try again.');
    }

    const rows = getClaudeRecentsRows();
    if (!rows.length) {
      log('No eligible Claude Recents chats found.');
      return;
    }

    const targets = rows.slice(0, state.config.maxDeletes);

    for (const target of targets) {
      if (state.stopRequested) break;
      state.scanned += 1;

      if (state.config.dryRun) {
        highlight(target.row, '#f59e0b');
        target.row.scrollIntoView({ block: 'center', behavior: 'smooth' });
        log(`Would delete: ${target.title}`);
        continue;
      }

      highlight(target.row, '#ef4444');
      clickLikeUser(target.checkbox);
      await sleep(180);
      state.deleted += 1;
      log(`Selected (${state.deleted}): ${target.title}`);
    }

    if (state.config.dryRun) {
      log(`Claude dry run reviewed ${targets.length} chat(s) from Recents. Projects remain untouched.`);
      return;
    }

    if (!state.deleted) {
      log('No Claude chats were selected for deletion.');
      return;
    }

    const deleteSelected = findClaudeDeleteSelectedButton();
    if (!deleteSelected) {
      throw new Error('Claude "Delete Selected" button not found. No actions taken.');
    }

    clickLikeUser(deleteSelected);
    await sleep(450);

    const confirmBtn = findClaudeConfirmDeleteButton();
    if (!confirmBtn) {
      throw new Error('Claude delete confirmation not found. No actions taken.');
    }

    clickLikeUser(confirmBtn);
    log(`Deleted ${state.deleted} Claude chat(s) from Recents.`);
    await sleep(state.config.delayMs);
  }

  const providers = {
    chatgpt: {
      label: 'ChatGPT',
      run: runChatGPTSweep,
    },
    claude: {
      label: 'Claude',
      run: runClaudeSweep,
    },
  };

  async function runSweep(config) {
    if (state.running) {
      return { ok: false, error: 'Already running.', state: snapshot() };
    }

    state.config = Object.assign({}, state.config, config || {});
    state.config.maxDeletes = Math.max(1, Number(state.config.maxDeletes) || 50);
    state.config.delayMs = Math.max(200, Number(state.config.delayMs) || 900);

    const resolution = resolveProvider(state.config.providerMode);
    if (!resolution.ok) {
      return { ok: false, error: resolution.error, state: snapshot() };
    }

    const providerId = resolution.providerId;
    const provider = providers[providerId];
    state.activeProvider = providerId;

    if (providerId === 'claude') {
      state.config.onlyYourChats = true;
    }

    if (state.config.confirmBeforeRun) {
      const ok = window.confirm(buildConfirmationText(providerId));
      if (!ok) {
        return { ok: true, state: snapshot() };
      }
    }

    state.running = true;
    state.stopRequested = false;
    state.deleted = 0;
    state.scanned = 0;
    log(`Starting ${provider.label} run: dryRun=${state.config.dryRun}, maxDeletes=${state.config.maxDeletes}`);

    try {
      await provider.run();
    } catch (err) {
      log(`Error: ${err && err.message ? err.message : String(err)}`);
      return { ok: false, error: err && err.message ? err.message : String(err), state: snapshot() };
    } finally {
      state.running = false;
      log(`Finished ${provider.label} run. Deleted=${state.deleted}, Scanned=${state.scanned}`);
    }

    return { ok: true, state: snapshot() };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message.type !== 'string') return;

    if (message.type === 'TS_GET_STATUS') {
      state.detectedProvider = detectProviderFromLocation();
      sendResponse({ ok: true, state: snapshot() });
      return;
    }

    if (message.type === 'TS_STOP') {
      stop();
      sendResponse({ ok: true, state: snapshot() });
      return;
    }

    if (message.type === 'TS_START') {
      runSweep(message.config)
        .then((result) => sendResponse(result))
        .catch((err) => sendResponse({ ok: false, error: err.message || String(err), state: snapshot() }));
      return true;
    }
  });

  log(`Controller ready for ${providerMeta[state.detectedProvider].label}.`);
})();
