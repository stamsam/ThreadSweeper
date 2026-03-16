'use strict';

(() => {
  if (window.__ThreadSweeperExtensionLoaded) return;
  window.__ThreadSweeperExtensionLoaded = true;

  const SECTION_STOPS = ['projects', 'gpts', 'pinned', 'recent', 'recents', 'shared', 'archived'];

  const state = {
    running: false,
    stopRequested: false,
    deleted: 0,
    scanned: 0,
    logs: [],
    config: {
      dryRun: true,
      onlyYourChats: true,
      maxDeletes: 50,
      delayMs: 900,
      confirmBeforeRun: true,
    },
  };

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

  const parseSidebarItems = () => {
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
  };

  const findYourChatsBounds = (items) => {
    const lower = (s) => s.toLowerCase();
    const yourChats = items.find((item) => lower(item.text) === 'your chats');
    if (!yourChats) return null;

    const nextSection = items.find((item) => {
      if (item.y <= yourChats.y) return false;
      const t = lower(item.text);
      if (!t) return false;
      return SECTION_STOPS.some((stop) => t === stop || t.startsWith(stop + ' '));
    });

    return {
      startY: yourChats.y,
      endY: nextSection ? nextSection.y : Number.POSITIVE_INFINITY,
    };
  };

  const findTargetRow = () => {
    const items = parseSidebarItems();
    if (!items.length) return null;

    let minY = -Infinity;
    let maxY = Number.POSITIVE_INFINITY;

    if (state.config.onlyYourChats) {
      const bounds = findYourChatsBounds(items);
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
    return buttons.find((el) => {
      const t = norm(el.innerText || el.textContent || el.getAttribute('aria-label'));
      return /^(delete|delete chat|confirm|yes, delete)$/i.test(t);
    }) || null;
  };

  const highlight = (el, color) => {
    if (!el) return;
    const old = el.style.outline;
    el.style.outline = `2px solid ${color}`;
    setTimeout(() => {
      el.style.outline = old;
    }, 1000);
  };

  const snapshot = () => ({
    running: state.running,
    stopRequested: state.stopRequested,
    deleted: state.deleted,
    scanned: state.scanned,
    logs: state.logs.slice(0, 40),
    config: Object.assign({}, state.config),
  });

  const stop = () => {
    if (!state.running) return;
    state.stopRequested = true;
    log('Stop requested.');
  };

  const runSweep = async (config) => {
    if (state.running) {
      return { ok: false, error: 'Already running.', state: snapshot() };
    }

    state.config = Object.assign({}, state.config, config || {});
    state.config.maxDeletes = Math.max(1, Number(state.config.maxDeletes) || 50);
    state.config.delayMs = Math.max(200, Number(state.config.delayMs) || 900);

    if (state.config.confirmBeforeRun) {
      const mode = state.config.dryRun ? 'DRY RUN' : 'LIVE DELETE';
      const ok = window.confirm(
        `ThreadSweeper ${mode}\n\nOnly Your chats: ${state.config.onlyYourChats ? 'Yes' : 'No'}\nMax deletes: ${state.config.maxDeletes}\n\nContinue?`
      );
      if (!ok) {
        return { ok: true, state: snapshot() };
      }
    }

    state.running = true;
    state.stopRequested = false;
    state.deleted = 0;
    state.scanned = 0;
    log(`Starting run: dryRun=${state.config.dryRun}, onlyYourChats=${state.config.onlyYourChats}, maxDeletes=${state.config.maxDeletes}`);

    try {
      while (!state.stopRequested) {
        const row = findTargetRow();
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
          continue;
        }

        highlight(row.linkEl, '#ef4444');
        clickLikeUser(row.menuEl);
        await sleep(450);

        const deleteItem = findDeleteItem();
        if (!deleteItem) {
          log('Delete menu item not found. Stopping.');
          break;
        }

        clickLikeUser(deleteItem);
        await sleep(450);

        const confirmBtn = findConfirmDelete();
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
    } catch (err) {
      log(`Error: ${err && err.message ? err.message : String(err)}`);
    } finally {
      state.running = false;
      log(`Finished. Deleted=${state.deleted}, Scanned=${state.scanned}`);
    }

    return { ok: true, state: snapshot() };
  };

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message.type !== 'string') return;

    if (message.type === 'TS_GET_STATUS') {
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

  log('Controller ready.');
})();
