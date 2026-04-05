(function () {
    const btn = document.getElementById('guestbook-feature-btn');
    const status = document.getElementById('guestbook-feature-status');
    if (!btn || !status) return;

    const url = btn.dataset.featureUrl;
    if (!url) return;

    const OK_TEXT = 'Shown on projector.';
    const CLEAR_MS = 3500;

    function showStatus(text, isError) {
        status.textContent = text;
        status.classList.toggle('text-danger', Boolean(isError));
        status.classList.toggle('text-muted', !isError);
    }

    btn.addEventListener('click', function () {
        btn.disabled = true;
        showStatus('', false);
        fetch(url, {
            method: 'POST',
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        })
            .then(function (res) {
                const ct = res.headers.get('content-type') || '';
                if (!ct.includes('application/json')) {
                    showStatus(
                        res.ok
                            ? 'Unexpected response from server.'
                            : 'Could not show this entry on the projector.',
                        true
                    );
                    return null;
                }
                return res.json().then(function (data) {
                    return { res: res, data: data };
                });
            })
            .then(function (parsed) {
                if (!parsed) return;
                const res = parsed.res;
                const data = parsed.data;
                if (!res.ok || !data || !data.ok) {
                    const err =
                        data && typeof data.error === 'string' && data.error.length > 0
                            ? data.error
                            : 'Could not show this entry on the projector.';
                    showStatus(err, true);
                    return;
                }
                showStatus(OK_TEXT, false);
                window.setTimeout(function () {
                    if (status.textContent === OK_TEXT) {
                        status.textContent = '';
                        status.classList.remove('text-danger');
                        status.classList.add('text-muted');
                    }
                }, CLEAR_MS);
            })
            .catch(function () {
                showStatus('Network error. Try again.', true);
            })
            .finally(function () {
                btn.disabled = false;
            });
    });
})();
