(function () {
    'use strict';

    var HERO_ASPECT = 16 / 9;

    function clamp01(n) {
        if (n < 0) return 0;
        if (n > 1) return 1;
        return n;
    }

    function containLayout(img) {
        var rect = img.getBoundingClientRect();
        var nw = img.naturalWidth;
        var nh = img.naturalHeight;
        var rw = rect.width;
        var rh = rect.height;
        if (!nw || !nh) {
            return { rw: rw, rh: rh, dw: rw, dh: rh, ox: 0, oy: 0 };
        }
        var scale = Math.min(rw / nw, rh / nh);
        var dw = nw * scale;
        var dh = nh * scale;
        var ox = (rw - dw) / 2;
        var oy = (rh - dh) / 2;
        return { rw: rw, rh: rh, dw: dw, dh: dh, ox: ox, oy: oy };
    }

    /** Vertical normalized (0–1) from click on img (object-fit: contain). */
    function clickToNormalizedY(img, clientY) {
        var rect = img.getBoundingClientRect();
        var relY = clientY - rect.top;
        var L = containLayout(img);
        var py = (relY - L.oy) / L.dh;
        return clamp01(py);
    }

    function positionFrame(wrap, img, frame) {
        var fy = parseFloat(img.getAttribute('data-focus-y') || '0.5', 10);
        if (!Number.isFinite(fy)) fy = 0.5;
        fy = clamp01(fy);

        var L = containLayout(img);
        var fh = L.dw / HERO_ASPECT;
        var frameCenterY = L.oy + fy * L.dh;
        var frameTop = frameCenterY - fh / 2;
        if (fh <= L.dh) {
            var minTop = L.oy;
            var maxTop = L.oy + L.dh - fh;
            if (frameTop < minTop) frameTop = minTop;
            if (frameTop > maxTop) frameTop = maxTop;
        } else {
            frameTop = L.oy + (L.dh - fh) / 2;
        }

        frame.style.left = (L.ox / L.rw) * 100 + '%';
        frame.style.width = (L.dw / L.rw) * 100 + '%';
        frame.style.top = (frameTop / L.rh) * 100 + '%';
        frame.style.height = (fh / L.rh) * 100 + '%';
    }

    function clearStatus(wrap) {
        var el = wrap.nextElementSibling;
        if (!el || !el.classList.contains('hero-focus-status')) return;
        el.textContent = '';
    }

    function showStatus(wrap, message) {
        var el = wrap.nextElementSibling;
        if (!el || !el.classList.contains('hero-focus-status')) return;
        el.textContent = message;
    }

    function initPicker(wrap) {
        var url = wrap.getAttribute('data-focus-url');
        var img = wrap.querySelector('.hero-focus-img');
        var frame = wrap.querySelector('.hero-focus-frame');
        if (!url || !img || !frame) return;

        var busy = false;

        function onResizeOrLoad() {
            positionFrame(wrap, img, frame);
        }

        if (img.complete) {
            onResizeOrLoad();
        } else {
            img.addEventListener('load', onResizeOrLoad);
        }
        window.addEventListener('resize', onResizeOrLoad);

        img.addEventListener('click', function (e) {
            e.preventDefault();
            if (busy) return;

            var fy = clickToNormalizedY(img, e.clientY);
            img.setAttribute('data-focus-y', String(fy));
            positionFrame(wrap, img, frame);

            busy = true;
            var body = new URLSearchParams();
            body.set('focusY', String(fy));

            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'fetch',
                },
                body: body.toString(),
                credentials: 'same-origin',
            })
                .then(function (res) {
                    return res.json().then(function (data) {
                        if (!res.ok) {
                            throw new Error(
                                (data && data.error) || res.statusText || 'Request failed',
                            );
                        }
                        return data;
                    });
                })
                .then(function () {
                    clearStatus(wrap);
                })
                .catch(function (err) {
                    showStatus(wrap, err.message || 'Could not save focus.');
                })
                .finally(function () {
                    busy = false;
                });
        });
    }

    document.querySelectorAll('.hero-focus-picker-wrap').forEach(initPicker);
})();
