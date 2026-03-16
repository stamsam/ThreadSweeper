// ==UserScript==
// @name         ThreadSweeper
// @namespace    https://github.com/
// @version      0.1.2
// @description  Clean ChatGPT sidebar threads with safety guardrails.
// @author       ThreadSweeper Contributors
// @match        https://chatgpt.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  if (window.__ThreadSweeperLoaded) return;
  window.__ThreadSweeperLoaded = true;

  const state = {
    running: false,
    stopRequested: false,
    deleted: 0,
    scanned: 0,
    config: {
      dryRun: true,
      onlyYourChats: true,
      maxDeletes: 50,
      delayMs: 900,
      confirmBeforeRun: true,
    },
  };

  const SECTION_STOPS = [
    'projects',
    'gpts',
    'pinned',
    'recent',
    'recents',
    'shared',
    'archived',
  ];

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const norm = (text) => (text || '').replace(/\s+/g, ' ').trim();

  const visible = (el) => {
    if (!el || !el.isConnected) return false;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  const emitMouseClick = (el) => {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
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
    const stamp = new Date().toLocaleTimeString();
    console.log(`[ThreadSweeper ${stamp}] ${msg}`);
    if (!ui.logEl) return;
    const line = document.createElement('div');
    line.textContent = `${stamp} ${msg}`;
    ui.logEl.prepend(line);
  };

  const findSidebarRoot = () => {
    const roots = [...document.querySelectorAll('nav[aria-label="Chat history"], nav, aside')].filter(visible);
    return roots[0] || null;
  };

  const parseSidebarItems = () => {
    const sidebar = findSidebarRoot();
    if (!sidebar) return [];

    const all = [...sidebar.querySelectorAll('a, button, h1, h2, h3, h4, [role="heading"]')]
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

    return all;
  };

  const findYourChatsBounds = (items) => {
    const lower = (s) => s.toLowerCase();
    const yourChats = items.find((item) => lower(item.text) === 'your chats');
    if (!yourChats) return null;

    const nextSection = items.find((item) => {
      if (item.y <= yourChats.y) return false;
      const text = lower(item.text);
      if (!text) return false;
      return SECTION_STOPS.some((stop) => text === stop || text.startsWith(stop + ' '));
    });

    return {
      startY: yourChats.y,
      endY: nextSection ? nextSection.y : Number.POSITIVE_INFINITY,
    };
  };

  const findTargetRows = () => {
    const items = parseSidebarItems();
    if (!items.length) return [];

    let minY = -Infinity;
    let maxY = Number.POSITIVE_INFINITY;

    if (state.config.onlyYourChats) {
      const bounds = findYourChatsBounds(items);
      if (!bounds) {
        log('Could not locate "Your chats" section.');
        return [];
      }
      minY = bounds.startY;
      maxY = bounds.endY;
    }

    const links = items.filter((item) => item.tag === 'A' && item.text && item.y > minY && item.y < maxY);

    const menuButtons = items.filter((item) => {
      if (item.tag !== 'BUTTON') return false;
      if (item.y <= minY || item.y >= maxY) return false;
      return /open conversation options/i.test(item.aria);
    });

    return links.map((link) => {
      const menu = menuButtons.find((btn) => Math.abs(btn.y - link.y) <= 8);
      return menu ? { title: link.text, linkEl: link.el, menuEl: menu.el, y: link.y } : null;
    }).filter(Boolean);
  };

  const findDeleteItem = () => {
    const items = [...document.querySelectorAll('button,[role="menuitem"],[data-radix-collection-item]')].filter(visible);
    return items.find((el) => {
      const t = norm(el.innerText || el.textContent || el.getAttribute('aria-label'));
      return /^delete$/i.test(t) || /^delete chat$/i.test(t) || /delete/i.test(t);
    }) || null;
  };

  const findConfirmDelete = () => {
    const buttons = [...document.querySelectorAll('button')].filter(visible);
    return buttons.find((btn) => {
      const t = norm(btn.innerText || btn.textContent || btn.getAttribute('aria-label'));
      return /^(delete|delete chat|confirm|yes, delete)$/i.test(t);
    }) || null;
  };

  const highlight = (el, color) => {
    if (!el) return;
    const old = el.style.outline;
    el.style.outline = `2px solid ${color}`;
    setTimeout(() => {
      el.style.outline = old;
    }, 1200);
  };

  const refreshUi = () => {
    if (!ui.statusEl) return;
    ui.statusEl.textContent = state.running
      ? `Running | Deleted: ${state.deleted} | Scanned: ${state.scanned}`
      : `Idle | Last run deleted: ${state.deleted} | Scanned: ${state.scanned}`;
  };

  const requestStop = () => {
    if (!state.running) return;
    state.stopRequested = true;
    log('Stop requested. Will halt after current step.');
  };

  const runSweep = async () => {
    if (state.running) return;

    state.config.dryRun = ui.dryRunEl.checked;
    state.config.onlyYourChats = ui.onlyYourChatsEl.checked;
    state.config.maxDeletes = Math.max(1, Number(ui.maxDeletesEl.value) || 50);
    state.config.delayMs = Math.max(200, Number(ui.delayMsEl.value) || 900);
    state.config.confirmBeforeRun = ui.confirmBeforeRunEl.checked;

    if (state.config.confirmBeforeRun) {
      const mode = state.config.dryRun ? 'DRY RUN' : 'LIVE DELETE';
      const ok = window.confirm(
        `ThreadSweeper ${mode}\n\nOnly Your chats: ${state.config.onlyYourChats ? 'Yes' : 'No'}\nMax deletes: ${state.config.maxDeletes}\n\nContinue?`
      );
      if (!ok) return;
    }

    state.running = true;
    state.stopRequested = false;
    state.deleted = 0;
    state.scanned = 0;
    refreshUi();
    log(`Starting run. dryRun=${state.config.dryRun}, onlyYourChats=${state.config.onlyYourChats}, maxDeletes=${state.config.maxDeletes}`);

    try {
      while (!state.stopRequested) {
        const rows = findTargetRows();
        const row = rows[0];

        if (!row) {
          log('No eligible chats found in current sidebar view.');
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
          refreshUi();
          continue;
        }

        highlight(row.linkEl, '#ef4444');
        emitMouseClick(row.menuEl);
        await sleep(450);

        const deleteItem = findDeleteItem();
        if (!deleteItem) {
          log('Delete menu item not found. Stopping.');
          break;
        }

        emitMouseClick(deleteItem);
        await sleep(450);

        const confirmBtn = findConfirmDelete();
        if (!confirmBtn) {
          log('Delete confirmation button not found. Stopping.');
          break;
        }

        emitMouseClick(confirmBtn);
        state.deleted += 1;
        log(`Deleted (${state.deleted}): ${row.title}`);

        refreshUi();
        if (state.deleted >= state.config.maxDeletes) {
          log(`Reached maxDeletes (${state.config.maxDeletes}).`);
          break;
        }

        await sleep(state.config.delayMs);
      }
    } catch (error) {
      log(`Error: ${error && error.message ? error.message : String(error)}`);
    } finally {
      state.running = false;
      refreshUi();
      log(`Finished. Deleted=${state.deleted}, Scanned=${state.scanned}`);
    }
  };

  const css = `
#ts-launcher {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 2147483647;
  border: 1px solid #111827;
  border-radius: 999px;
  background: #111827;
  color: #ffffff;
  padding: 8px 12px;
  font: 600 12px/1.2 ui-sans-serif, -apple-system, Segoe UI, sans-serif;
  cursor: pointer;
}
#ts-panel {
  position: fixed;
  right: 16px;
  bottom: 56px;
  z-index: 2147483647;
  width: 340px;
  max-width: calc(100vw - 24px);
  max-height: min(72vh, 700px);
  background: #ffffff;
  color: #111827;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  font: 500 12px/1.4 ui-sans-serif, -apple-system, Segoe UI, sans-serif;
}
#ts-panel[hidden] { display: none; }
#ts-panel header {
  background: #111827;
  color: #ffffff;
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
#ts-panel header strong { font-size: 13px; }
#ts-panel main { padding: 10px 12px; display: grid; gap: 8px; }
#ts-panel .row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
#ts-panel label { font-size: 12px; }
#ts-panel input[type="number"] { width: 90px; padding: 4px; }
#ts-status { padding: 0 12px; color: #374151; font-size: 11px; }
#ts-actions { display: flex; gap: 8px; }
#ts-actions button {
  border: 1px solid #d1d5db;
  background: #f9fafb;
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
}
#ts-actions button.primary {
  background: #111827;
  border-color: #111827;
  color: #ffffff;
}
#ts-log {
  border-top: 1px solid #e5e7eb;
  background: #fafafa;
  padding: 8px 12px;
  max-height: 180px;
  overflow: auto;
  font-size: 11px;
}
`;

  const ui = {
    launcher: null,
    panel: null,
    statusEl: null,
    logEl: null,
    dryRunEl: null,
    onlyYourChatsEl: null,
    maxDeletesEl: null,
    delayMsEl: null,
    confirmBeforeRunEl: null,
  };

  const mountUi = () => {
    const style = document.createElement('style');
    style.textContent = css;
    document.documentElement.appendChild(style);

    const launcher = document.createElement('button');
    launcher.id = 'ts-launcher';
    launcher.type = 'button';
    launcher.textContent = 'ThreadSweeper';

    const panel = document.createElement('section');
    panel.id = 'ts-panel';
    panel.hidden = true;
    panel.innerHTML = `
      <header>
        <strong>ThreadSweeper</strong>
        <button id="ts-close" type="button" style="border:0;background:transparent;color:#fff;cursor:pointer">Close</button>
      </header>
      <main>
        <div class="row"><label><input id="ts-dry" type="checkbox" checked> Dry run (preview only)</label></div>
        <div class="row"><label><input id="ts-only" type="checkbox" checked> Restrict to Your chats</label></div>
        <div class="row"><label><input id="ts-confirm" type="checkbox" checked> Show final confirmation</label></div>
        <div class="row"><label for="ts-max">Max deletes</label><input id="ts-max" type="number" min="1" value="50"></div>
        <div class="row"><label for="ts-delay">Delay (ms)</label><input id="ts-delay" type="number" min="200" value="900"></div>
        <div id="ts-actions">
          <button id="ts-start" class="primary" type="button">Start</button>
          <button id="ts-stop" type="button">Stop</button>
        </div>
      </main>
      <div id="ts-status"></div>
      <div id="ts-log"></div>
    `;

    document.body.appendChild(launcher);
    document.body.appendChild(panel);

    ui.launcher = launcher;
    ui.panel = panel;
    ui.statusEl = panel.querySelector('#ts-status');
    ui.logEl = panel.querySelector('#ts-log');
    ui.dryRunEl = panel.querySelector('#ts-dry');
    ui.onlyYourChatsEl = panel.querySelector('#ts-only');
    ui.maxDeletesEl = panel.querySelector('#ts-max');
    ui.delayMsEl = panel.querySelector('#ts-delay');
    ui.confirmBeforeRunEl = panel.querySelector('#ts-confirm');

    launcher.addEventListener('click', () => {
      panel.hidden = !panel.hidden;
      refreshUi();
    });

    panel.querySelector('#ts-close').addEventListener('click', () => {
      panel.hidden = true;
    });

    panel.querySelector('#ts-start').addEventListener('click', () => {
      runSweep();
    });

    panel.querySelector('#ts-stop').addEventListener('click', () => {
      requestStop();
    });

    refreshUi();
    log('Loaded. Open panel and run a dry run first.');
  };

  const waitForBody = () => {
    if (document.body) {
      mountUi();
      return;
    }
    const observer = new MutationObserver(() => {
      if (!document.body) return;
      observer.disconnect();
      mountUi();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  };

  window.ThreadSweeper = {
    start: runSweep,
    stop: requestStop,
    state,
  };

  waitForBody();
})();
