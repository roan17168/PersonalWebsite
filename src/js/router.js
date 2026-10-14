/* ===================================================================
   ROUTER.JS — Handles the universal project.html?id=xyz page
   Reads the query param, fetches project data, populates the page
   =================================================================== */

import currentProjects from '../../data/projects.json';
import pastProjects from '../../data/past-projects.json';

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

function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

function populateProject(project) {
    document.title = `${project.title} — roan.db`;
    document.getElementById('project-category').textContent = project.category;
    document.getElementById('project-year').textContent = project.year;
    document.getElementById('project-title').textContent = project.title;
    document.getElementById('project-description').textContent =
        project.longDescription || project.description;

    const techMount = document.getElementById('project-tech');
    techMount.innerHTML = (project.tech || [])
        .map(t => `<span>${t}</span>`)
        .join('');

    document.getElementById('frame-url').textContent = `~/projects/${project.id}`;

    const iframe = document.getElementById('project-iframe');
    const placeholder = document.getElementById('frame-placeholder');
    const placeholderMsg = document.getElementById('placeholder-message');
    const externalBtn = document.getElementById('project-external');
    const fullscreenBtn = document.getElementById('project-fullscreen');

    // Decide what to show based on project type
    if (project.type === 'iframe' && project.projectUrl) {
        iframe.src = project.projectUrl;
        externalBtn.href = project.projectUrl;
        externalBtn.style.display = 'inline-flex';
        fullscreenBtn.onclick = () => {
            if (iframe.requestFullscreen) iframe.requestFullscreen();
        };
    } else if (project.type === 'coming-soon') {
        placeholder.classList.add('active');
        placeholderMsg.innerHTML = `
            ${project.statusText || 'This project isn\'t embeddable yet.'}<br><br>
            ${project.downloadUrl
                ? `<a href="${project.downloadUrl}" class="btn-primary" download>Download desktop version ↓</a>`
                : ''}
        `;
        fullscreenBtn.style.display = 'none';
        externalBtn.style.display = 'none';
    } else if (project.type === 'case-study') {
        placeholder.classList.add('active');
        placeholderMsg.textContent =
            'Full case study coming soon. See description above for project details.';
        fullscreenBtn.style.display = 'none';
        externalBtn.style.display = 'none';
    } else {
        placeholder.classList.add('active');
        placeholderMsg.textContent = 'Project preview unavailable.';
        fullscreenBtn.style.display = 'none';
        externalBtn.style.display = 'none';
    }

    // If a live URL is provided, prefer it for the external button
    if (project.liveUrl) {
        externalBtn.href = project.liveUrl;
        externalBtn.style.display = 'inline-flex';
    }
}

function showNotFound() {
    document.getElementById('project-title').textContent = 'Project not found';
    document.getElementById('project-description').textContent =
        'This project ID doesn\'t exist. Head back home to see the full list.';
    document.getElementById('frame-placeholder').classList.add('active');
    document.getElementById('placeholder-message').textContent = '404 — not found';
    document.getElementById('project-fullscreen').style.display = 'none';
    document.getElementById('project-external').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([
        loadComponent('nav-mount', 'components/nav.html'),
        loadComponent('footer-mount', 'components/footer.html')
    ]);

    const id = getQueryParam('id');
    const projects = [...currentProjects, ...pastProjects];

    if (!id) {
        showNotFound();
        return;
    }

    const project = projects.find(p => p.id === id);
    if (!project) {
        showNotFound();
        return;
    }

    populateProject(project);
});