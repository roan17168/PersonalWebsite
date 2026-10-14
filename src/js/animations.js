/* ===================================================================
    ANIMATIONS.JS — Scroll-triggered fade-ins using IntersectionObserver
    =================================================================== */

export function initAnimations() {
    initFadeInObserver();
}

function initFadeInObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    // Wait a tick for dynamically injected elements to exist
    setTimeout(() => {
        document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
    }, 150);
}
