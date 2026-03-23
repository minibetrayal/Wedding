
(function () {
    var list = document.querySelector('[data-invite-list]');
    if (!list) return;
    var rows = list.querySelectorAll('[data-invite-filters]');
    var buttons = document.querySelectorAll('[data-invite-filter]');
    var emptyMsg = document.getElementById('invite-filter-empty');
    var active = null;

    function applyFilter(key) {
        active = key;
        var visible = 0;
        rows.forEach(function (row) {
            var raw = row.getAttribute('data-invite-filters') || '';
            var tags = raw.split(/\s+/).filter(Boolean);
            var show = !key || tags.indexOf(key) !== -1;
            row.classList.toggle('d-none', !show);
            if (show) visible++;
        });
        if (emptyMsg) {
            emptyMsg.classList.toggle('d-none', !(key && visible === 0));
        }
        buttons.forEach(function (btn) {
            var k = btn.getAttribute('data-invite-filter');
            var isOn = k === key;
            btn.classList.toggle('is-active', isOn);
            btn.setAttribute('aria-pressed', isOn ? 'true' : 'false');
        });
    }

    buttons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var k = btn.getAttribute('data-invite-filter');
            applyFilter(active === k ? null : k);
        });
    });
})();