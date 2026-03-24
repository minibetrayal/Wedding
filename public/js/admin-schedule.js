(function () {
    'use strict';

    var MIN_ROWS = 4;

    var container = document.getElementById('schedule-rows');
    var template = document.getElementById('schedule-row-template');
    var addBtn = document.getElementById('add-schedule-row');
    var sortBtn = document.getElementById('sort-schedule-rows');
    var form = document.getElementById('schedule-form');
    if (!container || !template || !addBtn || !sortBtn || !form) return;

    function rowCount() {
        return container.querySelectorAll('.schedule-row').length;
    }

    function updateRemoveButtons() {
        var n = rowCount();
        var disableRemove = n <= MIN_ROWS;
        container.querySelectorAll('.remove-schedule-row').forEach(function (btn) {
            btn.disabled = disableRemove;
            btn.classList.toggle('disabled', disableRemove);
            btn.setAttribute('aria-disabled', disableRemove ? 'true' : 'false');
        });
    }

    function wireRow(el, index) {
        el.querySelectorAll('[name]').forEach(function (input) {
            var n = input.getAttribute('name');
            if (n && n.indexOf('__i__') !== -1) {
                input.setAttribute('name', n.replace(/__i__/g, String(index)));
            }
        });
        el.setAttribute('data-row-index', String(index));
        var sel = el.querySelector('select[aria-label]');
        if (sel && sel.getAttribute('aria-label') === 'New event role') {
            sel.setAttribute('aria-label', 'Event ' + (index + 1) + ' role');
        }
    }

    /** Minutes from midnight; NaN if missing/invalid (sorts last). */
    function timeValueToMinutes(value) {
        if (!value || typeof value !== 'string') return NaN;
        var parts = value.trim().split(':');
        if (parts.length < 2) return NaN;
        var h = parseInt(parts[0], 10);
        var m = parseInt(parts[1], 10);
        if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
        return h * 60 + m;
    }

    function reindex() {
        var rows = container.querySelectorAll('.schedule-row');
        rows.forEach(function (row, i) {
            row.querySelectorAll('[name]').forEach(function (input) {
                var name = input.getAttribute('name');
                if (!name || name.indexOf('events[') !== 0) return;
                input.setAttribute('name', name.replace(/^events\[\d+\]/, 'events[' + i + ']'));
            });
            row.setAttribute('data-row-index', String(i));
            var timeInput = row.querySelector('input[type="time"]');
            if (timeInput) {
                var tid = 'schedule-time-' + i;
                timeInput.id = tid;
                var timeLabel = row.querySelector('label[for^="schedule-time-"]');
                if (timeLabel) {
                    timeLabel.setAttribute('for', tid);
                }
            }
            var sel = row.querySelector('select[name*="[role]"]');
            if (sel) {
                sel.setAttribute('aria-label', 'Event ' + (i + 1) + ' role');
            }
        });
        updateRemoveButtons();
    }

    container.addEventListener('click', function (e) {
        var btn = e.target.closest('.remove-schedule-row');
        if (!btn || !container.contains(btn) || btn.disabled) return;
        e.preventDefault();
        if (rowCount() <= MIN_ROWS) return;
        var row = btn.closest('.schedule-row');
        if (!row || !container.contains(row)) return;
        row.remove();
        reindex();
    });

    addBtn.addEventListener('click', function () {
        var idx = rowCount();
        var html = template.innerHTML.replace(/__i__/g, String(idx));
        var wrap = document.createElement('div');
        wrap.innerHTML = html.trim();
        var row = wrap.firstElementChild;
        if (!row) return;
        wireRow(row, idx);
        container.appendChild(row);
        updateRemoveButtons();
    });

    sortBtn.addEventListener('click', function () {
        var rows = Array.prototype.slice.call(container.querySelectorAll('.schedule-row'));
        if (rows.length < 2) return;

        var decorated = rows.map(function (row, index) {
            var input = row.querySelector('input[type="time"]');
            var min = input ? timeValueToMinutes(input.value) : NaN;
            var sortKey = Number.isFinite(min) ? min : 99999;
            return { row: row, index: index, sortKey: sortKey };
        });

        decorated.sort(function (a, b) {
            if (a.sortKey !== b.sortKey) {
                return a.sortKey - b.sortKey;
            }
            return a.index - b.index;
        });

        var frag = document.createDocumentFragment();
        decorated.forEach(function (d) {
            frag.appendChild(d.row);
        });
        container.appendChild(frag);
        reindex();
    });

    form.addEventListener('submit', function () {
        reindex();
    });

    updateRemoveButtons();
})();
