/* ===================================================================
   RENDERER.JS — Builds DOM from JSON data
   Pure functions: input = data, output = HTML injected into mount points
   =================================================================== */

/* -------- Render Bento Project Grid -------- */
export function renderProjects(projects, mountId) {
    const grid = document.getElementById(mountId);
    if (!grid) return;

    const contactCard = {
        id: 'contact',
        title: 'Have a project?',
        category: 'Get in touch',
        year: '↗',
        description: 'Available for summer 2026 internships and freelance web builds.',
        tech: [],
        type: 'contact',
        projectUrl: 'mailto:roan17168@gmail.com',
        bentoSize: 'medium'
    };

    const allCards = [...projects, contactCard];

    grid.innerHTML = allCards.map(project => {
        const isContact = project.type === 'contact';
        const isFeature = project.featured;
        const classes = [
            'bento-card',
            'fade-in',
            isFeature ? 'feature' : '',
            isContact ? 'contact-card' : ''
        ].filter(Boolean).join(' ');

        const href = isContact
            ? project.projectUrl
            : `project.html?id=${project.id}`;

        return `
        <a href="${href}" class="${classes}" data-size="${project.bentoSize}" data-project-id="${project.id}">
            <div class="card-top">
                <span class="card-category">${project.category}</span>
                <span class="card-year">${project.year}</span>
            </div>
            <div>
                <h3 class="card-title">${project.title}</h3>
                <p class="card-desc">${project.description}</p>
            </div>
            <div class="card-bottom">
                <div class="card-tech">
                    ${(project.tech || []).map(t => `<span>${t}</span>`).join('')}
                </div>
                ${renderStatusBadge(project)}
            </div>
        </a>
        `;
    }).join('');
}

function renderStatusBadge(project) {
    switch (project.type) {
        case 'iframe':
            return `<span class="card-cta">Open <span>→</span></span>`;
        case 'coming-soon':
            return `<span class="card-status coming-soon">${project.statusText || 'Coming soon'}</span>`;
        case 'case-study':
            return `<span class="card-cta">Read case study <span>→</span></span>`;
        case 'contact':
            return `<span class="card-cta">Say hi <span>→</span></span>`;
        default:
            return `<span class="card-cta">View <span>→</span></span>`;
    }
}

/* -------- Render Stack / Skills -------- */
export function renderStack(skillsData, mountId) {
    const grid = document.getElementById(mountId);
    if (!grid) return;

    const categories = skillsData.categories || [];

    grid.innerHTML = categories.map(cat => `
        <div class="stack-category fade-in">
            <h3>${cat.name}</h3>
            <ul class="stack-list">
                ${cat.items.map(item => `<li>${item}</li>`).join('')}
            </ul>
        </div>
    `).join('');
}

/* -------- Render Experience Timeline -------- */
export function renderTimeline(resume, mountId) {
    const timeline = document.getElementById(mountId);
    if (!timeline) return;

    // Combine education + experience into a single chronological feed
    const education = (resume.education || []).map(e => ({
        date: `${e.startDate} — ${e.endDate}`,
        title: e.school,
        role: `${e.degree} · ${e.location}`,
        description: (e.details || []).join(' · ')
    }));

    const experience = (resume.experience || []).map(x => ({
        date: `${x.startDate} — ${x.endDate}`,
        title: x.company,
        role: `${x.role} · ${x.location}`,
        description: x.description
    }));

    const combined = [...experience, ...education];

    timeline.innerHTML = combined.map(item => `
        <div class="timeline-item fade-in">
            <div class="timeline-date">${item.date}</div>
            <div class="timeline-content">
                <h3>${item.title}</h3>
                <span class="role">${item.role}</span>
                <p>${item.description}</p>
            </div>
        </div>
    `).join('');
}