(function () {
    document.querySelectorAll('form.validation-form[novalidate]').forEach(function(form) {
        form.addEventListener('submit', function(event) {
            form.classList.add('was-validated');

            const okay = [
                () => form.checkValidity(),
                ...(form.customValidationFunctions || [])
            ].map(fn => fn()).every(Boolean);

            if (!okay) {
                event.preventDefault();
                event.stopPropagation();

                const first = form.querySelector('[data-invalid-for][style*="display: block"], .is-invalid, :invalid');
                if (first && first.scrollIntoView) {
                    first.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }
            }
        });
    });
    document.addEventListener('keydown', function(e) {
        if (e.key !== 'Enter' || e.defaultPrevented) return;
        const target = e.target;
        if (!target || !target.tagName) return;
        if (!target.closest('form.validation-form[novalidate]')?.classList.contains('suppress-enter-submit')) return;
        const tag = target.tagName.toUpperCase();
        if (tag !== 'SELECT' && tag !== 'INPUT') return;
        if (tag === 'INPUT') {
            const t = (target.type || '').toLowerCase();
            if (
                t === 'submit' ||
                t === 'button' ||
                t === 'image' ||
                t === 'checkbox' ||
                t === 'radio' ||
                t === 'file' ||
                t === 'reset'
            ) {
                return;
            }
        }
        e.preventDefault();
    })
})()