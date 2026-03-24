(function () {
    'use strict';

    var container = document.getElementById('ferry-rows');
    var template = document.getElementById('ferry-row-template');
    var addBtn = document.getElementById('add-ferry-row');
    if (!container || !template || !addBtn) return;

    function nextIndex() {
        return container.querySelectorAll('.ferry-row').length;
    }

    function wireRow(el, index) {
        el.querySelectorAll('[name]').forEach(function (input) {
            var n = input.getAttribute('name');
            if (n && n.indexOf('__i__') !== -1) {
                input.setAttribute('name', n.replace(/__i__/g, String(index)));
            }
        });
        el.setAttribute('data-row-index', String(index));
        var dir = el.querySelector('select[aria-label]');
        if (dir) {
            dir.setAttribute('aria-label', 'Service ' + (index + 1) + ' direction');
        }
    }

    function reindex() {
        var rows = container.querySelectorAll('.ferry-row');
        rows.forEach(function (row, i) {
            row.querySelectorAll('[name]').forEach(function (input) {
                var name = input.getAttribute('name');
                if (!name || name.indexOf('services[') !== 0) return;
                input.setAttribute('name', name.replace(/^services\[\d+\]/, 'services[' + i + ']'));
            });
            row.setAttribute('data-row-index', String(i));
            var dir = row.querySelector('select[aria-label]');
            if (dir) {
                dir.setAttribute('aria-label', 'Service ' + (i + 1) + ' direction');
            }
        });
    }

    container.addEventListener('click', function (e) {
        var btn = e.target.closest('.remove-ferry-row');
        if (!btn || !container.contains(btn)) return;
        e.preventDefault();
        var row = btn.closest('.ferry-row');
        if (!row || !container.contains(row)) return;
        row.remove();
        reindex();
    });

    addBtn.addEventListener('click', function () {
        var idx = nextIndex();
        var html = template.innerHTML.replace(/__i__/g, String(idx));
        var wrap = document.createElement('div');
        wrap.innerHTML = html.trim();
        var row = wrap.firstElementChild;
        if (!row) return;
        wireRow(row, idx);
        container.appendChild(row);
    });
})();
