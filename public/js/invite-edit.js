(function () {
    var formId = 'invite-edit-form';
    var form = document.getElementById(formId);

    if (form) {
        var carpoolRequest = document.getElementById('invite-carpool-requested');
        var carpoolSpots = document.getElementById('invite-carpool-spots');
        var carpoolSpotsHint = document.getElementById('invite-carpool-spots-hint');
        var carpoolSpotsFormText = document.getElementById('invite-carpool-spots-form-text');
        var carpoolSpotsBeforeRequest = null;
        function syncCarpoolSpotsOffered() {
            if (!carpoolRequest || !carpoolSpots) return;
            if (carpoolRequest.checked) {
                if (!carpoolSpots.readOnly) {
                    carpoolSpotsBeforeRequest = carpoolSpots.value;
                }
                carpoolSpots.value = '0';
                carpoolSpots.readOnly = true;
                carpoolSpots.setAttribute('aria-disabled', 'true');
                if (carpoolSpotsHint) carpoolSpotsHint.classList.remove('d-none');
                if (carpoolSpotsFormText) carpoolSpotsFormText.classList.add('d-none');
            } else {
                carpoolSpots.readOnly = false;
                carpoolSpots.removeAttribute('aria-disabled');
                if (carpoolSpotsBeforeRequest != null && carpoolSpotsBeforeRequest !== '') {
                    carpoolSpots.value = carpoolSpotsBeforeRequest;
                }
                carpoolSpotsBeforeRequest = null;
                if (carpoolSpotsHint) carpoolSpotsHint.classList.add('d-none');
                if (carpoolSpotsFormText) carpoolSpotsFormText.classList.remove('d-none');
            }
        }
        if (carpoolRequest) {
            carpoolRequest.addEventListener('change', syncCarpoolSpotsOffered);
            syncCarpoolSpotsOffered();
        }
    }

    var rowsContainer = document.querySelector('#' + formId + ' .invitee-rows');
    var addBtn = form ? form.querySelector('.add-invitee') : null;
    if (!rowsContainer || !addBtn || !form) return;

    var removeModalEl = document.getElementById('remove-guest-modal');
    var removeModalLead = document.getElementById('remove-guest-modal-lead');
    var removeModalConfirm = document.getElementById('remove-guest-modal-confirm');
    var removeModal =
        removeModalEl && typeof bootstrap !== 'undefined'
            ? bootstrap.Modal.getOrCreateInstance(removeModalEl)
            : null;
    var pendingRemoveRow = null;

    if (removeModalEl) {
        removeModalEl.addEventListener('hidden.bs.modal', function () {
            pendingRemoveRow = null;
        });
    }

    if (removeModalConfirm && removeModal) {
        removeModalConfirm.addEventListener('click', function () {
            if (!pendingRemoveRow) return;
            var row = pendingRemoveRow;
            pendingRemoveRow = null;
            removeModal.hide();
            row.remove();
            reindexRows();
            syncRemoveButtons();
        });
    }

    function nextIndex() {
        return rowsContainer.querySelectorAll('[data-invitee-row]').length;
    }

    function syncRemoveButtons() {
        var rows = rowsContainer.querySelectorAll('[data-invitee-row]');
        var showRemove = rows.length > 1;
        rows.forEach(function (row) {
            var btn = row.querySelector('.remove-invitee');
            if (btn) btn.classList.toggle('d-none', !showRemove);
        });
    }

    function addRow() {
        var i = nextIndex();
        var wrap = document.createElement('div');
        wrap.className = 'invitee-row card card-body py-3 px-3 border';
        wrap.setAttribute('data-invitee-row', '');
        wrap.innerHTML =
            '<input type="hidden" class="invitee-id-input" name="invitees[' + i + '][id]" value="">' +
            '<div class="d-flex align-items-end gap-2">' +
            '<div class="flex-grow-1 min-w-0">' +
            '<label class="form-label small mb-1" for="invitee-' + i + '-name">Guest name' +
            '<span class="text-danger" aria-hidden="true">&nbsp;*</span></label>' +
            '<input class="form-control invitee-name-input" id="invitee-' + i + '-name" type="text" ' +
            'name="invitees[' + i + '][name]" required autocomplete="name" placeholder="Full name">' +
            '<div class="invalid-feedback">Please enter this guest\'s name.</div>' +
            '</div>' +
            '<div class="d-flex flex-shrink-0 gap-1 align-items-center">' +
            '<button class="invitee-extra-toggle btn btn-outline-secondary d-inline-flex align-items-center gap-1 collapsed" type="button" ' +
            'data-bs-toggle="collapse" data-bs-target="#invitee-' + i + '-extra" aria-expanded="false" aria-controls="invitee-' + i + '-extra" ' +
            'aria-label="More fields for guest">' +
            '<span class="visually-hidden">More for guest</span>' +
            '<i class="bi bi-sliders" aria-hidden="true"></i>' +
            '<span class="d-none d-md-inline">RSVP & dietary</span>' +
            '<i class="bi bi-chevron-down small collapse-chevron" aria-hidden="true"></i>' +
            '</button>' +
            '<button class="btn btn-outline-danger remove-invitee d-inline-flex align-items-center gap-1" type="button" title="Remove guest" aria-label="Remove guest">' +
            '<i class="bi bi-trash" aria-hidden="true"></i><span class="d-none d-md-inline">Remove</span></button>' +
            '</div></div>' +
            '<div class="collapse invitee-extra-collapse mt-2" id="invitee-' + i + '-extra">' +
            '<div class="pt-3 border-top">' +
            '<div class="row g-2 align-items-start"><div class="col-12">' +
            '<fieldset class="p-0 m-0 border-0">' +
            '<legend class="form-label small mb-1 px-0">Attending</legend>' +
            '<div class="btn-group invitee-attending-group w-100 w-sm-auto rounded-pill overflow-hidden" role="group" aria-label="Attending status for guest">' +
            '<input class="btn-check invitee-attending-radio" type="radio" name="invitees[' + i + '][attending]" id="invitee-' + i + '-attend-no" value="false">' +
            '<label class="btn btn-outline-danger" for="invitee-' + i + '-attend-no">No</label>' +
            '<input class="btn-check invitee-attending-radio" type="radio" name="invitees[' + i + '][attending]" id="invitee-' + i + '-attend-none" value="" checked>' +
            '<label class="btn btn-outline-dark" for="invitee-' + i + '-attend-none">Not answered</label>' +
            '<input class="btn-check invitee-attending-radio" type="radio" name="invitees[' + i + '][attending]" id="invitee-' + i + '-attend-yes" value="true">' +
            '<label class="btn btn-outline-primary" for="invitee-' + i + '-attend-yes">Yes</label>' +
            '</div></fieldset></div></div>' +
            '<div class="row g-2 mt-1"><div class="col-12">' +
            '<label class="form-label small mb-1" for="invitee-' + i + '-dietary">Dietary requirements</label>' +
            '<textarea class="form-control invitee-dietary-input" id="invitee-' + i + '-dietary" name="invitees[' + i + '][dietaryRestrictions]" rows="2" placeholder="The guest has not specified any dietary requirements"></textarea>' +
            '</div></div></div></div>';
        rowsContainer.appendChild(wrap);
        reindexRows();
        syncRemoveButtons();
        var input = wrap.querySelector('.invitee-name-input');
        if (input) input.focus();
    }

    rowsContainer.addEventListener('click', function (e) {
        var t = e.target;
        if (!t.closest) return;
        var remove = t.closest('.remove-invitee');
        if (!remove) return;
        var row = remove.closest('[data-invitee-row]');
        if (!row || rowsContainer.querySelectorAll('[data-invitee-row]').length <= 1) return;
        var nameInput = row.querySelector('.invitee-name-input');
        var nameVal = (nameInput && nameInput.value ? nameInput.value : '').trim();
        var question = nameVal
            ? 'Remove "' + nameVal.replace(/"/g, "'") + '" from this invitation? You can reload before saving to undo.'
            : 'Remove this guest from this invitation? You can reload before saving to undo.';
        if (!removeModal || !removeModalLead) {
            if (!window.confirm(question)) return;
            row.remove();
            reindexRows();
            syncRemoveButtons();
            return;
        }
        removeModalLead.textContent = nameVal
            ? 'Remove "' + nameVal.replace(/"/g, "'") + '" from this invitation?'
            : 'Remove this guest from this invitation?';
        pendingRemoveRow = row;
        removeModal.show();
    });

    function reindexRows() {
        var attendSuffixes = ['no', 'none', 'yes'];
        rowsContainer.querySelectorAll('[data-invitee-row]').forEach(function (row, i) {
            var nameInput = row.querySelector('.invitee-name-input');
            var idInput = row.querySelector('.invitee-id-input');
            var dietary = row.querySelector('.invitee-dietary-input');
            var labels = row.querySelectorAll('label.form-label');
            var group = row.querySelector('.invitee-attending-group');
            if (idInput) idInput.name = 'invitees[' + i + '][id]';
            if (nameInput) {
                nameInput.name = 'invitees[' + i + '][name]';
                nameInput.id = 'invitee-' + i + '-name';
            }
            row.querySelectorAll('input.invitee-attending-radio').forEach(function (radio, ri) {
                radio.name = 'invitees[' + i + '][attending]';
                radio.id = 'invitee-' + i + '-attend-' + attendSuffixes[ri];
            });
            row.querySelectorAll('.invitee-attending-group label').forEach(function (lbl, li) {
                lbl.setAttribute('for', 'invitee-' + i + '-attend-' + attendSuffixes[li]);
            });
            if (group) {
                group.setAttribute('aria-label', 'Attending status for guest ' + (i + 1));
            }
            if (dietary) {
                dietary.name = 'invitees[' + i + '][dietaryRestrictions]';
                dietary.id = 'invitee-' + i + '-dietary';
            }
            if (labels[0]) labels[0].setAttribute('for', 'invitee-' + i + '-name');
            if (labels[1]) labels[1].setAttribute('for', 'invitee-' + i + '-dietary');
            var extraCollapse = row.querySelector('.invitee-extra-collapse');
            var extraToggle = row.querySelector('.invitee-extra-toggle');
            if (extraCollapse) {
                extraCollapse.id = 'invitee-' + i + '-extra';
            }
            if (extraToggle) {
                extraToggle.setAttribute('data-bs-target', '#invitee-' + i + '-extra');
                extraToggle.setAttribute('aria-controls', 'invitee-' + i + '-extra');
                extraToggle.setAttribute('aria-label', 'More fields for guest ' + (i + 1));
                var vh = extraToggle.querySelector('.visually-hidden');
                if (vh) vh.textContent = 'More for guest ' + (i + 1);
            }
        });
    }

    addBtn.addEventListener('click', function () {
        addRow();
    });

    syncRemoveButtons();

    var deleteForm = document.getElementById('delete-invite-form');
    var deleteModalConfirm = document.getElementById('delete-invite-modal-confirm');
    var deleteModalEl = document.getElementById('delete-invite-modal');
    if (deleteForm && deleteModalConfirm && deleteModalEl && typeof bootstrap !== 'undefined') {
        var deleteModalInstance = bootstrap.Modal.getOrCreateInstance(deleteModalEl);
        deleteModalConfirm.addEventListener('click', function () {
            deleteModalInstance.hide();
            deleteForm.submit();
        });
    }
})();
