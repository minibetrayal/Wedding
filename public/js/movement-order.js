(function () {
    function listParent(container) {
        var p = container.parentElement;
        return p || null;
    }

    function movementSiblings(parent) {
        return Array.prototype.slice.call(parent.querySelectorAll(':scope > .movement-container'));
    }

    function reorderDom(container, direction) {
        var parent = listParent(container);
        if (!parent) return false;
        var items = movementSiblings(parent);
        var i = items.indexOf(container);
        if (i === -1) return false;
        if (direction === 'up' && i > 0) {
            parent.insertBefore(container, items[i - 1]);
            return true;
        }
        if (direction === 'down' && i < items.length - 1) {
            parent.insertBefore(items[i + 1], container);
            return true;
        }
        return false;
    }

    function refreshMoveButtons(parent) {
        var items = parent.querySelectorAll(':scope > .movement-container');
        for (var j = 0; j < items.length; j++) {
            var el = items[j];
            var up = el.querySelector('button[data-move-direction="up"]');
            var down = el.querySelector('button[data-move-direction="down"]');
            if (up) {
                up.hidden = j === 0;
                up.disabled = j === 0;
            }
            if (down) {
                down.hidden = j === items.length - 1;
                down.disabled = j === items.length - 1;
            }
        }
    }

    document.addEventListener('click', function (e) {
        var btn = e.target.closest('button[data-move-url][data-move-direction]');
        if (!btn || btn.disabled) return;
        var container = btn.closest('.movement-container');
        if (!container) return;
        var url = btn.getAttribute('data-move-url');
        var direction = btn.getAttribute('data-move-direction');
        if (!url || (direction !== 'up' && direction !== 'down')) return;

        e.preventDefault();
        var parent = listParent(container);
        if (!parent) return;

        btn.disabled = true;
        var pair = parent.querySelectorAll('button[data-move-url][data-move-direction]');
        for (var p = 0; p < pair.length; p++) pair[p].disabled = true;

        fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'X-Requested-With': 'fetch', Accept: 'application/json' },
        })
            .then(function (res) {
                return res.json().then(
                    function (body) {
                        return { res: res, body: body };
                    },
                    function () {
                        return { res: res, body: null };
                    },
                );
            })
            .then(function (out) {
                if (!out.res.ok || !out.body || !out.body.ok) {
                    var msg =
                        out.body && out.body.error
                            ? out.body.error
                            : 'Could not move item. Please refresh and try again.';
                    throw new Error(msg);
                }
                if (!reorderDom(container, direction)) {
                    throw new Error('Order could not be updated on the page. Please refresh.');
                }
            })
            .catch(function (err) {
                window.alert(err.message || 'Something went wrong.');
            })
            .finally(function () {
                refreshMoveButtons(parent);
            });
    });
})();
