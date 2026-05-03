(function () {
    const root = document.getElementById('projector-admin-settings');
    if (!root) return;

    const modeUrl = root.dataset.modeUrl;
    const dwellUrl = root.dataset.dwellUrl;
    const pauseUrl = root.dataset.pausedUrl;
    const darkModeUrl = root.dataset.darkmodeUrl;
    const skipUrl = root.dataset.skipUrl;
    if (!modeUrl || !dwellUrl || !pauseUrl || !darkModeUrl) return;

    let lastMode = root.dataset.initialMode || 'home';
    let lastSavedDwell = parseInt(root.dataset.initialDwellSec || '30', 10);

    const modeStatus = document.getElementById('projector-mode-status');
    const darkModeStatus = document.getElementById('darkmode-status');
    const messageModeRadio = document.getElementById('mode-message');
    const messageTextarea = document.getElementById('projector-message');
    const messageSaveHint = document.getElementById('projector-message-save-hint');
    const messageBtnSave = document.getElementById('projector-message-btn-save');
    const messageBtnSaveDisplay = document.getElementById('projector-message-btn-save-display');

    const dwellInput = document.getElementById('projector-dwell-slider');
    const dwellLabel = document.getElementById('projector-dwell-label');
    const dwellStatus = document.getElementById('projector-dwell-status');
    const recentGuestbookSection = document.getElementById('projector-recent-guestbook-section');
    const recentGuestbookIdsInput = document.getElementById('projector-recent-guestbook-ids');
    const recentGuestbookListEl = document.getElementById('projector-recent-guestbook-list');
    const recentGuestbookEmptyEl = document.getElementById('projector-recent-guestbook-empty');
    const pauseToggle = document.getElementById('projector-pause-toggle');
    const pauseIcon = document.getElementById('projector-pause-icon');
    const pauseLabel = document.getElementById('projector-pause-label');
    const pauseStatus = document.getElementById('projector-pause-status');
    const guestbookCountHint = document.getElementById('projector-guestbook-count-hint');

    let rotationPaused = root.dataset.initialPaused === 'true';

    const DWELL_DEBOUNCE_MS = 1300;
    const RECENT_ENTRY_IDS_MAX = 6;

    /** @type {string[]} */
    let recentEntryIdsQueue = [];

    /** Serialize prepend + fetch so out-of-order responses do not scramble DOM order. */
    let recentListMutationChain = Promise.resolve();

    function parseRecentIdsFromInput() {
        if (!recentGuestbookIdsInput) return;
        try {
            const raw = recentGuestbookIdsInput.value.trim();
            if (!raw) {
                recentEntryIdsQueue = [];
                return;
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                recentEntryIdsQueue = [];
                return;
            }
            recentEntryIdsQueue = parsed
                .filter(function (id) {
                    return typeof id === 'string' && id.length > 0;
                })
                .slice(-RECENT_ENTRY_IDS_MAX);
        } catch (_) {
            recentEntryIdsQueue = [];
        }
    }

    function writeRecentIdsToInput() {
        if (!recentGuestbookIdsInput) return;
        recentGuestbookIdsInput.value = JSON.stringify(recentEntryIdsQueue);
    }

    function updateRecentGuestbookEmptyVisibility() {
        if (!recentGuestbookEmptyEl) return;
        const hasQueue = recentEntryIdsQueue.length > 0;
        const hasRows = recentGuestbookListEl && recentGuestbookListEl.children.length > 0;
        recentGuestbookEmptyEl.classList.toggle('d-none', hasQueue || hasRows);
    }

    function trimGuestbookPreviewWords(text, maxWords) {
        const t = typeof text === 'string' ? text.trim() : '';
        if (!t) return '';
        const words = t.split(/\s+/);
        if (words.length <= maxWords) return t;
        return words.slice(0, maxWords).join(' ') + '\u2026';
    }

    function buildRecentGuestbookCard(entryId, entry) {
        const guestbookUrl = '/guestbook/' + encodeURIComponent(entryId);
        const wrap = document.createElement('a');
        wrap.href = guestbookUrl;
        wrap.className =
            'projector-recent-guestbook-item border rounded p-3 bg-body-secondary new-element text-decoration-none text-body d-block';
        wrap.setAttribute('role', 'listitem');
        wrap.dataset.entryId = entryId;

        const head = document.createElement('div');
        head.className = 'd-flex flex-wrap align-items-baseline gap-2 mb-1';

        const authorRow = document.createElement('span');
        authorRow.className = 'd-inline-flex align-items-baseline gap-1 text-break guestbook-author-name';

        const personIcon = document.createElement('i');
        personIcon.className = 'bi bi-person';
        personIcon.setAttribute('aria-hidden', 'true');

        const authorNameSpan = document.createElement('span');
        authorNameSpan.className = 'fw-semibold';

        authorRow.appendChild(personIcon);
        authorRow.appendChild(authorNameSpan);

        const snippetEl = document.createElement('p');
        snippetEl.className = 'small text-body-secondary text-break mb-0 guestbook-content';

        if (entry && typeof entry === 'object') {
            const rawName = typeof entry.displayName === 'string' ? entry.displayName.trim() : '';
            const isAnonymous = rawName.length === 0;
            authorNameSpan.textContent = isAnonymous ? 'Anonymous' : rawName;
            authorRow.classList.toggle('guestbook-author-name--anonymous', isAnonymous);

            const content = typeof entry.content === 'string' ? entry.content : '';
            snippetEl.textContent = trimGuestbookPreviewWords(content.trim(), 15);
        } else {
            authorNameSpan.textContent = 'Guestbook entry';
            authorRow.classList.remove('guestbook-author-name--anonymous');
            snippetEl.className = 'small text-muted text-break mb-0 guestbook-content';
            snippetEl.textContent =
                'Preview is not available for hidden or moderated posts from this endpoint. You can still open the guestbook page.';
        }

        const labelName = authorNameSpan.textContent.trim() || 'Guestbook entry';
        wrap.setAttribute('aria-label', labelName + ' — open guestbook message');

        head.appendChild(authorRow);
        wrap.appendChild(head);
        wrap.appendChild(snippetEl);
        return wrap;
    }

    function fetchProjectorGuestbookEntry(entryId) {
        const url = '/projector/guestbook/' + encodeURIComponent(entryId);
        return fetch(url, { credentials: 'same-origin' }).then(function (res) {
            if (!res.ok) return null;
            return res.json().catch(function () {
                return null;
            });
        });
    }

    function revealNewElement(el) {
        if (!el || !el.classList.contains('new-element')) return;
        window.requestAnimationFrame(function () {
            window.requestAnimationFrame(function () {
                el.classList.remove('new-element');
            });
        });
    }

    /** One-time: rebuild list from hidden input (server snapshot). */
    function hydrateInitialRecentListFromQueue() {
        if (!recentGuestbookListEl) return;
        recentListMutationChain = Promise.resolve();
        while (recentGuestbookListEl.firstChild) {
            recentGuestbookListEl.removeChild(recentGuestbookListEl.firstChild);
        }
        updateRecentGuestbookEmptyVisibility();
        const ids = recentEntryIdsQueue.slice().reverse();
        if (ids.length === 0) return;
        recentListMutationChain = Promise.all(
            ids.map(function (id) {
                return fetchProjectorGuestbookEntry(id).then(function (entry) {
                    return { id: id, entry: entry };
                });
            })
        ).then(function (pairs) {
            if (!recentGuestbookListEl) return;
            pairs.forEach(function (p) {
                const card = buildRecentGuestbookCard(p.id, p.entry);
                recentGuestbookListEl.insertBefore(card, recentGuestbookListEl.firstChild);
            });
            while (recentGuestbookListEl.children.length > RECENT_ENTRY_IDS_MAX) {
                recentGuestbookListEl.removeChild(recentGuestbookListEl.lastChild);
            }
            recentGuestbookListEl.querySelectorAll('.projector-recent-guestbook-item.new-element').forEach(function (el) {
                revealNewElement(el);
            });
            updateRecentGuestbookEmptyVisibility();
        });
    }

    function prependRecentGuestbookCard(entryId) {
        return fetchProjectorGuestbookEntry(entryId).then(function (entry) {
            if (!recentGuestbookListEl) return;
            if (recentEntryIdsQueue.indexOf(entryId) === -1) return;
            const card = buildRecentGuestbookCard(entryId, entry);
            recentGuestbookListEl.insertBefore(card, recentGuestbookListEl.firstChild);
            while (recentGuestbookListEl.children.length > RECENT_ENTRY_IDS_MAX) {
                recentGuestbookListEl.removeChild(recentGuestbookListEl.lastChild);
            }
            revealNewElement(card);
            updateRecentGuestbookEmptyVisibility();
        });
    }

    function appendEntryIdFromStream(entryId) {
        if (typeof entryId !== 'string' || entryId.length === 0) return;
        recentEntryIdsQueue.push(entryId);
        while (recentEntryIdsQueue.length > RECENT_ENTRY_IDS_MAX) {
            recentEntryIdsQueue.shift();
        }
        writeRecentIdsToInput();
        recentListMutationChain = recentListMutationChain.then(function () {
            return prependRecentGuestbookCard(entryId);
        });
    }

    parseRecentIdsFromInput();
    hydrateInitialRecentListFromQueue();

    function syncPauseUi(paused) {
        rotationPaused = Boolean(paused);
        if (!pauseToggle || !pauseIcon || !pauseLabel) return;
        pauseToggle.setAttribute('aria-pressed', rotationPaused ? 'true' : 'false');
        if (rotationPaused) {
            pauseIcon.className = 'bi bi-play-fill';
            pauseLabel.textContent = 'Play rotation';
        } else {
            pauseIcon.className = 'bi bi-pause-fill';
            pauseLabel.textContent = 'Pause rotation';
        }
    }

    syncPauseUi(rotationPaused);

    const projectorStream = new EventSource('/projector/stream');
    projectorStream.addEventListener('count', function (ev) {
        if (!guestbookCountHint || !ev.data) return;
        try {
            var n = JSON.parse(ev.data);
            guestbookCountHint.textContent = n;
        } catch (_) {}
    });
    projectorStream.addEventListener('entry', function (ev) {
        if (!recentGuestbookIdsInput || !recentGuestbookListEl) return;
        if (!ev.data) return;
        try {
            const entryId = JSON.parse(ev.data);
            if (typeof entryId === 'string' && entryId.length > 0) {
                appendEntryIdFromStream(entryId);
            }
        } catch (_) {}
    });

    function showStatus(el, text, isError) {
        if (!el) return;
        el.textContent = text;
        el.classList.toggle('text-danger', Boolean(isError));
        el.classList.toggle('text-muted', !isError && text !== '');
        if (!text) return;
        if (isError) return;
        window.setTimeout(function () {
            if (el.textContent === text) el.textContent = '';
        }, 2000);
    }

    async function postJson(url, body) {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(body),
        });
        const data = await res.json().catch(function () {
            return {};
        });
        if (!res.ok) {
            const msg = typeof data.error === 'string' ? data.error : res.statusText || 'Request failed';
            throw new Error(msg);
        }
        return data;
    }

    function syncMessageSaveButtons() {
        if (!messageTextarea) return;
        const hasText = messageTextarea.value.trim().length > 0;
        const messageSelected = Boolean(messageModeRadio && messageModeRadio.checked);
        if (messageSaveHint) messageSaveHint.classList.toggle('d-none', hasText);
        if (messageBtnSave) messageBtnSave.disabled = !hasText && messageSelected;
        if (messageBtnSaveDisplay) messageBtnSaveDisplay.disabled = !hasText;
        if (messageModeRadio) {
            messageModeRadio.disabled = !hasText;
            if (hasText) messageModeRadio.removeAttribute('aria-describedby');
            else messageModeRadio.setAttribute('aria-describedby', 'projector-message-save-hint');
        }
    }

    if (messageTextarea) {
        messageTextarea.addEventListener('input', syncMessageSaveButtons);
        syncMessageSaveButtons();
    }

    root.querySelectorAll('input[name="projector-darkmode"]').forEach(function (radio) {
        radio.addEventListener('change', async function () {
            if (!radio.checked) return;
            radio.closest('.card').dataset.bsTheme = radio.value;
            const body = { darkMode: radio.value };
            try {
                await postJson(darkModeUrl, body);
                showStatus(darkModeStatus, 'Dark mode updated', false);
            } catch (err) {
                showStatus(darkModeStatus, err.message || 'Could not save dark mode', true);
            }
        });
    });

    const skipBtn = document.getElementById('projector-skip-entry-btn');
    const skipStatus = document.getElementById('projector-skip-entry-status');
    if (skipBtn && skipUrl) {
        skipBtn.addEventListener('click', async function () {
            try {
                await postJson(skipUrl, {});
            } catch (err) {
                showStatus(skipStatus, err.message || 'Could not skip to next entry', true);
            }
        });
    }

    root.querySelectorAll('input[name="projector-mode"]').forEach(function (radio) {
        radio.addEventListener('change', async function () {
            if (!radio.checked) return;
            if (radio.disabled) return;
            const mode = radio.value;
            const body =
                mode === 'message' && messageTextarea
                    ? { mode: 'message', message: messageTextarea.value }
                    : { mode };
            try {
                await postJson(modeUrl, body);
                lastMode = mode;
                showStatus(modeStatus, 'Mode updated', false);
                syncMessageSaveButtons();
            } catch (err) {
                showStatus(modeStatus, err.message || 'Could not save mode', true);
                root.querySelectorAll('input[name="projector-mode"]').forEach(function (r) {
                    r.checked = r.value === lastMode;
                });
                syncMessageSaveButtons();
            }
        });
    });

    function setDwellAria(value) {
        if (!dwellInput) return;
        dwellInput.setAttribute('aria-valuenow', String(value));
    }

    function updateDwellLabel(sec) {
        if (dwellLabel) dwellLabel.textContent = sec + 's';
        setDwellAria(sec);
    }

    let dwellDebounce = null;

    if (pauseToggle) {
        pauseToggle.addEventListener('click', async function () {
            const nextPaused = !rotationPaused;
            try {
                await postJson(pauseUrl, { paused: nextPaused });
                syncPauseUi(nextPaused);
                showStatus(pauseStatus, nextPaused ? 'Rotation paused' : 'Rotation playing', false);
            } catch (err) {
                showStatus(pauseStatus, err.message || 'Could not update pause', true);
            }
        });
    }

    if (dwellInput && dwellLabel) {
        updateDwellLabel(lastSavedDwell);

        dwellInput.addEventListener('input', function () {
            const v = parseInt(dwellInput.value, 10);
            updateDwellLabel(v);
            window.clearTimeout(dwellDebounce);
            dwellDebounce = window.setTimeout(async function () {
                try {
                    await postJson(dwellUrl, { dwellSeconds: v });
                    lastSavedDwell = v;
                    showStatus(dwellStatus, 'Dwell time saved', false);
                } catch (err) {
                    showStatus(dwellStatus, err.message || 'Could not save dwell time', true);
                    dwellInput.value = String(lastSavedDwell);
                    updateDwellLabel(lastSavedDwell);
                }
            }, DWELL_DEBOUNCE_MS);
        });
    }
})();
