(function () {
    'use strict';

    var container = document.getElementById('menu-courses');
    var courseTemplate = document.getElementById('menu-course-template');
    var itemTemplate = document.getElementById('menu-item-template');
    var addCourseBtn = document.getElementById('add-menu-course');
    var form = document.getElementById('menu-form');
    if (!container || !courseTemplate || !itemTemplate || !addCourseBtn || !form) return;

    function reindexAll() {
        var courseEls = container.querySelectorAll('.menu-course');
        courseEls.forEach(function (courseEl, ci) {
            courseEl.setAttribute('data-course-index', String(ci));
            var courseNameInput = courseEl.querySelector('.menu-course-name');
            if (courseNameInput) {
                courseNameInput.setAttribute('name', 'courses[' + ci + '][name]');
                if (!courseNameInput.id || courseNameInput.id.indexOf('menu-course-name-') === 0) {
                    courseNameInput.id = 'menu-course-name-' + ci;
                }
                var cnLabel = courseEl.querySelector('label.form-label[for^="menu-course-name-"]');
                if (cnLabel) {
                    cnLabel.setAttribute('for', 'menu-course-name-' + ci);
                }
            }
            var itemEls = courseEl.querySelectorAll('.menu-items .menu-item');
            itemEls.forEach(function (itemEl, ii) {
                var nameInput = itemEl.querySelector('.menu-item-name');
                if (nameInput) {
                    nameInput.setAttribute('name', 'courses[' + ci + '][items][' + ii + '][name]');
                }
                itemEl.querySelectorAll('.menu-item-tags input[type="checkbox"]').forEach(function (cb) {
                    cb.setAttribute('name', 'courses[' + ci + '][items][' + ii + '][tags][]');
                });
            });
        });
    }

    function appendCourseFromTemplate() {
        var ci = container.querySelectorAll('.menu-course').length;
        var html = courseTemplate.innerHTML.replace(/__ci__/g, String(ci)).replace(/__ii__/g, '0');
        var wrap = document.createElement('div');
        wrap.innerHTML = html.trim();
        var row = wrap.firstElementChild;
        if (!row) return;
        container.appendChild(row);
        reindexAll();
    }

    function appendItemToCourse(courseEl) {
        var ci = parseInt(courseEl.getAttribute('data-course-index') || '0', 10);
        if (!Number.isFinite(ci)) ci = 0;
        var itemsBox = courseEl.querySelector('.menu-items');
        if (!itemsBox) return;
        var ii = itemsBox.querySelectorAll('.menu-item').length;
        var html = itemTemplate.innerHTML.replace(/__ci__/g, String(ci)).replace(/__ii__/g, String(ii));
        var wrap = document.createElement('div');
        wrap.innerHTML = html.trim();
        var row = wrap.firstElementChild;
        if (!row) return;
        itemsBox.appendChild(row);
        reindexAll();
    }

    container.addEventListener('click', function (e) {
        var rmCourse = e.target.closest('.remove-menu-course');
        if (rmCourse && container.contains(rmCourse)) {
            e.preventDefault();
            var courseEl = rmCourse.closest('.menu-course');
            if (courseEl && container.contains(courseEl)) {
                courseEl.remove();
                reindexAll();
            }
            return;
        }

        var rmItem = e.target.closest('.remove-menu-item');
        if (rmItem && container.contains(rmItem)) {
            e.preventDefault();
            var itemEl = rmItem.closest('.menu-item');
            var courseEl = rmItem.closest('.menu-course');
            if (itemEl && courseEl && container.contains(itemEl)) {
                itemEl.remove();
                reindexAll();
            }
            return;
        }

        var addItem = e.target.closest('.add-menu-item');
        if (addItem && container.contains(addItem)) {
            e.preventDefault();
            var courseEl = addItem.closest('.menu-course');
            if (courseEl && container.contains(courseEl)) {
                appendItemToCourse(courseEl);
            }
        }
    });

    addCourseBtn.addEventListener('click', function () {
        appendCourseFromTemplate();
    });

    form.addEventListener('submit', function () {
        reindexAll();
    });

    reindexAll();
})();
