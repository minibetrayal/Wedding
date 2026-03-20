document.addEventListener('DOMContentLoaded', function() {
    const tocLinks = document.getElementById('toc-list');
    if (!tocLinks) return;
    const nav = document.querySelector('nav');
    const navbarHeight = nav?.offsetHeight ?? 3;
    const targets = document.querySelectorAll('.toc-target[id]');
    if (!targets || !targets.length) {
        const tocContainer = document.querySelector('.page-toc-container');
        if (tocContainer) tocContainer.style.display = 'none';
        return;
    }
    targets.forEach(function (target) {
        //- Set the scroll margin top such that the sticky navbar doesn't obscure the target
        target.style.scrollMarginTop = (navbarHeight + 3) + 'px';
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.className = 'link-primary';
        a.href = '#' + target.id;
        a.textContent = target.getAttribute('title') || target.id;
        li.appendChild(a);
        tocLinks.appendChild(li);
    });
});