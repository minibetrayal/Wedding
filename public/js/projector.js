(function () {
    const guestbookEntries = {};

    async function getGuestbookInfo(entryId) {
        return await fetch(`/projector/guestbook/${entryId}`)
            .then(response => response.json());
    }

    let previousGuestbookId = null;
    function getRandomGuestbook() {
        const state = JSON.parse(document.querySelector('.projector-state').textContent);
        const entryIds = state.entryIds || [];
        if (entryIds.length === 0) {
            return null;
        }
        const weights = entryIds.map(entry => 1 / (guestbookEntries[entry] || 1));
        const total = weights.reduce((a, b) => a + b, 0);
        let nextGuestbookId = previousGuestbookId;
        while (entryIds.length > 1 && previousGuestbookId === nextGuestbookId) {
            let r = Math.random() * total;
            for (let i = 0; i < entryIds.length; i++) {
              r -= weights[i];
              if (r <= 0) {
                nextGuestbookId = entryIds[i];
                break;
              }
            }
        }
        if (!nextGuestbookId) {
            if (entryIds.length > 0) {
                nextGuestbookId = entryIds[0];
            } else {
                return null;
            }
        }
        previousGuestbookId = nextGuestbookId;
        if (Object.keys(guestbookEntries).includes(nextGuestbookId)) {
            guestbookEntries[nextGuestbookId]++;
        } else {
            guestbookEntries[nextGuestbookId] = 2;
        }
        return nextGuestbookId;
    }

    function syncGuestbookEmptyState(entryIds) {
        const ids = Array.isArray(entryIds) ? entryIds : [];
        const wrap = document.querySelector('.projector-guestbook-wrap');
        if (!wrap) return;
        const emptyEl = wrap.querySelector('.projector-guestbook-empty');
        const cardEl = wrap.querySelector('.projector-guestbook-card');
        const isEmpty = ids.length === 0;
        if (emptyEl) emptyEl.classList.toggle('d-none', !isEmpty);
        if (cardEl) cardEl.classList.toggle('d-none', isEmpty);
    }

    let previousGuestbookTime;
    let changeGuestbookTimeout = null;
    let lastPaused = false;

    function setGuestbookMessage(entryInfo) {
        const wrap = document.querySelector('.projector-guestbook-wrap');
        if (!wrap) return;

        const authorRow = wrap.querySelector('.projector-guestbook-author-name');
        const authorEl = wrap.querySelector('.projector-guestbook-author');
        const timeEl = wrap.querySelector('.projector-guestbook-time');
        const textEl = wrap.querySelector('.projector-guestbook-content');
        const truncatedNote = wrap.querySelector('.projector-guestbook-truncated-note');
        const photoWrap = wrap.querySelector('.projector-guestbook-photo-wrap');
        const photoEl = wrap.querySelector('.projector-guestbook-photo');

        const previewMaxChars = 240;

        function clearPhoto() {
            photoEl.removeAttribute('src');
            photoWrap.classList.add('d-none');
        }

        if (!entryInfo || entryInfo.error) {
            wrap.classList.remove('projector-guestbook-wrap--photo-only');
            authorRow.classList.remove('projector-guestbook-author--anonymous');
            authorEl.textContent = '';
            timeEl.textContent = '';
            timeEl.removeAttribute('datetime');
            textEl.textContent = 'Could not load this guestbook entry.';
            textEl.classList.remove('d-none');
            truncatedNote.classList.add('d-none');
            clearPhoto();
            return;
        }

        const hasDisplayName = Boolean(entryInfo.displayName && String(entryInfo.displayName).trim());
        authorEl.textContent = hasDisplayName ? String(entryInfo.displayName).trim() : 'Anonymous';
        authorRow.classList.toggle('projector-guestbook-author--anonymous', !hasDisplayName);

        const created = entryInfo.created ? new Date(entryInfo.created) : null;
        if (created && !Number.isNaN(created.getTime())) {
            timeEl.textContent = created.toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' });
            timeEl.setAttribute('datetime', created.toISOString());
        } else {
            timeEl.textContent = '';
            timeEl.removeAttribute('datetime');
        }
        const hasPhoto = Boolean(entryInfo.photo && entryInfo.photo.id);

        const maxChars = hasPhoto ? previewMaxChars / 2 : previewMaxChars;

        const fullText = typeof entryInfo.content === 'string' ? entryInfo.content : '';
        const isTruncated = fullText.length > maxChars;
        const previewText = isTruncated ? fullText.slice(0, maxChars).trimEnd() + '\u2026' : fullText;

        if (fullText.length > 0) {
            textEl.textContent = previewText;
            textEl.classList.remove('d-none');
        } else {
            textEl.textContent = '';
            textEl.classList.add('d-none');
        }

        truncatedNote.classList.toggle('d-none', !(fullText.length > 0 && isTruncated));

        if (hasPhoto) {
            photoWrap.classList.remove('d-none');
            photoEl.src = '/photos/' + entryInfo.photo.id;
            photoEl.alt = hasDisplayName
                ? 'Guestbook photo from ' + String(entryInfo.displayName).trim()
                : 'Guestbook photo';
        } else {
            clearPhoto();
        }

        wrap.classList.toggle(
            'projector-guestbook-wrap--photo-only',
            hasPhoto && fullText.trim().length === 0
        );
    }

    async function changeGuestbook() {
        clearTimeout(changeGuestbookTimeout);
        const state = JSON.parse(document.querySelector('.projector-state').textContent);
        const entryIds = state.entryIds || [];
        syncGuestbookEmptyState(entryIds);

        if (entryIds.length === 0) {
            changeGuestbookTimeout = null;
            return;
        }

        previousGuestbookTime = Date.now();
        const entryId = getRandomGuestbook();
        const entryInfo = await getGuestbookInfo(entryId);
        setGuestbookMessage(entryInfo);

        const dwellMs = state.dwellMs;
        if (state.paused) {
            changeGuestbookTimeout = null;
            return;
        }
        changeGuestbookTimeout = setTimeout(changeGuestbook, dwellMs);
    }

    function applyState(state) {
        document.body.dataset.bsTheme = state.darkMode ? 'dark' : 'light';

        document.querySelectorAll('.projector-section').forEach(section => {
            section.classList.toggle('d-none', section.dataset.amMode !== state.mode);
            section.classList.toggle('d-flex', section.dataset.amMode === state.mode);
        });

        document.querySelector('.projector-message').textContent = state.message || '';
        document.querySelector('.projector-state').textContent = JSON.stringify(state).replace(/</g, '\\u003c');
        const entryIdsForWeights = state.entryIds || [];
        syncGuestbookEmptyState(entryIdsForWeights);
        Array.from(Object.keys(guestbookEntries)).forEach(entryId => {
            if (!entryIdsForWeights.includes(entryId)) {
                delete guestbookEntries[entryId];
            }
        });

        clearTimeout(changeGuestbookTimeout);
        changeGuestbookTimeout = null;

        const resumeFromPaused = state.mode === 'guestbook' && !state.paused && lastPaused;
        lastPaused = Boolean(state.paused);

        if (state.mode !== 'guestbook') {
            previousGuestbookTime = undefined;
            return;
        }

        const entryIds = state.entryIds || [];
        if (entryIds.length === 0) {
            return;
        }

        if (state.paused) {
            if (!previousGuestbookTime) {
                changeGuestbook();
            }
            return;
        }

        if (resumeFromPaused) {
            changeGuestbookTimeout = setTimeout(changeGuestbook, state.dwellMs);
            return;
        }

        if (!previousGuestbookTime || Date.now() - previousGuestbookTime >= state.dwellMs) {
            changeGuestbook();
        } else {
            const elapsed = Date.now() - previousGuestbookTime;
            changeGuestbookTimeout = setTimeout(changeGuestbook, Math.max(0, state.dwellMs - elapsed));
        }
    }

    applyState(JSON.parse(document.querySelector('.projector-state').textContent));

    function setConnStatus(status) {
        document.querySelector('.projector-connected').dataset.amConn = status;
    }

    setConnStatus('connecting');

    const source = new EventSource('/projector/stream');

    source.addEventListener('open', function () {
        setConnStatus('connected');
    });

    source.addEventListener('error', function () {
        if (source.readyState === EventSource.CLOSED) {
            setConnStatus('disconnected');
        } else {
            setConnStatus('connecting');
        }
    });

    source.addEventListener('state', function (ev) {
        try {
            applyState(JSON.parse(ev.data));
        } catch {}
    });
})();
