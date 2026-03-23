(function () {
    const root = document.getElementById('projector-admin-settings');
    if (!root) return;

    const modeUrl = root.dataset.modeUrl;
    const dwellUrl = root.dataset.dwellUrl;
    if (!modeUrl || !dwellUrl) return;

    let lastMode = root.dataset.initialMode || 'home';
    let lastSavedDwell = parseInt(root.dataset.initialDwellSec || '30', 10);

    const modeStatus = document.getElementById('projector-mode-status');
    const dwellInput = document.getElementById('projector-dwell-slider');
    const dwellLabel = document.getElementById('projector-dwell-label');
    const dwellStatus = document.getElementById('projector-dwell-status');

    const DWELL_DEBOUNCE_MS = 1300;

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

    root.querySelectorAll('input[name="projector-mode"]').forEach(function (radio) {
        radio.addEventListener('change', async function () {
            if (!radio.checked) return;
            const mode = radio.value;
            try {
                await postJson(modeUrl, { mode });
                lastMode = mode;
                showStatus(modeStatus, 'Mode updated', false);
            } catch (err) {
                showStatus(modeStatus, err.message || 'Could not save mode', true);
                root.querySelectorAll('input[name="projector-mode"]').forEach(function (r) {
                    r.checked = r.value === lastMode;
                });
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
