(function () {
    const EMPTY_MESSAGE =
        'No message text yet — set one in admin (Projector).';

    function readInitialState() {
        const el = document.getElementById('projector-initial');
        if (!el || !el.textContent) return null;
        try {
            return JSON.parse(el.textContent.trim());
        } catch {
            return null;
        }
    }

    function applyState(state) {
        if (!state || typeof state.mode !== 'string') return;

        const root = document.getElementById('projector-root');
        if (root) {
            root.dataset.mode = state.mode;
        }

        const panelMode = state.mode === 'guestbook' ? 'home' : state.mode;

        ['home', 'message'].forEach(function (m) {
            const panel = document.getElementById('projector-panel-' + m);
            if (!panel) return;
            const active = panelMode === m;
            panel.classList.toggle('is-active', active);
            panel.setAttribute('aria-hidden', active ? 'false' : 'true');
        });

        const msgBody = document.getElementById('projector-message-body');
        if (msgBody) {
            const t = typeof state.message === 'string' ? state.message.trim() : '';
            if (t) {
                msgBody.textContent = t;
                msgBody.classList.remove('projector-message-empty');
            } else {
                msgBody.textContent = EMPTY_MESSAGE;
                msgBody.classList.add('projector-message-empty');
            }
        }

        const boot = document.getElementById('projector-initial');
        if (boot) {
            boot.textContent = JSON.stringify({
                mode: state.mode,
                message: typeof state.message === 'string' ? state.message : '',
                dwellMs: typeof state.dwellMs === 'number' ? state.dwellMs : 30000,
            }).replace(/</g, '\\u003c');
        }
    }

    const initial = readInitialState();
    if (initial) {
        applyState(initial);
    }

    try {
        const source = new EventSource('/projector/stream');
        source.addEventListener('state', function (ev) {
            try {
                const next = JSON.parse(ev.data);
                applyState(next);
            } catch {
                /* ignore malformed */
            }
        });
        source.addEventListener('error', function () {
            /* EventSource reconnects automatically */
        });
    } catch {
        /* EventSource unsupported */
    }
})();
