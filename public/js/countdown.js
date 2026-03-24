(function () {
    function startOfDay(d) {
        const x = new Date(d);
        x.setHours(0, 0, 0, 0);
        return x.getTime();
    }

    function formatRemaining(el) {
        const target = new Date(el.dataset.countdownTarget);
        if (Number.isNaN(target.getTime())) return;

        const titleEl = el.querySelector('.countdown-title');
        const labelEl = el.querySelector('.countdown-label');
        const containerEl = el.querySelector('.countdown-container');
        if (!titleEl || !labelEl || !containerEl) return;

        const now = new Date();
        const nowDay = startOfDay(now);
        const targetDay = startOfDay(target);

        if (nowDay < targetDay) {
            titleEl.textContent = "We're Getting Married!";
        } else if (nowDay === targetDay) {
            titleEl.textContent = "Today's the day!";
        } else {
            titleEl.textContent = 'We got married!';
        }

        if (now < target) {
            labelEl.textContent = 'Until the ceremony';

            const diff = target.getTime() - now.getTime();
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            const h = String(hours).padStart(2, '0');
            const m = String(minutes).padStart(2, '0');
            const s = String(seconds).padStart(2, '0');

            let text;
            if (days >= 2) {
                text = `${days} days`;
            } else if (days === 1) {
                text = `${days} day ${h}:${m}:${s}`;
            } else {
                text = `${h}:${m}:${s}`;
            }

            containerEl.textContent = text;
        } else {
            labelEl.textContent = '';
            containerEl.textContent = '';
        }
    }

    function formatAllRemaining() {
        document.querySelectorAll('[data-countdown-target]').forEach(formatRemaining);
    }

    formatAllRemaining();
    setInterval(formatAllRemaining, 1000);
})();
