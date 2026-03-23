
(function () {
    document.querySelectorAll('.message-counter').forEach(function (counter) {
        const ta = counter.querySelector('textarea');
        if (!ta || !ta.maxLength) return;
        const warnAt = parseInt(counter.dataset.tcWarnAt, 10);
        const dangerAt = parseInt(counter.dataset.tcDangerAt, 10);
        const hint = counter.querySelector('.message-counter-hint');
        const countEl = counter.querySelector('.message-counter-count');

        function paint(n) {
            countEl.textContent = String(n);
            hint.classList.toggle('opacity-25', n <= warnAt);
            hint.classList.toggle('text-body-tertiary', n <= dangerAt);
            hint.classList.toggle('text-danger', n > dangerAt);
        }

        function sync() {
            paint(Math.min(ta.value.length, ta.maxLength));
        }

        sync();
        ta.addEventListener('input', sync);
    });
})();