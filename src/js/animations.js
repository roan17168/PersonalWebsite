/* ===================================================================
   ANIMATIONS.JS — Scroll-triggered fade-ins using IntersectionObserver
   Lightweight — no GSAP needed for the basic reveals.
   GSAP is available via npm if you want to level up (pinning, scrub, etc.)
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

/* -------- OPTIONAL: GSAP scroll animations --------
   Uncomment when you're ready to add richer effects.
   Requires `npm install gsap` and importing at top:

   import { gsap } from 'gsap';
   import { ScrollTrigger } from 'gsap/ScrollTrigger';
   gsap.registerPlugin(ScrollTrigger);

   Then call these functions from initAnimations():
*/

// export function initGSAPHeroReveal() {
//     gsap.from('.hero-title .line', {
//         y: 100, opacity: 0, stagger: 0.08, duration: 1, ease: 'power4.out'
//     });
// }

// export function initGSAPProjectCards() {
//     gsap.from('.bento-card', {
//         opacity: 0, y: 60, stagger: 0.15, duration: 0.9,
//         scrollTrigger: { trigger: '.bento-grid', start: 'top 75%' }
//     });
// }