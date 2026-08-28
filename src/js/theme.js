/* ===================================================================
   THEME.JS — Theme utilities (currently dark-only by design)
   Ready for future light/dark toggle when you want it.
   =================================================================== */

const THEME_KEY = 'roan-portfolio-theme';

export function initTheme() {
    // Currently locked to dark mode — matches design intent.
    // To enable toggling later:
    //   1. Add a button to nav.html: <button id="theme-toggle">☀</button>
    //   2. Uncomment the toggle logic below
    //   3. Add [data-theme="light"] variable overrides in main.css

    const saved = localStorage.getItem(THEME_KEY) || 'dark';
    document.documentElement.setAttribute('data-theme', saved);

    // const toggle = document.getElementById('theme-toggle');
    // if (toggle) {
    //     toggle.addEventListener('click', () => {
    //         const current = document.documentElement.getAttribute('data-theme');
    //         const next = current === 'dark' ? 'light' : 'dark';
    //         document.documentElement.setAttribute('data-theme', next);
    //         localStorage.setItem(THEME_KEY, next);
    //     });
    // }
}

export function getTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
}