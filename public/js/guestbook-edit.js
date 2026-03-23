document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('guestbook-edit-form');
    var content = document.getElementById('guestbook-content');
    var photo = document.getElementById('guestbook-photo');
    var feedback = document.getElementById('guestbook-body-feedback');
    if (!form || !content || !photo) return;

    function clearBodyInvalid() {
        content.classList.remove('is-invalid');
        photo.classList.remove('is-invalid');
        document.querySelectorAll('.guestbook-body-feedback').forEach(function (feedback) {
            feedback.classList.add('d-none');
            feedback.style.display = '';
        })
    }

    function hasExistingPhoto() {
        return form.getAttribute('data-existing-photo') === 'true';
    }

    form.customValidationFunctions = form.customValidationFunctions || [];
    form.customValidationFunctions.push(function () {
        var text = (content.value || '').trim();
        var hasFile = photo.files && photo.files.length > 0;
        var ok = Boolean(text || hasFile || hasExistingPhoto());
        if (ok) {
            clearBodyInvalid();
            return true;
        }
        content.classList.add('is-invalid');
        photo.classList.add('is-invalid');
        document.querySelectorAll('.guestbook-body-feedback').forEach(function (feedback) {
            feedback.classList.remove('d-none');
            feedback.style.display = 'block';
        })
        return false;
    });

    content.addEventListener('input', clearBodyInvalid);
    photo.addEventListener('change', clearBodyInvalid);

    
    var deleteForm = document.getElementById('delete-guestbook-form');
    var deleteModalConfirm = document.getElementById('delete-guestbook-modal-confirm');
    var deleteModalEl = document.getElementById('delete-guestbook-modal');
    if (!deleteForm || !deleteModalConfirm || !deleteModalEl || typeof bootstrap === 'undefined') return;
    var deleteModalInstance = bootstrap.Modal.getOrCreateInstance(deleteModalEl);
    deleteModalConfirm.addEventListener('click', function () {
        deleteModalInstance.hide();
        deleteForm.submit();
    });
});