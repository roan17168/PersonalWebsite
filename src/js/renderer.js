/* ===================================================================
   RENDERER.JS — Builds DOM from JSON data
   Pure functions: input = data, output = HTML injected into mount points
   =================================================================== */

/* -------- Render Bento Project Grid -------- */
export function renderProjects(projects, mountId, includeContactCard = true, cardSizeOverride = null) {
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

    const completedProjects = projects.filter(project => project.status !== 'in-progress');
    const inProgressProjects = projects.filter(project => project.status === 'in-progress');
    const cards = completedProjects.map(project => renderProjectCard(project, cardSizeOverride));

    if (inProgressProjects.length) {
        cards.push(renderInProgressShelf(inProgressProjects, cardSizeOverride));
    }

    if (includeContactCard) {
        cards.push(renderProjectCard(contactCard, cardSizeOverride));
    }

    grid.innerHTML = cards.join('');
}

function renderProjectCard(project, cardSizeOverride) {
    const isContact = project.type === 'contact';
    const isFeature = project.featured;
    const isInProgress = project.status === 'in-progress';
    const classes = [
        'bento-card',
        'fade-in',
        isFeature ? 'feature' : '',
        isContact ? 'contact-card' : '',
        isInProgress ? 'project-in-progress' : ''
    ].filter(Boolean).join(' ');

    const href = isContact
        ? project.projectUrl
        : `project.html?id=${project.id}`;
    const cardTag = isInProgress ? 'div' : 'a';
    const cardAttributes = isInProgress
        ? `role="status" aria-label="${project.title} — in progress" aria-disabled="true"`
        : `href="${href}"`;

    return `
        <${cardTag} ${cardAttributes} class="${classes}" data-size="${cardSizeOverride || project.bentoSize}" data-project-id="${project.id}">
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
            ${isInProgress ? renderInProgressOverlay(project) : ''}
        </${cardTag}>
    `;
}

function renderInProgressShelf(projects, cardSizeOverride) {
    const countLabel = projects.length === 1 ? '1 project in progress' : `${projects.length} projects in progress`;
    const previewProjects = projects.slice(0, 4);
    const paperCount = previewProjects.length + (projects.length > previewProjects.length ? 1 : 0);
    const papers = [
        ...previewProjects.map(project => ({ title: project.title })),
        ...(projects.length > previewProjects.length
            ? [{ title: `+${projects.length - previewProjects.length} more` }]
            : [])
    ];

    return `
        <details class="in-progress-shelf" data-size="${cardSizeOverride || 'medium'}">
            <summary class="in-progress-shelf-summary">
                <span class="project-paper-stack" style="--paper-count: ${paperCount}; height: ${4.15 + (paperCount - 1) * 0.7}rem">
                    ${papers.slice().reverse().map((paper, reverseIndex) => {
                        const index = papers.length - reverseIndex - 1;
                        const rotation = (index - 1) * 1.25;
                        return `
                            <span class="project-paper ${index === 0 ? 'project-paper-front' : ''}" style="--paper-index: ${index}; --paper-rotation: ${rotation}deg">
                                <span class="project-paper-title">${paper.title}</span>
                                ${index === 0 ? '<span class="project-paper-status mono">IN PROGRESS</span>' : ''}
                            </span>
                        `;
                    }).join('')}
                </span>
                <span class="in-progress-shelf-copy">
                    <span class="in-progress-shelf-title">In progress</span>
                    <span class="in-progress-shelf-hint">${countLabel}</span>
                </span>
                </div>
            </div>
        </details>
    `;
}

function renderInProgressOverlay(project) {
    return `
        <div class="progress-overlay" aria-hidden="true">
            <span class="progress-label mono"><span></span> IN PROGRESS</span>
            <span class="progress-title">${project.title}</span>
            <span class="progress-message">Something is taking shape.</span>
            <span class="progress-rule"></span>
        </div>
    `;
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
                ${cat.items.map(item => `
                    <li>
                        <details class="stack-skill" name="stack-skill-definitions">
                            <summary>${item}</summary>
                            <div class="stack-definition">
                                <p>${cat.descriptions?.[item] || 'Add a short description for this skill in skills.json.'}</p>
                            </div>
                        </details>
                    </li>
                `).join('')}
            </ul>
        </div>
    `).join('');
}

function getTimelineStart(item) {
    const date = item.startDate || item.date || '';
    const start = date.split(/\s+[—–-]\s+/)[0];
    return Date.parse(start) || 0;
}

/* ============ RENDER EXPERIENCE & RESUME DATA ============ */
export function renderExperience(resumeData, mountId = 'timeline') {
    const timeline = document.getElementById(mountId);
    if (!timeline || !resumeData) return;

    let html = '';

    if (resumeData.experience?.length) {
        const experiences = [...resumeData.experience]
            .sort((first, second) => getTimelineStart(second) - getTimelineStart(first));
        html += experiences.map(item => `
                <div class="timeline-item fade-in">
                    <div class="timeline-date mono">${item.date || (item.startDate ? `${item.startDate} — ${item.endDate || 'Present'}` : '')}</div>
                    <div class="timeline-content">
                        <h3>${item.title || item.company || ''}</h3>
                        <span class="role mono">${item.role || ''}</span>
                        <p>${item.description || ''}</p>
                    </div>
                </div>
        `).join('');
    }

    if (resumeData.education?.length) {
        html += `
            <div class="timeline-category mono" style="margin-top: 3rem;">// Education</div>
            ${resumeData.education.map(item => `
                <div class="timeline-item fade-in">
                    <div class="timeline-date mono">${item.date || ''}</div>
                    <div class="timeline-content">
                        <h3>${item.school || item.title || ''}</h3>
                        <span class="role mono">${item.role || ''}</span>
                        <p>${item.description || ''}</p>
                    </div>
                </div>
            `).join('')}
        `;
    }

    if (resumeData.awards?.length) {
        html += `
            <div class="timeline-category mono" style="margin-top: 3rem;">// Honors & Awards</div>
            <div class="timeline-item fade-in">
                <div class="timeline-date mono">Honors</div>
                <div class="timeline-content">
                    <ul class="timeline-list">
                        ${resumeData.awards.map(award => `<li>${award}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
    }

    if (resumeData.communityService?.length) {
        html += `
            <div class="timeline-category mono" style="margin-top: 3rem;">// Community Service</div>
            ${resumeData.communityService.map(service => `
                <div class="timeline-item fade-in">
                    <div class="timeline-date mono">${service.dates || ''}</div>
                    <div class="timeline-content">
                        <h3>${service.org || ''}</h3>
                        <p>${service.description || ''}</p>
                    </div>
                </div>
            `).join('')}
        `;
    }

    timeline.innerHTML = html;
}
