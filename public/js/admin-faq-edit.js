(function () {
    var deleteForm = document.getElementById('delete-faq-form');
    var deleteModalConfirm = document.getElementById('delete-faq-modal-confirm');
    var deleteModalEl = document.getElementById('delete-faq-modal');
    if (deleteForm && deleteModalConfirm && deleteModalEl && typeof bootstrap !== 'undefined') {
        var deleteModalInstance = bootstrap.Modal.getOrCreateInstance(deleteModalEl);
        deleteModalConfirm.addEventListener('click', function () {
            deleteModalInstance.hide();
            deleteForm.submit();
        });
    }
})();
