(function () {
    function getState() {
        return JSON.parse(document.querySelector('.projector-state').textContent);
    }

    function setState(state) {
        document.querySelector('.projector-state').textContent = JSON.stringify(state).replace(/</g, '\\u003c');
    }

    function applyState(state) {
        document.querySelectorAll('.projector-section').forEach(section => {
            section.classList.toggle('d-none', section.dataset.amMode !== state.mode);
            section.classList.toggle('d-flex', section.dataset.amMode === state.mode);
        });

        document.querySelector('.projector-message').textContent = state.message || '';

        setState(state);
    }

    applyState(getState());

    const source = new EventSource('/projector/stream');
    source.addEventListener('state', function (ev) {
        try {
            applyState(JSON.parse(ev.data));
        } catch {}
    });
})();
