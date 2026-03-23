document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('rsvp-edit-form');
  if (!form) return;
  form.customValidationFunctions = form.customValidationFunctions || [];
  form.customValidationFunctions.push(function () {
    var ok = true;
    form.querySelectorAll('[data-invitee-row]').forEach(function (row) {
      var picked = row.querySelector('input.invitee-attending-radio:checked');
      var fb = row.querySelector('.attending-invalid-feedback');
      if (!picked) {
        ok = false;
        if (fb) fb.classList.remove('d-none');
      } else if (fb) {
        fb.classList.add('d-none');
      }
    });
    return ok;
  });
  form.querySelectorAll('input.invitee-attending-radio').forEach(function (radio) {
    radio.addEventListener('change', function () {
      var row = radio.closest('[data-invitee-row]');
      if (!row) return;
      var fb = row.querySelector('.attending-invalid-feedback');
      if (fb) fb.classList.add('d-none');
    });
  });

  var carpoolRequest = document.getElementById('rsvp-carpool-requested');
  var carpoolSpots = document.getElementById('rsvp-carpool-spots');
  var carpoolSpotsHint = document.getElementById('rsvp-carpool-spots-hint');
  var carpoolSpotsFormText = document.getElementById('rsvp-carpool-spots-form-text');
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

  /* Leave-page warning: compare to initial snapshot (browsers usually show a generic message). */
  function rsvpFormSignature(f) {
    var fd = new FormData(f);
    var parts = [];
    fd.forEach(function (val, key) {
      parts.push(key + '\u0000' + String(val));
    });
    parts.sort();
    return parts.join('\u0001');
  }
  var initialSignature = rsvpFormSignature(form);
  var allowUnloadWithoutPrompt = false;
  form.addEventListener('submit', function (e) {
    if (!e.defaultPrevented) {
      allowUnloadWithoutPrompt = true;
    }
  });
  window.addEventListener('beforeunload', function (e) {
    if (allowUnloadWithoutPrompt) return;
    if (rsvpFormSignature(form) === initialSignature) return;
    e.preventDefault();
    e.returnValue = '';
  });
});
