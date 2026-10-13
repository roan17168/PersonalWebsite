/* ===================================================================
   APP.JS — Main orchestrator for the homepage
   Loads component HTML, fetches JSON data, kicks off renderer + animations
   =================================================================== */

import { renderProjects, renderStack, renderTimeline } from './renderer.js';
import { initAnimations } from './animations.js';
import { initTheme } from './theme.js';

/* -------- Load an HTML component into a mount point -------- */
async function loadComponent(mountId, componentPath) {
    const mount = document.getElementById(mountId);
    if (!mount) return;
    try {
        const res = await fetch(componentPath);
        if (!res.ok) throw new Error(`Failed to load ${componentPath}`);
        mount.innerHTML = await res.text();
    } catch (err) {
        console.error(err);
    }
}

/* -------- Fetch JSON data -------- */
async function loadJSON(path) {
    try {
        const res = await fetch(path);
        if (!res.ok) throw new Error(`Failed to load ${path}`);
        return await res.json();
    } catch (err) {
        console.error(err);
        return null;
    }
}

/* -------- Terminal typing animation -------- */
const TERMINAL_LINES = [
    ' BS in Computer Science by Spring 2028',
    ' Curating local agent pipelines for autonomous code auditors',
    ' Building responsive client architectures & web games'
];

function initTerminalTyping() {
    const output = document.getElementById('typed-output');
    if (!output) return;

    let lineIdx = 0;
    let charIdx = 0;
    let isDeleting = false;

    function tick() {
        const currentLine = TERMINAL_LINES[lineIdx];

        if (isDeleting) {
            output.textContent = currentLine.substring(0, charIdx--);
            if (charIdx < 0) {
                isDeleting = false;
                lineIdx = (lineIdx + 1) % TERMINAL_LINES.length;
                setTimeout(tick, 500);
                return;
            }
            setTimeout(tick, 30);
        } else {
            output.textContent = currentLine.substring(0, charIdx++);
            if (charIdx > currentLine.length) {
                isDeleting = true;
                setTimeout(tick, 2500);
                return;
            }
            setTimeout(tick, 55);
        }
    }

    setTimeout(tick, 1500);
}

/* -------- Mouse-tracked card glow -------- */
function initCardTracking() {
    document.addEventListener('mousemove', (e) => {
        document.querySelectorAll('.bento-card').forEach(card => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            card.style.setProperty('--mx', `${x}%`);
            card.style.setProperty('--my', `${y}%`);
        });
    });
}

/* -------- Main init -------- */
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load reusable components
    await Promise.all([
        loadComponent('nav-mount', 'src/components/nav.html'),
        loadComponent('footer-mount', 'src/components/footer.html')
    ]);

    // 2. Fetch all data files in parallel
    const [projects, skills, resume] = await Promise.all([
        loadJSON('data/projects.json'),
        loadJSON('data/skills.json'),
        loadJSON('data/resume.json')
    ]);

    // 3. Render dynamic sections
    if (projects) renderProjects(projects, 'project-grid');
    if (skills)   renderStack(skills, 'stack-grid');
    if (resume)   renderTimeline(resume, 'timeline');

    // 4. Kick off theme + animations + interactions
    initTheme();
    initTerminalTyping();
    initCardTracking();
    initAnimations();
});
