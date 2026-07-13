/*===== BACKEND SERVER INTERACTION UTILITIES =====*/
const API_BASE = "";
let currentPortfolioData = {};
let trafficChartInstance = null;

// Header Token builder
function getHeaders() {
    const token = sessionStorage.getItem('admin_token') || '';
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

async function apiRequest(endpoint, method = 'GET', body = null) {
    try {
        const config = {
            method,
            headers: getHeaders()
        };
        if (body) {
            config.body = JSON.stringify(body);
        }
        
        const response = await fetch(endpoint, config);
        
        if (response.status === 401 || response.status === 403) {
            // Token expired or invalid
            sessionStorage.removeItem('admin_auth');
            sessionStorage.removeItem('admin_token');
            checkAuth();
            throw new Error("Session expired. Please log in again.");
        }

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "API request failed");
        }
        return data;
    } catch (err) {
        console.error(`API Error on ${endpoint}:`, err);
        showToast("Error", err.message, "error");
        throw err;
    }
}

/*===== SECURITY & SESSION HANDLING =====*/
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initTheme();
    initMobileNav();
    
    // Bind Login Form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Bind Logout Buttons
    const logoutBtns = document.querySelectorAll('#logout-btn, #top-logout-btn, #sidebar-menu-logout-btn');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', handleLogout);
    });

    // Bind Tab Switching
    const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabName = item.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // Bind Inbox search
    const searchInput = document.getElementById('inbox-search');
    if (searchInput) {
        searchInput.addEventListener('input', filterInbox);
    }

    // Bind Inbox clear all
    const clearAllBtn = document.getElementById('inbox-clear-all');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllMessages);
    }

    // Bind Settings form submit
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', saveSettings);
    }

    // Bind Skill Form Submit
    document.getElementById('skill-form').addEventListener('submit', saveSkillItem);

    // Bind Project Form Submit
    document.getElementById('project-form').addEventListener('submit', saveProjectItem);

    // Bind Education Form Submit
    document.getElementById('education-form').addEventListener('submit', saveEducationItem);

    // Bind Experience Form Submit
    document.getElementById('experience-form').addEventListener('submit', saveExperienceItem);

    // Bind Certificates Form Submit
    document.getElementById('certificate-form').addEventListener('submit', saveCertificateItem);
});

function checkAuth() {
    const isAuthed = sessionStorage.getItem('admin_auth') === 'true';
    const loginContainer = document.getElementById('login-container');
    const dashboardWrapper = document.getElementById('dashboard-wrapper');

    if (isAuthed) {
        if (loginContainer) loginContainer.style.display = 'none';
        if (dashboardWrapper) {
            dashboardWrapper.classList.add('active');
            // Load DB data from express server
            initializeData();
        }
    } else {
        if (loginContainer) loginContainer.style.display = 'flex';
        if (dashboardWrapper) dashboardWrapper.classList.remove('active');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const errorMsg = document.getElementById('login-error');

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await res.json();
        
        if (res.ok && data.success) {
            sessionStorage.setItem('admin_auth', 'true');
            sessionStorage.setItem('admin_token', data.token);
            if (errorMsg) errorMsg.style.display = 'none';
            showToast('Login Successful', 'Welcome to your portfolio manager dashboard.', 'success');
            checkAuth();
        } else {
            throw new Error(data.error || "Invalid login credentials.");
        }
    } catch (err) {
        if (errorMsg) errorMsg.style.display = 'block';
        showToast('Authentication Failed', err.message, 'error');
    }
}

function handleLogout() {
    sessionStorage.removeItem('admin_auth');
    sessionStorage.removeItem('admin_token');
    showToast('Logged Out', 'You have successfully logged out.', 'success');
    setTimeout(() => {
        location.reload();
    }, 1000);
}

/*===== THEME SWITCHING IN ADMIN PANEL =====*/
function initTheme() {
    const themeButton = document.getElementById('theme-button');
    const lightTheme = 'light-theme';
    const iconTheme = 'bx-sun';

    const selectedTheme = localStorage.getItem('selected-theme');
    const selectedIcon = localStorage.getItem('selected-icon');

    const getCurrentTheme = () => document.body.classList.contains(lightTheme) ? 'light' : 'dark';
    const getCurrentIcon = () => themeButton.querySelector('i').classList.contains(iconTheme) ? 'bx-sun' : 'bx-moon';

    if (selectedTheme) {
        document.body.classList[selectedTheme === 'light' ? 'add' : 'remove'](lightTheme);
        if(themeButton) {
            themeButton.querySelector('i').className = `bx ${selectedIcon === 'bx-sun' ? 'bx-sun' : 'bx-moon'}`;
        }
    }

    if (themeButton) {
        themeButton.addEventListener('click', () => {
            document.body.classList.toggle(lightTheme);
            const icon = themeButton.querySelector('i');
            if(icon.classList.contains('bx-moon')) {
                icon.className = 'bx bx-sun';
            } else {
                icon.className = 'bx bx-moon';
            }
            localStorage.setItem('selected-theme', getCurrentTheme());
            localStorage.setItem('selected-icon', getCurrentIcon());
        });
    }
}

function initMobileNav() {
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    const sidebar = document.querySelector('.sidebar');

    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            const icon = toggleBtn.querySelector('i');
            if (sidebar.classList.contains('active')) {
                icon.className = 'bx bx-x';
            } else {
                icon.className = 'bx bx-menu';
            }
        });
    }
}

/*===== TAB NAVIGATION =====*/
const tabMeta = {
    dashboard: { title: "Dashboard Overview", subtitle: "Welcome back! Here's your portfolio health summary." },
    skills: { title: "Skills Inventory", subtitle: "Define your engineering talents and adjust metrics bars." },
    projects: { title: "Projects Inventory", subtitle: "Curate and edit projects displayed on your portfolio." },
    education: { title: "Education History", subtitle: "Manage timelines for school qualifications." },
    experience: { title: "Professional Experience", subtitle: "Update corporate internships, roles, and tags." },
    certificates: { title: "Certificates Inventory", subtitle: "Curate, upload and manage your professional certifications." },
    messages: { title: "Inbox Messages", subtitle: "Review submissions received via the contact form." },
    settings: { title: "General Settings", subtitle: "Modify landing copy, page titles, descriptions, and facts." }
};

function switchTab(tabName) {
    const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
    menuItems.forEach(item => {
        if (item.getAttribute('data-tab') === tabName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    if (sidebar && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        if (toggleBtn) toggleBtn.querySelector('i').className = 'bx bx-menu';
    }

    const panels = document.querySelectorAll('.tab-panel');
    panels.forEach(panel => {
        if (panel.id === `panel-${tabName}`) {
            panel.classList.add('active');
        } else {
            panel.classList.remove('active');
        }
    });

    const titleDisp = document.getElementById('tab-title-display');
    const subtitleDisp = document.getElementById('tab-subtitle-display');
    if (titleDisp && subtitleDisp && tabMeta[tabName]) {
        titleDisp.textContent = tabMeta[tabName].title;
        subtitleDisp.textContent = tabMeta[tabName].subtitle;
    }

    // Refresh loaders on tab click
    if (tabName === 'dashboard') {
        loadDashboardStats();
    } else if (tabName === 'skills') {
        loadSkillsList();
    } else if (tabName === 'projects') {
        loadProjectsList();
    } else if (tabName === 'education') {
        loadEducationList();
    } else if (tabName === 'experience') {
        loadExperienceList();
    } else if (tabName === 'certificates') {
        loadCertificatesList();
    } else if (tabName === 'messages') {
        loadInboxMessages();
    } else if (tabName === 'settings') {
        loadSettingsForm();
    }
}

/*===== INITALIZE & LOAD DATA FROM SERVER =====*/
async function initializeData() {
    try {
        currentPortfolioData = await apiRequest('/api/portfolio');
        
        // Render Chart.js line
        renderTrafficChart();
        // Load statistics
        loadDashboardStats();
    } catch(err) {
        showToast("Initialization Error", "Failed to contact Express database APIs.", "error");
    }
}

/*===== DASHBOARD OVERVIEW DETAILS =====*/
function renderTrafficChart() {
    const ctx = document.getElementById('trafficChart');
    if (!ctx) return;

    if (trafficChartInstance) {
        trafficChartInstance.destroy();
    }

    const isLight = document.body.classList.contains('light-theme');
    const primaryColor = '#6366f1';
    const gridColor = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)';
    const textColor = isLight ? '#475569' : '#94a3b8';

    trafficChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Unique Profile Hits',
                data: [320, 410, 390, 520, 480, 290, 350],
                borderColor: primaryColor,
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                pointBackgroundColor: primaryColor,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                },
                y: {
                    grid: { color: gridColor },
                    ticks: { color: textColor }
                }
            }
        }
    });
}

// React to theme change and update chart
document.getElementById('theme-button')?.addEventListener('click', () => {
    setTimeout(renderTrafficChart, 100);
});

async function loadDashboardStats() {
    // Project statistics
    const projects = currentPortfolioData.projects || [];
    document.getElementById('stat-repos').textContent = projects.length;

    // Count React projects inside curation lists
    const reactCount = projects.filter(p => 
        p.name.toLowerCase().includes('react') || 
        (p.description && p.description.toLowerCase().includes('react')) ||
        (p.language && p.language.toLowerCase().includes('react'))
    ).length;
    document.getElementById('stat-react').textContent = reactCount;

    // Messages list from server
    try {
        const messages = await apiRequest('/api/messages');
        document.getElementById('stat-messages').textContent = messages.length;

        const recentList = document.getElementById('recent-messages-list');
        if (recentList) {
            recentList.innerHTML = '';
            if (messages.length === 0) {
                recentList.innerHTML = `
                    <div style="text-align: center; color: var(--text-muted); padding: 1.5rem 0;">
                        <i class='bx bx-check-circle' style="font-size: 1.5rem; display: block; margin-bottom: 0.25rem; color: var(--primary-color);"></i>
                        All messages cleared.
                    </div>
                `;
                return;
            }

            messages.slice(0, 3).forEach(msg => {
                const div = document.createElement('div');
                div.className = `msg-item ${msg.read ? '' : 'unread'}`;
                div.onclick = () => {
                    switchTab('messages');
                    highlightMessage(msg.id);
                };
                div.innerHTML = `
                    <div class="msg-header">
                        <span class="msg-sender">${msg.name}</span>
                        <span class="msg-time">${msg.date.split(',')[0]}</span>
                    </div>
                    <div class="msg-snippet">${msg.message}</div>
                `;
                recentList.appendChild(div);
            });
        }
    } catch(err) {
        console.error("Dashboard stats error fetching messages:", err);
    }
}

/*===== INBOX MESSAGES OPERATIONS =====*/
async function loadInboxMessages() {
    const listContainer = document.getElementById('inbox-messages-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    
    try {
        const messages = await apiRequest('/api/messages');
        
        if (messages.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state glass">
                    <i class='bx bx-envelope-open'></i>
                    <h3>No Messages Found</h3>
                    <p>Submissions sent through your portfolio contact form will render here.</p>
                </div>
            `;
            return;
        }

        messages.forEach(msg => {
            const div = document.createElement('div');
            div.className = `inbox-card glass ${msg.read ? '' : 'unread'}`;
            div.id = `msg-card-${msg.id}`;
            div.innerHTML = `
                <div class="inbox-meta">
                    <div class="inbox-sender-info">
                        <span class="inbox-name">${msg.name}</span>
                        <span class="inbox-email"><i class='bx bx-envelope'></i> ${msg.email}</span>
                    </div>
                    <span class="inbox-date">${msg.date}</span>
                </div>
                <div class="inbox-body">${msg.message}</div>
                <div class="inbox-actions">
                    <button class="btn btn-secondary inbox-btn" onclick="toggleReadStatus(${msg.id})">
                        <i class='bx ${msg.read ? 'bx-envelope' : 'bx-envelope-open'}'></i> Mark as ${msg.read ? 'Unread' : 'Read'}
                    </button>
                    <button class="btn btn-secondary inbox-btn" onclick="deleteMessage(${msg.id})" style="border-color: #ef4444; color: #ef4444;">
                        <i class='bx bx-trash'></i> Delete
                    </button>
                </div>
            `;
            listContainer.appendChild(div);
        });
    } catch(err) {
        listContainer.innerHTML = `<div class="empty-state glass"><p>Error connecting to API.</p></div>`;
    }
}

function filterInbox() {
    const query = document.getElementById('inbox-search').value.toLowerCase().trim();
    const cards = document.querySelectorAll('.inbox-card');

    cards.forEach(card => {
        const name = card.querySelector('.inbox-name').textContent.toLowerCase();
        const body = card.querySelector('.inbox-body').textContent.toLowerCase();
        
        if (name.includes(query) || body.includes(query)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

async function toggleReadStatus(id) {
    try {
        await apiRequest('/api/messages/read', 'POST', { id });
        loadInboxMessages();
        showToast('Status Updated', 'Message read status toggled.', 'success');
    } catch(err) {}
}

async function deleteMessage(id) {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
        await apiRequest('/api/messages', 'DELETE', { id });
        loadInboxMessages();
        showToast('Message Deleted', 'The contact card was deleted.', 'success');
    } catch(err) {}
}

async function clearAllMessages() {
    if (!confirm('Warning: This will permanently delete all inbox messages. Proceed?')) return;
    try {
        await apiRequest('/api/messages', 'DELETE');
        loadInboxMessages();
        showToast('Inbox Cleared', 'All messages successfully deleted.', 'success');
    } catch(err) {}
}

function highlightMessage(id) {
    setTimeout(async () => {
        const card = document.getElementById(`msg-card-${id}`);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.style.borderColor = 'var(--primary-color)';
            card.style.boxShadow = 'var(--glow-shadow)';
            
            // Mark read on server
            try {
                await apiRequest('/api/messages/read', 'POST', { id });
            } catch(e){}
            
            setTimeout(() => {
                card.style.borderColor = '';
                card.style.boxShadow = '';
                loadInboxMessages();
            }, 2500);
        }
    }, 200);
}

/*===== SKILLS INVENTORY MANAGER =====*/
function loadSkillsList() {
    const skills = currentPortfolioData.skills || {};
    
    // Frontend
    const frontendContainer = document.getElementById('editor-skills-frontend');
    frontendContainer.innerHTML = '';
    if (skills.frontend) {
        skills.frontend.forEach((skill, index) => {
            frontendContainer.appendChild(createSkillRowHTML(skill, index, 'frontend'));
        });
    }

    // Backend
    const backendContainer = document.getElementById('editor-skills-backend');
    backendContainer.innerHTML = '';
    if (skills.backend) {
        skills.backend.forEach((skill, index) => {
            backendContainer.appendChild(createSkillRowHTML(skill, index, 'backend'));
        });
    }
}

function createSkillRowHTML(skill, index, cat) {
    const div = document.createElement('div');
    div.className = 'editor-card glass';
    div.innerHTML = `
        <div class="editor-info">
            <div class="editor-icon"><i class='bx ${skill.icon}'></i></div>
            <div>
                <h4 class="editor-title">${skill.name}</h4>
                <div class="editor-subtitle">Proficiency: ${skill.percentage}%</div>
            </div>
        </div>
        <div class="editor-actions">
            <button class="action-btn" onclick="openSkillModal('${cat}', ${index})" title="Edit Skill"><i class='bx bx-edit'></i></button>
            <button class="action-btn action-btn--delete" onclick="deleteSkillItem('${cat}', ${index})" title="Delete Skill"><i class='bx bx-trash'></i></button>
        </div>
    `;
    return div;
}

function openSkillModal(cat = 'frontend', index = null) {
    const modal = document.getElementById('skill-modal');
    const form = document.getElementById('skill-form');
    const title = document.getElementById('skill-modal-title');
    const catGroup = document.getElementById('skill-category-group');

    form.reset();
    modal.classList.add('active');
    
    if (index !== null) {
        const item = currentPortfolioData.skills[cat][index];
        document.getElementById('skill-index').value = index;
        document.getElementById('skill-category').value = cat;
        document.getElementById('skill-name').value = item.name;
        document.getElementById('skill-percentage').value = item.percentage;
        document.getElementById('skill-icon').value = item.icon;
        
        catGroup.style.display = 'none'; // Lock category on edit
        title.textContent = 'Modify Skill Details';
    } else {
        document.getElementById('skill-index').value = '';
        document.getElementById('skill-category').value = '';
        catGroup.style.display = 'block';
        title.textContent = 'Add New Skill';
    }
}

function closeSkillModal() {
    document.getElementById('skill-modal').classList.remove('active');
}

async function saveSkillItem(e) {
    e.preventDefault();
    const indexVal = document.getElementById('skill-index').value;
    const catVal = document.getElementById('skill-category').value;
    
    const name = document.getElementById('skill-name').value.trim();
    const percentage = parseInt(document.getElementById('skill-percentage').value, 10);
    const icon = document.getElementById('skill-icon').value.trim();

    const skills = { ...currentPortfolioData.skills };

    if (indexVal !== '') {
        skills[catVal][indexVal] = { name, percentage, icon };
    } else {
        const selectedCat = document.getElementById('skill-category-select').value;
        if (!skills[selectedCat]) skills[selectedCat] = [];
        skills[selectedCat].push({ name, percentage, icon });
    }

    try {
        await apiRequest('/api/skills', 'POST', skills);
        currentPortfolioData.skills = skills;
        showToast('Skills Saved', 'Skills inventory configuration updated.', 'success');
        closeSkillModal();
        loadSkillsList();
    } catch(err){}
}

async function deleteSkillItem(cat, index) {
    if (!confirm('Are you sure you want to delete this skill?')) return;
    const skills = { ...currentPortfolioData.skills };
    skills[cat].splice(index, 1);

    try {
        await apiRequest('/api/skills', 'POST', skills);
        currentPortfolioData.skills = skills;
        loadSkillsList();
        showToast('Skill Removed', 'The skill was removed.', 'success');
    } catch(err){}
}

/*===== PROJECTS MANAGER TAB (ONE-BY-ONE MANAGER) =====*/
function loadProjectsList() {
    const list = currentPortfolioData.projects || [];
    const container = document.getElementById('editor-projects-list');
    if (!container) return;

    container.innerHTML = '';
    
    if (list.length === 0) {
        container.innerHTML = `
            <div class="empty-state glass">
                <i class='bx bx-folder-open'></i>
                <h3>No Projects Listed</h3>
                <p>Click "Import from GitHub" or "Add Custom Project" to load items one-by-one.</p>
            </div>
        `;
        return;
    }

    list.forEach((proj, index) => {
        const div = document.createElement('div');
        div.className = 'editor-card glass';
        
        // Build media indicators
        let mediaBadges = '';
        if (proj.image) {
            mediaBadges += `<span class="exp-timeline__type exp-timeline__type--intern" style="margin-left: 0.5rem; background: rgba(6, 182, 212, 0.1); color: rgb(6, 182, 212); border: 1px solid rgba(6, 182, 212, 0.2);">📷 Photo</span>`;
        }
        if (proj.video) {
            mediaBadges += `<span class="exp-timeline__type exp-timeline__type--freelance" style="margin-left: 0.5rem; background: rgba(168, 85, 247, 0.1); color: rgb(168, 85, 247); border: 1px solid rgba(168, 85, 247, 0.2);">🎥 Video</span>`;
        }

        div.innerHTML = `
            <div class="editor-info">
                <div class="editor-icon"><i class='bx bx-folder'></i></div>
                <div>
                    <h4 class="editor-title">
                        ${proj.name} 
                        <span class="exp-timeline__type exp-timeline__type--parttime">${proj.category}</span>
                        ${mediaBadges}
                    </h4>
                    <div class="editor-subtitle">${proj.language || 'Codebase'} | <a href="${proj.html_url}" target="_blank" style="color: var(--primary-color); text-decoration: underline;">Github <i class='bx bx-link-external' style="font-size: 0.8rem;"></i></a></div>
                </div>
            </div>
            <div class="editor-actions">
                <button class="action-btn" onclick="openProjectModal(${index})" title="Edit Project"><i class='bx bx-edit'></i></button>
                <button class="action-btn action-btn--delete" onclick="deleteProjectItem(${index})" title="Remove Project"><i class='bx bx-trash'></i></button>
            </div>
        `;
        container.appendChild(div);
    });
}

function openProjectModal(index = null, prefilledData = null) {
    const modal = document.getElementById('project-modal');
    const form = document.getElementById('project-form');
    const title = document.getElementById('project-modal-title');

    form.reset();
    modal.classList.add('active');

    if (index !== null) {
        // Edit Mode
        const item = currentPortfolioData.projects[index];
        document.getElementById('project-index').value = index;
        document.getElementById('proj-name').value = item.name;
        document.getElementById('proj-category').value = item.category;
        document.getElementById('proj-lang').value = item.language || '';
        document.getElementById('proj-desc').value = item.description || '';
        document.getElementById('proj-git').value = item.html_url || '';
        document.getElementById('proj-live').value = item.homepage || '';
        document.getElementById('proj-image').value = item.image || '';
        document.getElementById('proj-video').value = item.video || '';
        title.textContent = 'Modify Project Details';
    } else if (prefilledData) {
        // Prefilled from GitHub Selection
        document.getElementById('project-index').value = '';
        document.getElementById('proj-name').value = prefilledData.name;
        document.getElementById('proj-category').value = prefilledData.category;
        document.getElementById('proj-lang').value = prefilledData.language || '';
        document.getElementById('proj-desc').value = prefilledData.description || '';
        document.getElementById('proj-git').value = prefilledData.html_url || '';
        document.getElementById('proj-live').value = prefilledData.homepage || '';
        document.getElementById('proj-image').value = '';
        document.getElementById('proj-video').value = '';
        title.textContent = 'Confirm Imported GitHub Project';
    } else {
        // Empty Add Mode
        document.getElementById('project-index').value = '';
        document.getElementById('proj-image').value = '';
        document.getElementById('proj-video').value = '';
        title.textContent = 'Add Custom Project';
    }
}

function closeProjectModal() {
    document.getElementById('project-modal').classList.remove('active');
}

async function uploadFiles() {
    const imgInput = document.getElementById('proj-image-file');
    const vidInput = document.getElementById('proj-video-file');
    const certFileInput = document.getElementById('cert-file');
    
    const token = sessionStorage.getItem('admin_token') || '';
    const formData = new FormData();
    let hasFiles = false;
    
    if (imgInput && imgInput.files && imgInput.files[0]) {
        formData.append('image', imgInput.files[0]);
        hasFiles = true;
    }
    if (vidInput && vidInput.files && vidInput.files[0]) {
        formData.append('video', vidInput.files[0]);
        hasFiles = true;
    }
    if (certFileInput && certFileInput.files && certFileInput.files[0]) {
        const file = certFileInput.files[0];
        if (file.type === 'application/pdf') {
            formData.append('pdf', file);
        } else {
            formData.append('image', file);
        }
        hasFiles = true;
    }
    
    if (!hasFiles) return null; // No files selected
    
    const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
            // Note: Don't set Content-Type header; browser must specify multipart boundary
        },
        body: formData
    });
    
    if (response.status === 401 || response.status === 403) {
        sessionStorage.removeItem('admin_auth');
        sessionStorage.removeItem('admin_token');
        checkAuth();
        throw new Error("Session expired. Please log in again.");
    }
    
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || "File upload failed");
    }
    
    return data; // returns { success: true, image: '...', video: '...' }
}

async function saveProjectItem(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnHTML = submitBtn.innerHTML;
    
    // UI Loading indicator
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Uploading files... <i class="bx bx-loader-alt bx-spin"></i>';
    
    let image = document.getElementById('proj-image').value.trim();
    let video = document.getElementById('proj-video').value.trim();
    
    try {
        const uploadResult = await uploadFiles();
        if (uploadResult) {
            if (uploadResult.image) {
                image = uploadResult.image;
                document.getElementById('proj-image').value = image;
            }
            if (uploadResult.video) {
                video = uploadResult.video;
                document.getElementById('proj-video').value = video;
            }
        }
    } catch (err) {
        console.error('File upload failed:', err);
        showToast('Upload Error', 'Could not upload selected media files to server.', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
        return; // Halt saving project details if file upload fails
    }
    
    submitBtn.innerHTML = 'Saving project details... <i class="bx bx-loader-alt bx-spin"></i>';
    
    const indexVal = document.getElementById('project-index').value;
    const name = document.getElementById('proj-name').value.trim();
    const category = document.getElementById('proj-category').value;
    const language = document.getElementById('proj-lang').value.trim();
    const description = document.getElementById('proj-desc').value.trim();
    const html_url = document.getElementById('proj-git').value.trim();
    const homepage = document.getElementById('proj-live').value.trim();

    const projects = [...(currentPortfolioData.projects || [])];

    const projectData = { name, category, language, description, html_url, homepage, image, video };

    if (indexVal !== '') {
        projects[indexVal] = projectData;
    } else {
        projects.push(projectData);
    }

    try {
        await apiRequest('/api/projects', 'POST', projects);
        currentPortfolioData.projects = projects;
        showToast('Project Saved', `"${name}" logged successfully.`, 'success');
        closeProjectModal();
        loadProjectsList();
    } catch(err) {
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
    }
}

async function deleteProjectItem(index) {
    if (!confirm('Are you sure you want to remove this project?')) return;
    const projects = [...(currentPortfolioData.projects || [])];
    projects.splice(index, 1);

    try {
        await apiRequest('/api/projects', 'POST', projects);
        currentPortfolioData.projects = projects;
        loadProjectsList();
        showToast('Project Removed', 'The item was deleted from your portfolio.', 'success');
    } catch(err){}
}

/*===== GITHUB IMPORT LOGIC (ONE-BY-ONE SELECTION) =====*/
async function openGitHubImportModal() {
    const modal = document.getElementById('github-import-modal');
    const loader = document.getElementById('github-repos-loader');
    const list = document.getElementById('github-repos-list');
    const err = document.getElementById('github-repos-error');
    const GITHUB_USERNAME = 'Yasintha-40';

    modal.classList.add('active');
    loader.style.display = 'block';
    list.innerHTML = '';
    err.style.display = 'none';

    try {
        const res = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=100`);
        if (!res.ok) throw new Error('Github connection failed');
        
        const repos = await res.json();
        const publicRepos = repos.filter(repo => !repo.fork);
        
        loader.style.display = 'none';
        
        if (publicRepos.length === 0) {
            list.innerHTML = `<p style="text-align:center; padding: 1.5rem; color: var(--text-muted);">No public repositories found.</p>`;
            return;
        }

        publicRepos.forEach(repo => {
            const div = document.createElement('div');
            div.className = 'msg-item';
            div.style.padding = '0.75rem 1rem';
            
            // Determine category
            let category = "Web App";
            const nameLower = repo.name.toLowerCase();
            if (nameLower.includes('mobile') || nameLower.includes('app') || nameLower.includes('android')) {
                category = "Mobile App";
            }

            div.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="text-align: left; max-width: 75%;">
                        <strong style="font-size: 0.95rem; color: #fff; text-transform: capitalize;">${repo.name.replace(/[-_]/g, ' ')}</strong>
                        <div style="font-size: 0.75rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${repo.description || 'No description listed.'}
                        </div>
                    </div>
                    <button class="btn" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; border-radius: 0.25rem;">
                        Import <i class='bx bx-plus'></i>
                    </button>
                </div>
            `;
            
            // Click to import one-by-one
            div.querySelector('button').onclick = (e) => {
                e.stopPropagation();
                closeGitHubImportModal();
                openProjectModal(null, {
                    name: repo.name.replace(/[-_]/g, ' '),
                    category,
                    language: repo.language || '',
                    description: repo.description || '',
                    html_url: repo.html_url,
                    homepage: repo.homepage || ''
                });
            };

            list.appendChild(div);
        });
    } catch(e) {
        loader.style.display = 'none';
        err.style.display = 'block';
    }
}

function closeGitHubImportModal() {
    document.getElementById('github-import-modal').classList.remove('active');
}

/*===== EDUCATION TIMELINE MANAGER =====*/
let currentEduTags = [];

function loadEducationList() {
    const list = currentPortfolioData.education || [];
    const container = document.getElementById('editor-education-list');
    if(!container) return;

    container.innerHTML = '';
    list.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'editor-card glass';
        div.innerHTML = `
            <div class="editor-info">
                <div class="editor-icon"><i class='bx ${item.icon}'></i></div>
                <div>
                    <h4 class="editor-title">${item.title}</h4>
                    <div class="editor-subtitle">${item.subtitle} | ${item.date}</div>
                </div>
            </div>
            <div class="editor-actions">
                <button class="action-btn" onclick="openEducationModal(${index})" title="Edit"><i class='bx bx-edit'></i></button>
                <button class="action-btn action-btn--delete" onclick="deleteEducationItem(${index})" title="Delete"><i class='bx bx-trash'></i></button>
            </div>
        `;
        container.appendChild(div);
    });
}

function openEducationModal(index = null) {
    const modal = document.getElementById('education-modal');
    const form = document.getElementById('education-form');
    const title = document.getElementById('education-modal-title');
    const bulletsList = document.getElementById('edu-bullets-list');
    const tagsContainer = document.getElementById('edu-tags-container');

    form.reset();
    bulletsList.innerHTML = '';
    tagsContainer.innerHTML = '';
    currentEduTags = [];
    modal.classList.add('active');

    if (index !== null) {
        const item = currentPortfolioData.education[index];

        document.getElementById('education-index').value = index;
        document.getElementById('edu-date').value = item.date;
        document.getElementById('edu-title').value = item.title;
        document.getElementById('edu-subtitle').value = item.subtitle;
        document.getElementById('edu-desc').value = item.desc;
        document.getElementById('edu-icon').value = item.icon;

        if (item.bullets) {
            item.bullets.forEach(b => addBulletField('edu-bullets-list', b));
        }
        
        if (item.tags) {
            currentEduTags = [...item.tags];
            renderTags('edu-tags-container', currentEduTags);
        }

        title.textContent = 'Modify Education Event';
    } else {
        document.getElementById('education-index').value = '';
        addBulletField('edu-bullets-list');
        title.textContent = 'Add Education Event';
    }
}

function closeEducationModal() {
    document.getElementById('education-modal').classList.remove('active');
}

async function saveEducationItem(e) {
    e.preventDefault();
    const indexVal = document.getElementById('education-index').value;
    const date = document.getElementById('edu-date').value.trim();
    const title = document.getElementById('edu-title').value.trim();
    const subtitle = document.getElementById('edu-subtitle').value.trim();
    const desc = document.getElementById('edu-desc').value.trim();
    const icon = document.getElementById('edu-icon').value.trim();

    const bulletInputs = document.querySelectorAll('#edu-bullets-list input');
    const bullets = Array.from(bulletInputs).map(inp => inp.value.trim()).filter(val => val !== '');

    const education = [...(currentPortfolioData.education || [])];
    
    const itemData = { date, title, subtitle, desc, icon, bullets, tags: currentEduTags };

    if (indexVal !== '') {
        education[indexVal] = itemData;
    } else {
        education.push(itemData);
    }

    try {
        await apiRequest('/api/education', 'POST', education);
        currentPortfolioData.education = education;
        showToast('Education Saved', 'Education timeline modified.', 'success');
        closeEducationModal();
        loadEducationList();
    } catch(err){}
}

async function deleteEducationItem(index) {
    if (!confirm('Are you sure you want to remove this education event?')) return;
    const education = [...(currentPortfolioData.education || [])];
    education.splice(index, 1);

    try {
        await apiRequest('/api/education', 'POST', education);
        currentPortfolioData.education = education;
        loadEducationList();
        showToast('Event Removed', 'Timeline card deleted.', 'success');
    } catch(err){}
}

/*===== EXPERIENCE TIMELINE MANAGER =====*/
let currentExpTags = [];

function loadExperienceList() {
    const list = currentPortfolioData.experience || [];
    const container = document.getElementById('editor-experience-list');
    if(!container) return;

    container.innerHTML = '';
    list.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'editor-card glass';
        div.innerHTML = `
            <div class="editor-info">
                <div class="editor-icon"><i class='bx ${item.icon}'></i></div>
                <div>
                    <h4 class="editor-title">${item.title} <span class="exp-timeline__type ${item.typeClass}">${item.type}</span></h4>
                    <div class="editor-subtitle">${item.company} | ${item.date}</div>
                </div>
            </div>
            <div class="editor-actions">
                <button class="action-btn" onclick="openExperienceModal(${index})" title="Edit"><i class='bx bx-edit'></i></button>
                <button class="action-btn action-btn--delete" onclick="deleteExperienceItem(${index})" title="Delete"><i class='bx bx-trash'></i></button>
            </div>
        `;
        container.appendChild(div);
    });
}

function openExperienceModal(index = null) {
    const modal = document.getElementById('experience-modal');
    const form = document.getElementById('experience-form');
    const title = document.getElementById('experience-modal-title');
    const bulletsList = document.getElementById('exp-bullets-list');
    const tagsContainer = document.getElementById('exp-tags-container');

    form.reset();
    bulletsList.innerHTML = '';
    tagsContainer.innerHTML = '';
    currentExpTags = [];
    modal.classList.add('active');

    if (index !== null) {
        const item = currentPortfolioData.experience[index];

        document.getElementById('experience-index').value = index;
        document.getElementById('exp-date').value = item.date;
        document.getElementById('exp-title').value = item.title;
        document.getElementById('exp-type').value = item.type;
        document.getElementById('exp-company').value = item.company;
        document.getElementById('exp-icon').value = item.icon;

        let themeVal = 'parttime';
        if (item.typeClass.includes('--intern')) themeVal = 'intern';
        else if (item.typeClass.includes('--freelance')) themeVal = 'freelance';
        document.getElementById('exp-type-theme').value = themeVal;

        if (item.bullets) {
            item.bullets.forEach(b => addBulletField('exp-bullets-list', b));
        }
        
        if (item.tags) {
            currentExpTags = [...item.tags];
            renderTags('exp-tags-container', currentExpTags);
        }

        title.textContent = 'Modify Experience Event';
    } else {
        document.getElementById('experience-index').value = '';
        addBulletField('exp-bullets-list');
        title.textContent = 'Add Experience Event';
    }
}

function closeExperienceModal() {
    document.getElementById('experience-modal').classList.remove('active');
}

async function saveExperienceItem(e) {
    e.preventDefault();
    const indexVal = document.getElementById('experience-index').value;
    const date = document.getElementById('exp-date').value.trim();
    const title = document.getElementById('exp-title').value.trim();
    const type = document.getElementById('exp-type').value.trim();
    const company = document.getElementById('exp-company').value.trim();
    const icon = document.getElementById('exp-icon').value.trim();
    const themeSelect = document.getElementById('exp-type-theme').value;

    let typeClass = 'exp-timeline__type--parttime';
    let themeColor = '#10b981';
    let themeColorRGB = '16, 185, 129';

    if (themeSelect === 'intern') {
        typeClass = 'exp-timeline__type--intern';
        themeColor = 'var(--secondary-color)';
        themeColorRGB = '6, 182, 212';
    } else if (themeSelect === 'freelance') {
        typeClass = 'exp-timeline__type--freelance';
        themeColor = 'var(--accent-color)';
        themeColorRGB = '168, 85, 247';
    }

    const bulletInputs = document.querySelectorAll('#exp-bullets-list input');
    const bullets = Array.from(bulletInputs).map(inp => inp.value.trim()).filter(val => val !== '');

    const experience = [...(currentPortfolioData.experience || [])];
    
    const itemData = {
        date, title, type, typeClass, company, bullets, tags: currentExpTags, icon, themeColor, themeColorRGB
    };

    if (indexVal !== '') {
        experience[indexVal] = itemData;
    } else {
        experience.push(itemData);
    }

    try {
        await apiRequest('/api/experience', 'POST', experience);
        currentPortfolioData.experience = experience;
        showToast('Experience Saved', 'Role specifications updated.', 'success');
        closeExperienceModal();
        loadExperienceList();
    } catch(err){}
}

async function deleteExperienceItem(index) {
    if (!confirm('Are you sure you want to remove this experience card?')) return;
    const experience = [...(currentPortfolioData.experience || [])];
    experience.splice(index, 1);

    try {
        await apiRequest('/api/experience', 'POST', experience);
        currentPortfolioData.experience = experience;
        loadExperienceList();
        showToast('Event Removed', 'Experience card deleted.', 'success');
    } catch(err){}
}

/*===== CERTIFICATES MANAGER =====*/
function loadCertificatesList() {
    const list = currentPortfolioData.certificates || [];
    const container = document.getElementById('editor-certificates-list');
    if (!container) return;

    container.innerHTML = '';
    
    if (list.length === 0) {
        container.innerHTML = `
            <div class="empty-state glass">
                <i class='bx bx-award'></i>
                <h3>No Certificates Found</h3>
                <p>Click "Add New Certificate" to log certification details.</p>
            </div>
        `;
        return;
    }

    list.forEach((cert, index) => {
        const div = document.createElement('div');
        div.className = 'editor-card glass';
        
        let fileBadge = '';
        if (cert.pdf || cert.image) {
            fileBadge = `<span class="exp-timeline__type exp-timeline__type--intern" style="margin-left: 0.5rem; background: rgba(6, 182, 212, 0.1); color: rgb(6, 182, 212); border: 1px solid rgba(6, 182, 212, 0.2);">📄 Doc</span>`;
        }

        div.innerHTML = `
            <div class="editor-info">
                <div class="editor-icon"><i class='bx bx-award'></i></div>
                <div>
                    <h4 class="editor-title">
                        ${cert.name} 
                        ${fileBadge}
                    </h4>
                    <div class="editor-subtitle">${cert.issuer} | Issued: ${cert.date}</div>
                </div>
            </div>
            <div class="editor-actions">
                <button class="action-btn" onclick="openCertificateModal(${index})" title="Edit"><i class='bx bx-edit'></i></button>
                <button class="action-btn action-btn--delete" onclick="deleteCertificateItem(${index})" title="Remove"><i class='bx bx-trash'></i></button>
            </div>
        `;
        container.appendChild(div);
    });
}

function openCertificateModal(index = null) {
    const modal = document.getElementById('certificate-modal');
    const form = document.getElementById('certificate-form');
    const title = document.getElementById('certificate-modal-title');

    form.reset();
    modal.classList.add('active');

    if (index !== null) {
        const item = currentPortfolioData.certificates[index];
        document.getElementById('certificate-index').value = index;
        document.getElementById('cert-name').value = item.name;
        document.getElementById('cert-issuer').value = item.issuer;
        document.getElementById('cert-date').value = item.date;
        document.getElementById('cert-url').value = item.credential_url || '';
        document.getElementById('cert-doc-path').value = item.pdf || item.image || '';
        title.textContent = 'Modify Certificate Details';
    } else {
        document.getElementById('certificate-index').value = '';
        title.textContent = 'Add New Certificate';
    }
}

function closeCertificateModal() {
    document.getElementById('certificate-modal').classList.remove('active');
}

async function saveCertificateItem(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnHTML = submitBtn.innerHTML;
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Uploading files... <i class="bx bx-loader-alt bx-spin"></i>';
    
    let docPath = document.getElementById('cert-doc-path').value.trim();
    let pdf = '';
    let image = '';
    
    if (docPath) {
        if (docPath.toLowerCase().endsWith('.pdf')) {
            pdf = docPath;
        } else {
            image = docPath;
        }
    }
    
    try {
        const uploadResult = await uploadFiles();
        if (uploadResult) {
            if (uploadResult.pdf) {
                pdf = uploadResult.pdf;
                document.getElementById('cert-doc-path').value = pdf;
            }
            if (uploadResult.image) {
                image = uploadResult.image;
                document.getElementById('cert-doc-path').value = image;
            }
        }
    } catch (err) {
        console.error('File upload failed:', err);
        showToast('Upload Error', 'Could not upload selected certificate document.', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
        return;
    }
    
    submitBtn.innerHTML = 'Saving certificate... <i class="bx bx-loader-alt bx-spin"></i>';
    
    const indexVal = document.getElementById('certificate-index').value;
    const name = document.getElementById('cert-name').value.trim();
    const issuer = document.getElementById('cert-issuer').value.trim();
    const date = document.getElementById('cert-date').value.trim();
    const credential_url = document.getElementById('cert-url').value.trim();

    const certificates = [...(currentPortfolioData.certificates || [])];
    const certData = { name, issuer, date, credential_url, image, pdf };

    if (indexVal !== '') {
        certificates[indexVal] = certData;
    } else {
        certificates.push(certData);
    }

    try {
        await apiRequest('/api/certificates', 'POST', certificates);
        currentPortfolioData.certificates = certificates;
        showToast('Certificate Saved', `"${name}" logged successfully.`, 'success');
        closeCertificateModal();
        loadCertificatesList();
    } catch(err) {
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
    }
}

async function deleteCertificateItem(index) {
    if (!confirm('Are you sure you want to remove this certificate?')) return;
    const certificates = [...(currentPortfolioData.certificates || [])];
    certificates.splice(index, 1);

    try {
        await apiRequest('/api/certificates', 'POST', certificates);
        currentPortfolioData.certificates = certificates;
        loadCertificatesList();
        showToast('Certificate Removed', 'The item was deleted from your portfolio.', 'success');
    } catch(err){}
}

/*===== FORM UTILITY DYNAMIC ACTIONS (BULLETS & TAGS) =====*/
function addBulletField(containerId, text = '') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const div = document.createElement('div');
    div.className = 'bullet-input-row';
    div.innerHTML = `
        <input type="text" value="${text.replace(/"/g, '&quot;')}" placeholder="Enter detail bullet point text..." class="form-input" style="flex-grow: 1;">
        <button type="button" class="action-btn action-btn--delete" onclick="this.parentElement.remove()"><i class='bx bx-minus'></i></button>
    `;
    container.appendChild(div);
}

function addTagField(inputId, containerId) {
    const input = document.getElementById(inputId);
    const tagText = input.value.trim();
    if (tagText === '') return;

    if (containerId.includes('edu')) {
        if (!currentEduTags.includes(tagText)) {
            currentEduTags.push(tagText);
            renderTags(containerId, currentEduTags);
        }
    } else {
        if (!currentExpTags.includes(tagText)) {
            currentExpTags.push(tagText);
            renderTags(containerId, currentExpTags);
        }
    }
    input.value = '';
}

function renderTags(containerId, tagsArray) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    tagsArray.forEach((tag, idx) => {
        const span = document.createElement('span');
        span.className = 'editor-tag';
        span.innerHTML = `
            ${tag} <i class='bx bx-x' onclick="removeTagAt('${containerId}', ${idx})"></i>
        `;
        container.appendChild(span);
    });
}

function removeTagAt(containerId, idx) {
    if (containerId.includes('edu')) {
        currentEduTags.splice(idx, 1);
        renderTags(containerId, currentEduTags);
    } else {
        currentExpTags.splice(idx, 1);
        renderTags(containerId, currentExpTags);
    }
}

/*===== PROFILE SETTINGS =====*/
function loadSettingsForm() {
    const profile = currentPortfolioData.profile || {};

    document.getElementById('settings-name').value = profile.name || '';
    document.getElementById('settings-titles').value = (profile.titles || []).join(', ');
    document.getElementById('settings-desc').value = profile.description || '';
    document.getElementById('settings-about-title').value = profile.aboutTitle || '';
    document.getElementById('settings-about-text').value = profile.aboutText || '';
    document.getElementById('settings-about-edu').value = profile.aboutEducation || '';
    document.getElementById('settings-about-proj').value = profile.aboutProjects || '';
}

async function saveSettings(e) {
    e.preventDefault();
    
    const name = document.getElementById('settings-name').value.trim();
    const titlesText = document.getElementById('settings-titles').value.trim();
    const description = document.getElementById('settings-desc').value.trim();
    const aboutTitle = document.getElementById('settings-about-title').value.trim();
    const aboutText = document.getElementById('settings-about-text').value.trim();
    const aboutEducation = document.getElementById('settings-about-edu').value.trim();
    const aboutProjects = document.getElementById('settings-about-proj').value.trim();

    const titles = titlesText.split(',').map(t => t.trim()).filter(t => t !== '');

    const profile = { name, titles, description, aboutTitle, aboutText, aboutEducation, aboutProjects };

    try {
        await apiRequest('/api/profile', 'POST', profile);
        currentPortfolioData.profile = profile;
        showToast('Settings Saved', 'Profile settings updated successfully.', 'success');
    } catch(err){}
}

/*===== TOAST NOTIFICATION UTILITY =====*/
function showToast(title, message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconClass = type === 'success' ? 'bx-check-circle' : 'bx-error-circle';

    toast.innerHTML = `
        <div class="toast__icon"><i class='bx ${iconClass}'></i></div>
        <div class="toast__content">
            <h4 class="toast__title">${title}</h4>
            <p class="toast__message">${message}</p>
        </div>
        <i class='bx bx-x toast__close'></i>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show-toast');
    }, 50);

    const autoClose = setTimeout(() => {
        toast.classList.remove('show-toast');
        setTimeout(() => toast.remove(), 400);
    }, 4000);

    const closeBtn = toast.querySelector('.toast__close');
    closeBtn.addEventListener('click', () => {
        clearTimeout(autoClose);
        toast.classList.remove('show-toast');
        setTimeout(() => toast.remove(), 400);
    });
}
