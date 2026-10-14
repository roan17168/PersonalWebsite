/* ===================================================================
   APP.JS — Main orchestrator for the homepage
   Loads component HTML, fetches JSON data, kicks off renderer + animations
   =================================================================== */

import { renderProjects, renderStack, renderExperience } from './renderer.js';
import { initAnimations } from './animations.js';

/* ============ RESILIENT COMPONENT LOADER ============ */
async function loadComponent(mountId, componentPath) {
    const mount = document.getElementById(mountId);
    if (!mount) return;

    // Normalize relative path to work in both root and repo subfolders
    const cleanPath = componentPath.startsWith('./') ? componentPath : `./${componentPath}`;

    try {
        let res = await fetch(cleanPath);
        if (!res.ok) {
            res = await fetch(cleanPath.replace('./', './public/'));
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        mount.innerHTML = await res.text();
    } catch (err) {
        console.warn(`[Component Warning] Could not fetch ${cleanPath}, applying fallback markup.`, err);
        
        // Inline fallback so your site never breaks or stays blank
        if (mountId === 'nav-mount') {
            mount.innerHTML = `
                <details class="mobile-section-nav">
                    <summary class="mobile-nav-toggle">
                        <span>Sections</span>
                        <span class="mobile-nav-mark" aria-hidden="true"></span>
                    </summary>
                    <nav class="mobile-nav-panel" aria-label="Page sections">
                        <a href="index.html#about">About</a>
                        <a href="index.html#work">Current Projects</a>
                        <a href="index.html#past-work">Past Projects</a>
                        <a href="index.html#stack">Stack</a>
                        <a href="index.html#experience">Experience</a>
                        <a href="index.html#contact">Contact</a>
                    </nav>
                </details>
            `;
        } else if (mountId === 'footer-mount') {
            mount.innerHTML = `
                <footer class="contact" id="contact">
                    <div class="contact-inner">
                        <p class="mono contact-eyebrow">// let's build something</p>
                        <h2 class="contact-title">Say <span class="italic serif">hello</span>.</h2>
                        <div class="contact-links">
                            <a href="mailto:roan17168@gmail.com" class="contact-link">
                                <span class="link-label">email</span>
                                <span class="link-value">roan17168@gmail.com</span>
                                <span class="link-arrow">→</span>
                            </a>
                            <a href="mailto:rwd0519@westminsteru.edu" class="contact-link">
                                <span class="link-label">edu email</span>
                                <span class="link-value">rwd0519@westminsteru.edu</span>
                                <span class="link-arrow">→</span>
                            </a>
                            <a href="https://github.com/roan17168" class="contact-link" target="_blank" rel="noopener">
                                <span class="link-label">github</span>
                                <span class="link-value">@roan17168</span>
                                <span class="link-arrow">→</span>
                            </a>
                        </div>
                        <div class="footer-line">
                            <span class="mono">© 2026 · Built from scratch · Salt Lake City, UT ↔ Lake Oswego, OR</span>
                        </div>
                    </div>
                </footer>
            `;
        }
    }
}

async function loadJSON(path) {
    try {
        const res = await fetch(path);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error(`Failed to load ${path}:`, err);
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

/* ============ RIGHT-SIDE FLOATING INDEX OBSERVER ============ */
function initIndexObserver() {
    const sections = [...document.querySelectorAll('header[id], main[id], section[id], footer[id]')];
    const navItems = document.querySelectorAll('.index-item');
    if (!sections.length || !navItems.length) return;

    function updateActiveSection() {
        const marker = window.innerHeight * 0.4;
        const activeSection = sections.find(section => {
            const bounds = section.getBoundingClientRect();
            return bounds.top <= marker && bounds.bottom > marker;
        }) || sections.reduce((closest, section) => {
            const closestDistance = Math.abs(closest.getBoundingClientRect().top - marker);
            const sectionDistance = Math.abs(section.getBoundingClientRect().top - marker);
            return sectionDistance < closestDistance ? section : closest;
        });

        navItems.forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-target') === activeSection.id);
        });
    }

    let updatePending = false;
    function scheduleUpdate() {
        if (updatePending) return;
        updatePending = true;
        requestAnimationFrame(() => {
            updatePending = false;
            updateActiveSection();
        });
    }

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    updateActiveSection();
}

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Components — never block, never crash
    await Promise.allSettled([
        loadComponent('nav-mount', './components/nav.html'),
        loadComponent('footer-mount', './components/footer.html')
    ]);

    const [projects, pastProjects, skills, resume] = await Promise.all([
        loadJSON('./data/projects.json'),
        loadJSON('./data/past-projects.json'),
        loadJSON('./data/skills.json'),
        loadJSON('./data/resume.json')
    ]);

    document.querySelectorAll('.mobile-nav-panel a').forEach(link => {
        link.addEventListener('click', () => {
            const menu = link.closest('.mobile-section-nav');
            if (menu) menu.open = false;
        });
    });

    // Render each section independently so one failure cannot blank the rest.
    try { if (projects) renderProjects(projects, 'project-grid'); }
    catch (e) { console.error('renderProjects failed:', e); }

    try { if (pastProjects) renderProjects(pastProjects, 'past-project-grid', false, 'small'); }
    catch (e) { console.error('renderPastProjects failed:', e); }

    try { if (skills) renderStack(skills, 'stack-grid'); }
    catch (e) { console.error('renderStack failed:', e); }

    try { if (resume) renderExperience(resume, 'timeline'); }
    catch (e) { console.error('renderExperience failed:', e); }

    // 4. Interactions
    try { initTerminalTyping?.(); } catch (e) {}
    try { initCardTracking?.(); } catch (e) {}
    try { initIndexObserver?.(); } catch (e) {}
    try { initAnimations?.(); } catch (e) {}
});
