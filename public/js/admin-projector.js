(function () {
    const root = document.getElementById('projector-admin-settings');
    if (!root) return;

    const modeUrl = root.dataset.modeUrl;
    const dwellUrl = root.dataset.dwellUrl;
    const pauseUrl = root.dataset.pausedUrl;
    if (!modeUrl || !dwellUrl || !pauseUrl) return;

    let lastMode = root.dataset.initialMode || 'home';
    let lastSavedDwell = parseInt(root.dataset.initialDwellSec || '30', 10);

    const modeStatus = document.getElementById('projector-mode-status');
    const messageModeRadio = document.getElementById('mode-message');
    const messageTextarea = document.getElementById('projector-message');
    const messageSaveHint = document.getElementById('projector-message-save-hint');
    const messageBtnSave = document.getElementById('projector-message-btn-save');
    const messageBtnSaveDisplay = document.getElementById('projector-message-btn-save-display');

    const dwellInput = document.getElementById('projector-dwell-slider');
    const dwellLabel = document.getElementById('projector-dwell-label');
    const dwellStatus = document.getElementById('projector-dwell-status');
    const guestbookCountHint = document.getElementById('projector-guestbook-count-hint');
    const pauseToggle = document.getElementById('projector-pause-toggle');
    const pauseIcon = document.getElementById('projector-pause-icon');
    const pauseLabel = document.getElementById('projector-pause-label');
    const pauseStatus = document.getElementById('projector-pause-status');

    let rotationPaused = root.dataset.initialPaused === 'true';

    const DWELL_DEBOUNCE_MS = 1300;

    function setGuestbookEligibleCount(n) {
        if (!guestbookCountHint) return;
        const count = Math.max(0, Math.floor(Number(n) || 0));
        guestbookCountHint.textContent =
            count +
            ' eligible post' +
            (count === 1 ? '' : 's') +
            ' (visible, not moderated).';
    }

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
    projectorStream.addEventListener('state', function (ev) {
        try {
            const state = JSON.parse(ev.data);
            const ids = Array.isArray(state.entryIds) ? state.entryIds : [];
            setGuestbookEligibleCount(ids.length);
            if (typeof state.paused === 'boolean') {
                syncPauseUi(state.paused);
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
