document.addEventListener('DOMContentLoaded', function() {
    var isApple = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    var isAndroid = /Android/i.test(navigator.userAgent);
    if (!isApple && !isAndroid) return;

    var links = document.querySelectorAll('.map-link');
    if (!links || !links.length) return;
    for (var i = 0; i < links.length; i++) {
        if (isApple) {
            // replace 'https://' with 'maps://' for iOS
            links[i].href = 'maps' + links[i].href.substring(5);
        } else if (isAndroid) {
            // replace 'https://' with 'geo:' for Android
            links[i].href = 'geo:0,0' + links[i].href.substring(24);
        }
    }
});