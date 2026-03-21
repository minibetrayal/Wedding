document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('form[novalidate]').forEach(function(form) {
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
});