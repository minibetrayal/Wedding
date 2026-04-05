(function() {
    function setConnStatus(status) {
        document.querySelector('.projector-connected').dataset.amConn = status;
    }

    function setMode(mode) {
        document.querySelectorAll('.projector-section').forEach(section => {
            section.classList.toggle('d-none', section.dataset.amMode !== mode);
            section.classList.toggle('d-flex', section.dataset.amMode === mode);
        });
    }

    function setMessage(message) {
        document.querySelector('.projector-message').textContent = message || '';
    }

    function setDarkMode(darkMode) {
        document.body.dataset.bsTheme = darkMode ? 'dark' : 'light';
    }

    async function setEntry(entryId) {
        const wrap = document.querySelector('.projector-guestbook-wrap');
        if (!wrap) return;
        const emptyEl = wrap.querySelector('.projector-guestbook-empty');
        const cardEl = wrap.querySelector('.projector-guestbook-card');
        const isEmpty = !entryId;
        if (emptyEl) emptyEl.classList.toggle('d-none', !isEmpty);
        if (cardEl) cardEl.classList.toggle('d-none', isEmpty);

        const authorRow = wrap.querySelector('.projector-guestbook-author-name');
        const authorEl = wrap.querySelector('.projector-guestbook-author');
        const timeEl = wrap.querySelector('.projector-guestbook-time');
        const textEl = wrap.querySelector('.projector-guestbook-content');
        const truncatedNote = wrap.querySelector('.projector-guestbook-truncated-note');
        const photoWrap = wrap.querySelector('.projector-guestbook-photo-wrap');
        const photoEl = wrap.querySelector('.projector-guestbook-photo');
        const quickLink = document.querySelector('.projector-footer .projector-guestbook-url');

        function clearPhoto() {
            photoEl.removeAttribute('src');
            photoWrap.classList.add('d-none');
        }

        function noContent() {
            wrap.classList.remove('projector-guestbook-wrap--photo-only');
            authorRow.classList.remove('projector-guestbook-author--anonymous');
            authorEl.textContent = '';
            timeEl.textContent = '';
            timeEl.removeAttribute('datetime');
            textEl.textContent = 'Could not load this guestbook entry.';
            textEl.classList.remove('d-none');
            truncatedNote.classList.add('d-none');
            clearPhoto();
        }

        if (!entryId) {
            return noContent();
        }

        quickLink.href = `/guestbook/${entryId}`;

        const entryInfo = await fetch(`/projector/guestbook/${entryId}`)
            .then(response => {
                if (response.ok) return response.json();
                else throw new Error('Failed to fetch guestbook entry');
            });

        if (!entryInfo || entryInfo.error) {
            return noContent();
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

        const maxChars = hasPhoto ? 120 : 240;

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
            photoEl.alt = hasDisplayName ? 'Guestbook photo from ' + String(entryInfo.displayName).trim() : 'Guestbook photo';
        } else {
            clearPhoto();
        }

        wrap.classList.toggle('projector-guestbook-wrap--photo-only', hasPhoto && fullText.trim().length === 0);
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

    source.addEventListener('mode', function(event) {
        setMode(JSON.parse(event.data));
    });

    source.addEventListener('message', function(event) {
        setMessage(JSON.parse(event.data));
    });

    source.addEventListener('darkMode', function(event) {
        setDarkMode(JSON.parse(event.data));
    });

    source.addEventListener('entry', function(event) {
        if (event.data) setEntry(JSON.parse(event.data));
        else setEntry();
    });
})();