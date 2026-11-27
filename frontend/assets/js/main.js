/*===== DEFAULT PORTFOLIO DATA =====*/
const defaultProfile = {
    name: 'Yasintha',
    titles: ["Web Developer", "Software Engineer", "UI/UX Designer", "IT Student @ SLIIT"],
    description: 'Software Engineering Student at the Sri Lanka Institute of Information Technology (SLIIT). I design and build highly interactive, modern web and mobile applications with an eye for premium user experiences.',
    aboutTitle: 'Developing Software to Solve Real Problems',
    aboutText: 'I am a dedicated IT undergraduate student specializing in Software Engineering at SLIIT. Passionate about exploring computer technologies, web design, and full-stack development. I enjoy writing clean, semantic code and designing engaging interfaces that connect users with technology.',
    aboutEducation: 'BSc (Hons) in IT (SE) at SLIIT',
    aboutProjects: '5 Completed Apps'
};

const defaultSkills = {
    frontend: [
        { name: 'HTML5', percentage: 95, icon: 'bxl-html5' },
        { name: 'CSS3 & Tailwind', percentage: 85, icon: 'bxl-css3' },
        { name: 'JavaScript', percentage: 75, icon: 'bxl-javascript' },
        { name: 'React JS', percentage: 75, icon: 'bxl-react' },
        { name: 'UI/UX Design', percentage: 80, icon: 'bxs-paint' }
    ],
    backend: [
        { name: 'PHP & Laravel', percentage: 80, icon: 'bxl-php' },
        { name: 'MySQL & databases', percentage: 85, icon: 'bxs-data' },
        { name: 'React Native / Mobile', percentage: 70, icon: 'bxl-react' },
        { name: 'Git & GitHub', percentage: 90, icon: 'bxl-git' }
    ]
};

const defaultEducation = [
    {
        date: '2023 - Present',
        title: 'BSc (Hons) in Information Technology',
        subtitle: 'Sri Lanka Institute of Information Technology (SLIIT)',
        desc: 'Specializing in Software Engineering. Learning comprehensive engineering principles, modern software design architectures, and advanced programming paradigms.',
        bullets: [
            '<strong>Core Modules:</strong> Web Application Development, Database Management Systems, Data Structures & Algorithms, Object-Oriented Programming (Java/C++), and Agile Methodologies.',
            '<strong>Key Project Portfolio:</strong> Developed a Tourism Portal Web Application using PHP and MySQL database integration; built dynamic React dashboard elements using REST APIs.',
            '<strong>Extracurriculars:</strong> Active member of the SLIIT Computer Society, collaborating in team hackathons and software coding challenges.'
        ],
        tags: ['Java', 'C++', 'PHP', 'React', 'MySQL', 'Agile'],
        icon: 'bx-graduation'
    },
    {
        date: '2020 - 2022',
        title: 'G.C.E. Advanced Level (A/L)',
        subtitle: 'Commerce Stream · Mo/Medagama National School',
        desc: 'Completed secondary education in Commerce Stream, focusing on Accounting, Business Studies, and Economics to build a solid business intelligence and financial foundation.',
        bullets: [
            'Acquired strong business analysis, decision-making, and financial problem-solving skills through advanced commercial and economic principles.',
            'Active member of the school Commerce Society and participated in regional youth entrepreneurship seminars.'
        ],
        tags: ['Accounting', 'Business Studies', 'Economics'],
        icon: 'bx-book-open'
    },
    {
        date: '2014 - 2019',
        title: 'G.C.E. Ordinary Level (O/L)',
        subtitle: 'Secondary School Education · Mo/Medagama National School',
        desc: 'Completed junior secondary school curriculum with high honors and outstanding academic distinction across core disciplines.',
        bullets: [
            '<strong>Academic Achievement:</strong> Successfully passed G.C.E. Ordinary Level examination with 9 \'A\' (Distinction) grades including Mathematics, Science, English, and Information Technology.',
            '<strong>Leadership & Activities:</strong> Selected as a Junior Prefect and represented the school in regional IT and science exhibitions.'
        ],
        tags: ['ICT', 'Mathematics', 'English', 'Leadership'],
        icon: 'bx-book-bookmark'
    }
];

const defaultExperience = [
    {
        date: 'May 2026 – Present',
        title: 'Software Development Intern',
        type: 'Internship',
        typeClass: 'exp-timeline__type--intern',
        company: 'Sri Lanka Tourism Development Authority (SLTDA)',
        bullets: [
            'Developed a Pension Scheme Management System to streamline pension-related administrative processes and data management.',
            'Developed Tourist Guide ID Printing and Inspection Officer ID Printing Systems to simplify information management, ID card generation, and printing.',
            'Contributed to the redesign and development of the new Sri Lanka Travel official website (srilanka.travel), focusing on responsive design, UI/UX improvements, functionality, and SEO optimization.',
            'Maintained and enhanced the existing Sri Lanka Travel official website through content updates, bug fixes, troubleshooting, and functionality improvements.',
            'Performed full-stack development, database management, system integration, software testing, debugging, and collaborative development using version control.'
        ],
        tags: ['React.js', 'JavaScript', 'HTML', 'CSS', 'PHP', 'MySQL', 'Git', 'GitHub', 'Figma', 'Adobe Photoshop', 'XAMPP', 'VS Code'],
        icon: 'bx-code-block',
        themeColor: 'var(--secondary-color)',
        themeColorRGB: '6, 182, 212'
    }
];

const defaultCertificates = [
    {
        name: 'Responsive Web Design',
        issuer: 'freeCodeCamp',
        date: '2024',
        image: '',
        pdf: '',
        credential_url: 'https://freecodecamp.org/'
    }
];

// Load profile data
const profileData = JSON.parse(localStorage.getItem('portfolio_profile')) || defaultProfile;

const navMenu = document.getElementById('nav-menu'),
      navToggle = document.getElementById('nav-toggle'),
      navLinks = document.querySelectorAll('.nav__link')


if(navToggle && navMenu){
    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('show-menu')
        navToggle.setAttribute('aria-expanded', String(navMenu.classList.contains('show-menu')))
    })
}


function linkAction(){
    navMenu.classList.remove('show-menu')
    if (navToggle) navToggle.setAttribute('aria-expanded', 'false')
}
document.querySelectorAll('[role="button"][tabindex="0"]').forEach(control => {
    control.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            control.click()
        }
    })
})
navLinks.forEach(n => n.addEventListener('click', linkAction))


const sections = document.querySelectorAll('section[id]')

function scrollActive(){
    const scrollY = window.pageYOffset

    sections.forEach(current =>{
        const sectionHeight = current.offsetHeight,
              sectionTop = current.offsetTop - 58,
              sectionId = current.getAttribute('id'),
              sectionLink = document.querySelector('.nav__menu a[href*=' + sectionId + ']')
        
        if(sectionLink) {
            if(scrollY > sectionTop && scrollY <= sectionTop + sectionHeight){
                sectionLink.classList.add('active-link')
            }else{
                sectionLink.classList.remove('active-link')
            }
        }
    })
}
window.addEventListener('scroll', scrollActive)


function scrollUp(){
    const scrollUpBtn = document.getElementById('scroll-up');
    
    if(this.scrollY >= 350) scrollUpBtn.classList.add('show-scroll'); 
    else scrollUpBtn.classList.remove('show-scroll')
}
window.addEventListener('scroll', scrollUp)


const themeButton = document.getElementById('theme-button')
const lightTheme = 'light-theme'
const iconTheme = 'bx-sun'

const selectedTheme = localStorage.getItem('selected-theme')
const selectedIcon = localStorage.getItem('selected-icon')


const getCurrentTheme = () => document.body.classList.contains(lightTheme) ? 'light' : 'dark'
const getCurrentIcon = () => themeButton.querySelector('i').classList.contains(iconTheme) ? 'bx-sun' : 'bx-moon'


if (selectedTheme) {
  document.body.classList[selectedTheme === 'light' ? 'add' : 'remove'](lightTheme)
  themeButton.querySelector('i').className = `bx ${selectedIcon === 'bx-sun' ? 'bx-sun' : 'bx-moon'}`
}


themeButton.addEventListener('click', () => {
    
    document.body.classList.toggle(lightTheme)
    
    const icon = themeButton.querySelector('i')
    if(icon.classList.contains('bx-moon')) {
        icon.className = 'bx bx-sun'
    } else {
        icon.className = 'bx bx-moon'
    }
    
    localStorage.setItem('selected-theme', getCurrentTheme())
    localStorage.setItem('selected-icon', getCurrentIcon())
})


const typedText = document.getElementById('typed-text')
let words = profileData.titles || defaultProfile.titles
let wordIndex = 0
let charIndex = 0
let isDeleting = false

function typeEffect() {
    if(!typedText) return;

    const currentWord = words[wordIndex]
    
    if (isDeleting) {
        typedText.textContent = currentWord.substring(0, charIndex - 1)
        charIndex--
    } else {
        typedText.textContent = currentWord.substring(0, charIndex + 1)
        charIndex++
    }

    let typeSpeed = 100
    if (isDeleting) {
        typeSpeed /= 2 
    }

    if (!isDeleting && charIndex === currentWord.length) {
        typeSpeed = 2000 
        isDeleting = true
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false
        wordIndex = (wordIndex + 1) % words.length
        typeSpeed = 400 
    }

    setTimeout(typeEffect, typeSpeed)
}

/*===== DYNAMIC RENDERING LOADERS =====*/
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const safePublicURL = value => {
    const candidate = String(value || '');
    if (['/assets/uploads/1783915516862-830469790.pdf', '/assets/uploads/1795680342064-697995500.pdf', '/assets/pdf/Yasintha_Randika_CV.pdf'].includes(candidate)) return '';
    if (/^\/assets\/(?!\/)[a-zA-Z0-9_./-]+$/.test(candidate) && !candidate.split('/').includes('..')) return candidate;
    try { const url = new URL(candidate); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch { return ''; }
};
const safeEducationBullet = value => escapeHTML(value).replace(/&lt;strong&gt;/gi, '<strong>').replace(/&lt;\/strong&gt;/gi, '</strong>');
function renderProfile() {
    const profile = portfolioData.profile || defaultProfile;
    
    const heroTitle = document.querySelector('.home__title');
    if (heroTitle) {
        heroTitle.innerHTML = `Hi, I'm <span class="home__title-color">${escapeHTML(profile.name)}</span>`;
    }
    
    const heroDesc = document.querySelector('.home__description');
    if (heroDesc) {
        heroDesc.textContent = profile.description;
    }
    
    const aboutSubtitle = document.querySelector('.about__subtitle');
    if (aboutSubtitle) {
        aboutSubtitle.textContent = profile.aboutTitle;
    }
    
    const aboutText = document.querySelector('.about__text');
    if (aboutText) {
        aboutText.textContent = profile.aboutText;
    }
    
    const aboutEdu = document.querySelector('.about__detail-card:nth-child(1) .about__detail-subtitle');
    if (aboutEdu) {
        aboutEdu.textContent = profile.aboutEducation;
    }
    
    const aboutProj = document.querySelector('.about__detail-card:nth-child(2) .about__detail-subtitle');
    if (aboutProj) {
        aboutProj.textContent = profile.aboutProjects;
    }
}

function renderSkills() {
    const skills = portfolioData.skills || defaultSkills;
    const skillsContainer = document.getElementById('skills-container');
    if (!skillsContainer) return;
    const escapeSkillText = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    const configuredSkills = [...(skills.frontend || []), ...(skills.backend || [])];
    const toolsHTML = configuredSkills.map(skill => `
        <div class="skills__data">
          <div class="skills__names">
            <span class="skills__name-item"><i class="bx ${escapeSkillText(skill.icon)} skills__icon"></i> ${escapeSkillText(skill.name)}</span>
          </div>
        </div>
    `).join('');
    skillsContainer.innerHTML = `
        <div class="skills__category glass">
          <h3 class="skills__category-title"><i class="bx bx-code-alt"></i> GitHub Code Languages</h3>
          <p class="skills__source" id="github-language-source">Loading verified GitHub language usage…</p>
          <div class="skills__list" id="github-language-list"></div>
        </div>
        <div class="skills__category glass">
          <h3 class="skills__category-title"><i class="bx bx-server"></i> Skills & Technologies</h3>
          <div class="skills__list">${toolsHTML}</div>
        </div>
    `;
}

function renderGitHubLanguageStats(stats) {
    const list = document.getElementById('github-language-list');
    const source = document.getElementById('github-language-source');
    if (!list || !source) return;
    list.replaceChildren();
    stats.languages.forEach(language => {
        const item = document.createElement('div');
        item.className = 'skills__data';
        const names = document.createElement('div');
        names.className = 'skills__names';
        const name = document.createElement('span');
        name.className = 'skills__name-item';
        name.textContent = language.name;
        const percentage = document.createElement('span');
        percentage.className = 'skills__percentage';
        percentage.textContent = language.percentage === 0 ? '<0.1%' : `${language.percentage.toFixed(1)}%`;
        names.append(name, percentage);
        const barBackground = document.createElement('div');
        barBackground.className = 'skills__bar-bg';
        const bar = document.createElement('span');
        bar.className = 'skills__bar';
        bar.dataset.width = `${Math.max(language.percentage, 0.1)}%`;
        bar.setAttribute('role', 'progressbar');
        bar.setAttribute('aria-label', `${language.name} share of public GitHub code`);
        bar.setAttribute('aria-valuemin', '0');
        bar.setAttribute('aria-valuemax', '100');
        bar.setAttribute('aria-valuenow', String(language.percentage));
        barBackground.appendChild(bar);
        item.append(names, barBackground);
        list.appendChild(item);
    });
    const date = new Date(stats.updatedAt).toLocaleDateString();
    source.textContent = `${stats.stale ? 'Older cached' : 'Cached'} GitHub snapshot: ${stats.repositoryCount} public, non-fork repositories · ${stats.totalBytes.toLocaleString()} code bytes · ${date}. Percentages are rounded.`;
    initSkillProgress();
}

function renderGitHubLanguageError(error) {
    console.warn('GitHub language usage unavailable:', error);
    const source = document.getElementById('github-language-source');
    if (!source) return;
    source.textContent = error.message.includes('Too many repositories')
        ? 'A complete breakdown needs more GitHub API requests than the public limit allows. No partial percentages are shown.'
        : 'GitHub language usage is temporarily unavailable. No estimated percentages are shown.';
}

function renderEducation() {
    const education = portfolioData.education || defaultEducation;
    const timeline = document.getElementById('education-timeline');
    if (!timeline) return;
    
    let html = '';
    education.forEach(item => {
        let bulletsHTML = '';
        if (item.bullets && item.bullets.length > 0) {
            item.bullets.forEach(bullet => {
                bulletsHTML += `<li>${safeEducationBullet(bullet)}</li>`;
            });
        }
        
        let tagsHTML = '';
        if (item.tags && item.tags.length > 0) {
            item.tags.forEach(tag => {
                tagsHTML += `<span class="edu-tag">${escapeHTML(tag)}</span>`;
            });
        }

        html += `
          <div class="timeline__item glass">
            <div class="timeline__marker">
              <i class='bx ${escapeHTML(item.icon)} timeline__icon'></i>
            </div>
            <div class="timeline__content">
              <span class="timeline__date">${escapeHTML(item.date)}</span>
              <h3 class="timeline__title">${escapeHTML(item.title)}</h3>
              <h4 class="timeline__subtitle">${escapeHTML(item.subtitle)}</h4>
              <p class="timeline__desc">${escapeHTML(item.desc)}</p>
              
              <ul class="education__bullets">
                ${bulletsHTML}
              </ul>
              
              <div class="education__tags">
                ${tagsHTML}
              </div>
            </div>
          </div>
        `;
    });
    
    timeline.innerHTML = html;
}

function renderExperience() {
    const experience = portfolioData.experience || defaultExperience;
    const timeline = document.getElementById('experience-timeline');
    if (!timeline) return;
    
    let html = '';
    experience.forEach(item => {
        let bulletsHTML = '';
        if (item.bullets && item.bullets.length > 0) {
            item.bullets.forEach(bullet => {
                bulletsHTML += `<li>${escapeHTML(bullet)}</li>`;
            });
        }
        
        let tagsHTML = '';
        if (item.tags && item.tags.length > 0) {
            item.tags.forEach(tag => {
                tagsHTML += `<span class="exp-tag">${escapeHTML(tag)}</span>`;
            });
        }

        html += `
          <div class="exp-timeline__item glass" style="border-top-color: ${escapeHTML(item.themeColor)}; --item-color: ${escapeHTML(item.themeColor)}; --item-color-rgb: ${escapeHTML(item.themeColorRGB)};">
            <div class="exp-timeline__marker" style="background: ${escapeHTML(item.themeColor)}; box-shadow: 0 0 15px rgba(${escapeHTML(item.themeColorRGB)}, 0.45);">
              <i class='bx ${escapeHTML(item.icon)} exp-timeline__icon'></i>
            </div>
            <div class="exp-timeline__content">
              <div class="exp-timeline__header">
                <div>
                  <span class="exp-timeline__date" style="color: ${escapeHTML(item.themeColor)}; background: rgba(${escapeHTML(item.themeColorRGB)}, 0.08); border-color: rgba(${escapeHTML(item.themeColorRGB)}, 0.18);"><i class='bx bx-calendar'></i> ${escapeHTML(item.date)}</span>
                  <h3 class="exp-timeline__title">${escapeHTML(item.title)} <span class="exp-timeline__type ${escapeHTML(item.typeClass)}">${escapeHTML(item.type)}</span></h3>
                  <h4 class="exp-timeline__company"><i class='bx bx-buildings'></i> ${escapeHTML(item.company)}</h4>
                </div>
              </div>
              <ul class="exp-timeline__bullets">
                ${bulletsHTML}
              </ul>
              <div class="exp-timeline__tags">
                ${tagsHTML}
              </div>
            </div>
          </div>
        `;
    });
    
    timeline.innerHTML = html;
}

function renderCertificates() {
    const certificates = portfolioData.certificates || defaultCertificates;
    const container = document.getElementById('certificates-container');
    if (!container) return;

    let html = '';
    certificates.forEach(cert => {
        let linksHTML = '';
        if (cert.credential_url) {
            const url = safePublicURL(cert.credential_url);
            if (url) linksHTML += `<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer" class="certificates__btn certificates__btn-primary">View Credential <i class='bx bx-link-external'></i></a>`;
        }
        
        // Show local document (PDF or image) if uploaded
        let docPath = safePublicURL(cert.pdf) || safePublicURL(cert.image);
        if (docPath) {
            linksHTML += `<a href="${escapeHTML(docPath)}" target="_blank" rel="noopener noreferrer" class="certificates__btn certificates__btn-secondary">View Certificate <i class='bx bx-award'></i></a>`;
        }

        html += `
          <div class="certificates__card glass">
            <div class="certificates__icon-wrapper">
              <i class='bx bx-award'></i>
            </div>
            <h3 class="certificates__title">${escapeHTML(cert.name)}</h3>
            <span class="certificates__issuer"><i class='bx bx-buildings'></i> ${escapeHTML(cert.issuer)}</span>
            <span class="certificates__date"><i class='bx bx-calendar'></i> Issued: ${escapeHTML(cert.date)}</span>
            
            <div class="certificates__links">
              ${linksHTML}
            </div>
          </div>
        `;
    });

    container.innerHTML = html;
}

function initSkillProgress() {
    const skillBars = document.querySelectorAll('.skills__bar')
    if(skillBars.length > 0) {
        const skillObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const bar = entry.target
                    const targetWidth = bar.getAttribute('data-width')
                    bar.style.width = targetWidth
                    observer.unobserve(bar) 
                }
            })
        }, { 
            threshold: 0.1 
        })

        skillBars.forEach(bar => skillObserver.observe(bar))
    }
}

/*===== SERVER API PERSISTENCE INTEGRATION =====*/
let portfolioData = {};
const hasServerRenderedContent = document.body.dataset.portfolioRendered === 'true';

async function loadPortfolioData() {
    try {
        const response = await fetch('/api/portfolio');
        if (!response.ok) throw new Error("API loading failed");
        portfolioData = await response.json();
    } catch(err) {
        console.warn("Express server offline. Falling back to local storage and static defaults.", err);
        portfolioData = {
            profile: JSON.parse(localStorage.getItem('portfolio_profile')) || defaultProfile,
            skills: JSON.parse(localStorage.getItem('portfolio_skills')) || defaultSkills,
            education: JSON.parse(localStorage.getItem('portfolio_education')) || defaultEducation,
            experience: JSON.parse(localStorage.getItem('portfolio_experience')) || defaultExperience,
            projects: [],
            certificates: []
        };
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // The server already renders the current public data into the page.
    // Keep the API/local-storage path for static and offline fallbacks only.
    if (!hasServerRenderedContent) {
        await loadPortfolioData();

        if (portfolioData.profile && portfolioData.profile.titles) {
            words = portfolioData.profile.titles;
        }

        renderProfile();
        renderSkills();
        renderEducation();
        renderExperience();
        renderCertificates();
    } else {
        try {
            const serverTitles = JSON.parse(document.body.dataset.portfolioTitles || '[]');
            if (Array.isArray(serverTitles) && serverTitles.length) words = serverTitles;
        } catch {}
    }

    setTimeout(typeEffect, 500)
})





const portfolioModal = document.getElementById('portfolio-modal'),
      modalClose = document.getElementById('modal-close'),
      modalImg = document.getElementById('modal-img'),
      modalVideo = document.getElementById('modal-video'),
      modalIframe = document.getElementById('modal-iframe'),
      modalCategory = document.getElementById('modal-category'),
      modalTitle = document.getElementById('modal-title'),
      modalTech = document.getElementById('modal-tech'),
      modalDesc = document.getElementById('modal-desc'),
      modalLinkLive = document.getElementById('modal-link-live'),
      modalLinkGit = document.getElementById('modal-link-git')

// Helper function to extract and build embed URLs for YouTube and Vimeo
function getEmbedUrl(url) {
    if (!url) return '';
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'https:') return '';
        const youtubeHosts = ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'];
        if (youtubeHosts.includes(parsed.hostname)) {
            const id = parsed.hostname === 'youtu.be' ? parsed.pathname.slice(1) : parsed.searchParams.get('v') || parsed.pathname.match(/\/(?:embed|shorts|v)\/([^/]+)/)?.[1];
            return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? `https://www.youtube.com/embed/${id}?autoplay=1` : '';
        }
        if (parsed.hostname === 'vimeo.com' || parsed.hostname === 'www.vimeo.com' || parsed.hostname === 'player.vimeo.com') {
            const id = parsed.pathname.match(/\/(?:video\/)?(\d+)/)?.[1];
            return id ? `https://player.vimeo.com/video/${id}?autoplay=1` : '';
        }
    } catch {}
    return '';
}

// Event delegation for dynamic project cards
document.addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.work__card')) {
        event.preventDefault();
        event.target.click();
    }
});
document.addEventListener('click', (e) => {
    const card = e.target.closest('.work__card')
    if (card && portfolioModal) {
        const title = card.getAttribute('data-title') || '',
              category = card.getAttribute('data-category'),
              tech = card.getAttribute('data-tech'),
              image = card.getAttribute('data-image'),
              video = card.getAttribute('data-video'),
              desc = card.getAttribute('data-desc'),
              liveLink = card.getAttribute('data-live'),
              gitLink = card.getAttribute('data-git')

        modalTitle.textContent = title
        modalCategory.textContent = category
        
        // Hide all media elements by default
        modalImg.style.display = 'none'
        if (modalVideo) {
            modalVideo.style.display = 'none'
            modalVideo.src = ''
        }
        if (modalIframe) {
            modalIframe.style.display = 'none'
            modalIframe.src = ''
        }
        
        // Render media based on availability (video priority)
        if (video) {
            const embedURL = getEmbedUrl(video);
            const safeVideoURL = safePublicURL(video);
            if (embedURL) {
                if (modalIframe) {
                    modalIframe.src = embedURL
                    modalIframe.style.display = 'block'
                }
            } else if (safeVideoURL) {
                if (modalVideo) {
                    modalVideo.src = safeVideoURL
                    modalVideo.style.display = 'block'
                    modalVideo.play().catch(err => console.log('Autoplay blocked:', err))
                }
            }
        } else if (safePublicURL(image)) {
            modalImg.src = safePublicURL(image)
            modalImg.alt = title
            modalImg.style.display = 'block'
        }
        
        modalDesc.textContent = desc
        
        // Set links dynamically
        if (safePublicURL(liveLink)) {
            modalLinkLive.href = safePublicURL(liveLink)
            modalLinkLive.style.display = 'inline-flex'
            modalLinkLive.target = '_blank'
        } else {
            modalLinkLive.style.display = 'none'
        }
        
        modalLinkGit.href = /^https:\/\/github\.com\//i.test(gitLink || '') ? gitLink : 'https://github.com'
        modalLinkGit.target = '_blank'
        modalLinkLive.rel = 'noopener noreferrer'
        modalLinkGit.rel = 'noopener noreferrer'

        modalTech.innerHTML = ''
        if (tech) {
            tech.split(',').forEach(t => {
                const tag = document.createElement('span')
                tag.className = 'modal__tech-tag'
                tag.textContent = t.trim()
                modalTech.appendChild(tag)
            })
        }

        portfolioModal.classList.add('active-modal')
        document.body.style.overflow = 'hidden' 
    }
})

// Function to stop playing video/audio
function stopModalMedia() {
    if (modalVideo) {
        modalVideo.pause()
        modalVideo.src = ''
    }
    if (modalIframe) {
        modalIframe.src = ''
    }
}

if (modalClose && portfolioModal) {
    modalClose.addEventListener('click', () => {
        portfolioModal.classList.remove('active-modal')
        document.body.style.overflow = '' 
        stopModalMedia()
    })

    portfolioModal.addEventListener('click', (e) => {
        if(e.target === portfolioModal) {
            portfolioModal.classList.remove('active-modal')
            document.body.style.overflow = ''
            stopModalMedia()
        }
    })
}

function showToast(title, message, type = 'success') {
    const toastContainer = document.getElementById('toast-container')
    if (!toastContainer) return

    const toast = document.createElement('div')
    toast.className = `toast toast-${type}`

    const iconClass = type === 'success' ? 'bx-check-circle' : 'bx-error-circle'

    toast.innerHTML = `
        <div class="toast__icon"><i class='bx ${iconClass}'></i></div>
        <div class="toast__content">
        <h4 class="toast__title">${escapeHTML(title)}</h4>
        <p class="toast__message">${escapeHTML(message)}</p>
        </div>
        <i class='bx bx-x toast__close'></i>
    `

    toastContainer.appendChild(toast)

    
    setTimeout(() => {
        toast.classList.add('show-toast')
    }, 50)

   
    const autoClose = setTimeout(() => {
        toast.classList.remove('show-toast')
        setTimeout(() => toast.remove(), 400)
    }, 4000)

    const closeBtn = toast.querySelector('.toast__close')
    closeBtn.addEventListener('click', () => {
        clearTimeout(autoClose)
        toast.classList.remove('show-toast')
        setTimeout(() => toast.remove(), 400)
    })
}


const contactForm = document.getElementById('contact-form')

if(contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault()

        const nameInput = document.getElementById('form-name'),
              emailInput = document.getElementById('form-email'),
              messageInput = document.getElementById('form-message')

        let isValid = true

        
        if(nameInput.value.trim() === '') {
            nameInput.classList.add('error')
            isValid = false
        } else {
            nameInput.classList.remove('error')
        }

        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if(!emailRegex.test(emailInput.value.trim())) {
            emailInput.classList.add('error')
            isValid = false
        } else {
            emailInput.classList.remove('error')
        }

        
        if(messageInput.value.trim() === '') {
            messageInput.classList.add('error')
            isValid = false
        } else {
            messageInput.classList.remove('error')
        }

    
        if(isValid) {
            const submitBtn = document.getElementById('contact-submit-btn')
            const originalBtnHTML = submitBtn.innerHTML
            
            // Set loading state
            submitBtn.disabled = true
            submitBtn.innerHTML = 'Sending... <i class="bx bx-loader-alt bx-spin"></i>'
            
            // Submit form data to FormSubmit (email forwarding) and local Express API concurrently
            Promise.all([
                fetch("https://formsubmit.co/ajax/yasintharandika40@gmail.com", {
                    method: "POST",
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        name: nameInput.value.trim(),
                        email: emailInput.value.trim(),
                        message: messageInput.value.trim()
                    })
                }),
                fetch("/api/messages", {
                    method: "POST",
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: nameInput.value.trim(),
                        email: emailInput.value.trim(),
                        message: messageInput.value.trim()
                    })
                })
            ])
            .then(([emailRes, apiRes]) => {
                if (emailRes.ok || apiRes.ok) {
                    showToast('Success!', 'Thank you, your message has been sent successfully.', 'success')
                    contactForm.reset()
                    document.querySelectorAll('.contact__input').forEach(input => {
                        input.blur()
                    })
                } else {
                    throw new Error('Submission failed.')
                }
            })
            .catch(error => {
                console.error('Submission error:', error)
                showToast('Submission Failed', 'Something went wrong. Please try again later.', 'error')
            })
            .finally(() => {
                // Restore submit button state
                submitBtn.disabled = false
                submitBtn.innerHTML = originalBtnHTML
            })
        } else {
            showToast('Submission Error', 'Please fill in all required fields correctly.', 'error')
        }
    })


    const inputs = contactForm.querySelectorAll('.contact__input')
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            if(input.value.trim() !== '') {
                input.classList.remove('error')
            }
        })
    })
}

/*===== DYNAMIC GITHUB PROJECTS API INTEGRATION =====*/
const GITHUB_USERNAME = 'Yasintha-40'; // Change this to your exact GitHub username

/*===== STATS COUNT UP ANIMATION =====*/
function animateStats() {
    const statsNumbers = document.querySelectorAll('.work__stat-number');
    statsNumbers.forEach(num => {
        const target = parseInt(num.getAttribute('data-target'), 10);
        if (isNaN(target)) return;
        
        const duration = 1500; // 1.5s animation duration
        const startTime = performance.now();
        const suffix = num.getAttribute('data-suffix') || '';
        
        const updateCount = (timestamp) => {
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease-out Quad curve for smooth deceleration
            const easeProgress = progress * (2 - progress);
            const currentValue = Math.floor(easeProgress * target);
            
            num.textContent = currentValue + suffix;
            
            if (progress < 1) {
                requestAnimationFrame(updateCount);
            } else {
                num.textContent = target + suffix;
            }
        };
        
        requestAnimationFrame(updateCount);
    });
}

async function fetchGitHubProjects(repositorySummaryPromise) {
    const container = document.getElementById('github-projects-container');
    const statsContainer = document.getElementById('github-stats-container');
    if(!container) return;

    if (statsContainer) {
        statsContainer.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 1rem; color: var(--text-muted); font-size: 0.85rem;">
                <i class='bx bx-loader-alt bx-spin' style="margin-right: 0.5rem;"></i> Compiling stats...
            </div>
        `;
    }

    try {
        // Share the repository list used by language statistics rather than requesting it twice.
        const [profileRes, repositorySummary] = await Promise.all([
            fetch(`https://api.github.com/users/${GITHUB_USERNAME}`),
            repositorySummaryPromise
        ]);

        if (!profileRes.ok) {
            throw new Error('Could not fetch GitHub data');
        }

        const profile = await profileRes.json();

        // Calculate statistics
        const totalRepos = profile.public_repos || repositorySummary.repositoryCount;
        const totalStars = repositorySummary.totalStars;
        const followers = profile.followers || 0;
        const reactReposCount = repositorySummary.reactReposCount;

        // Render Statistics Grid
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="work__stat-card work__stat-card--repos glass">
                    <i class='bx bx-folder work__stat-icon'></i>
                    <h3 class="work__stat-number" data-target="${totalRepos}">0</h3>
                    <span class="work__stat-label">Repositories</span>
                </div>
                <div class="work__stat-card work__stat-card--react glass">
                    <i class='bx bxl-react work__stat-icon'></i>
                    <h3 class="work__stat-number" data-target="${reactReposCount}">0</h3>
                    <span class="work__stat-label">React Projects</span>
                </div>
                <div class="work__stat-card work__stat-card--stars glass">
                    <i class='bx bx-star work__stat-icon'></i>
                    <h3 class="work__stat-number" data-target="${totalStars}">0</h3>
                    <span class="work__stat-label">Stars Earned</span>
                </div>
                <div class="work__stat-card work__stat-card--followers glass">
                    <i class='bx bx-group work__stat-icon'></i>
                    <h3 class="work__stat-number" data-target="${followers}">0</h3>
                    <span class="work__stat-label">Followers</span>
                </div>
            `;
            
            // Trigger Count Up Animation
            animateStats();
        }

    } catch (error) {
        console.error('GitHub API fetch failed:', error);
        
        // Set fallback simulated stats if offline or rate-limited
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="work__stat-card work__stat-card--repos glass">
                    <i class='bx bx-folder work__stat-icon'></i>
                    <h3 class="work__stat-number" data-target="${portfolioData.projects?.length ?? container.querySelectorAll('.work__card').length}">0</h3>
                    <span class="work__stat-label">Repositories</span>
                </div>
                <div class="work__stat-card work__stat-card--react glass">
                    <i class='bx bxl-react work__stat-icon'></i>
                    <h3 class="work__stat-number" data-target="2">0</h3>
                    <span class="work__stat-label">React Projects</span>
                </div>
                <div class="work__stat-card work__stat-card--stars glass">
                    <i class='bx bx-star work__stat-icon'></i>
                    <h3 class="work__stat-number" data-target="0">0</h3>
                    <span class="work__stat-label">Stars Earned</span>
                </div>
                <div class="work__stat-card work__stat-card--followers glass">
                    <i class='bx bx-group work__stat-icon'></i>
                    <h3 class="work__stat-number" data-target="1">0</h3>
                    <span class="work__stat-label">Followers</span>
                </div>
            `;
            
            // Trigger Count Up Animation for fallback values
            animateStats();
        }

        // Retain server-rendered cards when GitHub is unavailable.
        if (!hasServerRenderedContent) renderProjects(portfolioData.projects || [], container);
    }
}

function renderProjects(projects, container) {
    container.innerHTML = '';

    projects.forEach(repo => {
        // Determine Web vs Mobile category
        let category = "Web App";
        const nameLower = repo.name.toLowerCase();
        const langLower = (repo.language || '').toLowerCase();
        
        if (nameLower.includes('mobile') || nameLower.includes('app') || nameLower.includes('android') || nameLower.includes('ios') || 
            langLower === 'kotlin' || langLower === 'swift' || langLower === 'dart') {
            category = "Mobile App";
        }

        // Color-coded logic per programming language
        let langColor = '#6366f1'; // Default Indigo
        let langRGB = '99, 102, 241';
        
        if (repo.language === 'JavaScript' || repo.language === 'TypeScript') {
            langColor = '#f7df1e';
            langRGB = '247, 223, 30';
        } else if (repo.language === 'HTML' || repo.language === 'CSS') {
            langColor = '#e34f26';
            langRGB = '227, 79, 38';
        } else if (repo.language === 'PHP') {
            langColor = '#777bb4';
            langRGB = '119, 123, 180';
        } else if (repo.language === 'Java' || repo.language === 'Kotlin') {
            langColor = '#b07219';
            langRGB = '176, 114, 25';
        } else if (repo.language === 'Python') {
            langColor = '#3776ab';
            langRGB = '55, 118, 171';
        }

        const card = document.createElement('div');
        card.className = 'work__card glass';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `View ${repo.name.replace(/[-_]/g, ' ')} project details`);
        card.setAttribute('data-category', category);
        
        // Modal attributes
        card.setAttribute('data-title', repo.name.replace(/[-_]/g, ' '));
        card.setAttribute('data-category', category);
        card.setAttribute('data-tech', repo.language || 'Software');
        card.setAttribute('data-desc', repo.description || 'View the full repository codebase on GitHub.');
        card.setAttribute('data-git', safePublicURL(repo.html_url));
        card.setAttribute('data-live', safePublicURL(repo.homepage));
        card.setAttribute('data-image', safePublicURL(repo.image));
        card.setAttribute('data-video', safePublicURL(repo.video));

        if (safePublicURL(repo.image)) {
            // Render beautiful image card layout
            card.innerHTML = `
                <img src="${escapeHTML(safePublicURL(repo.image))}" alt="Preview of ${escapeHTML(repo.name.replace(/[-_]/g, ' '))} project" class="work__img" loading="lazy" decoding="async">
                
                <div class="work__details-overlay">
                    <h3 class="work__title" style="text-transform: capitalize;">${escapeHTML(repo.name.replace(/[-_]/g, ' '))}</h3>
                </div>

                <div class="work__card-btn" style="background: ${langColor}; box-shadow: 0 4px 12px rgba(${langRGB}, 0.4);">
                    <i class='bx bx-right-arrow-alt'></i>
                </div>
            `;
        } else {
            // Fallback to generic code repository layout
            card.innerHTML = `
                <div class="work__repo-card" style="padding: 3rem 1.5rem; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 260px; border-bottom: 3px solid ${langColor}; border-radius: 1rem 1rem 0 0; position: relative; overflow: hidden; background: linear-gradient(135deg, rgba(22, 28, 45, 0.45) 0%, rgba(10, 12, 22, 0.8) 100%);">
                    <!-- Glowing effect background -->
                    <div style="position: absolute; width: 80px; height: 80px; border-radius: 50%; background: ${langColor}; filter: blur(45px); opacity: 0.15; top: 20%; pointer-events: none;"></div>
                    
                    <i class='bx bx-git-branch' style="font-size: 2.75rem; color: ${langColor}; margin-bottom: 1.25rem; text-shadow: 0 0 10px rgba(${langRGB}, 0.3);"></i>
                </div>
                
                <div class="work__details-overlay">
                    <h3 class="work__title" style="text-transform: capitalize;">${escapeHTML(repo.name.replace(/[-_]/g, ' '))}</h3>
                </div>

                <div class="work__card-btn" style="background: ${langColor}; box-shadow: 0 4px 12px rgba(${langRGB}, 0.4);">
                    <i class='bx bx-right-arrow-alt'></i>
                </div>
            `;
        }

        container.appendChild(card);
    });

    // Re-initialize ScrollReveal elements if defined
    if(typeof ScrollReveal !== 'undefined') {
        ScrollReveal().reveal('.work__card', { interval: 150 });
    }
}

// category filter buttons event listeners using event delegation
document.addEventListener('click', (e) => {
    const filterBtn = e.target.closest('.work__filter-btn');
    if (filterBtn) {
        const filterBtnsList = document.querySelectorAll('.work__filter-btn');
        filterBtnsList.forEach(b => b.classList.remove('active-filter'));
        filterBtn.classList.add('active-filter');

        const filterValue = filterBtn.getAttribute('data-filter');
        const cardsList = document.querySelectorAll('.work__card');
        
        cardsList.forEach(card => {
            if (filterValue === 'all' || card.getAttribute('data-category') === filterValue) {
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');
            }
        });
    }
});

function loadWhenNearViewport(element, callback) {
    if (!element || !('IntersectionObserver' in window)) {
        callback();
        return;
    }

    const observer = new IntersectionObserver((entries, currentObserver) => {
        if (entries.some(entry => entry.isIntersecting)) {
            currentObserver.disconnect();
            callback();
        }
    }, { rootMargin: '300px 0px' });
    observer.observe(element);
}

// Start external GitHub requests as their sections approach the viewport.
document.addEventListener('DOMContentLoaded', () => {
    const skillsSection = document.getElementById('skills');
    const projectsSection = document.getElementById('portfolio');

    loadWhenNearViewport(skillsSection, () => {
        if (typeof GitHubLanguageStats !== 'undefined') {
            GitHubLanguageStats.load().then(renderGitHubLanguageStats).catch(renderGitHubLanguageError);
        } else {
            renderGitHubLanguageError(new Error('Language statistics script did not load.'));
        }
    });

    loadWhenNearViewport(projectsSection, () => {
        const summary = typeof GitHubLanguageStats !== 'undefined'
            ? GitHubLanguageStats.getRepositorySummary()
            : Promise.reject(new Error('GitHub statistics script did not load.'));
        fetchGitHubProjects(summary);
    });
});

/*===== SCROLL REVEAL CONFIGURATION =====*/
function initializeScrollReveal() {
    if (typeof ScrollReveal === 'undefined' || window.__portfolioScrollRevealInitialized) return;
    window.__portfolioScrollRevealInitialized = true;
    const sr = ScrollReveal({
        origin: 'top',
        distance: '60px',
        duration: 2000,
        delay: 200,
    })

    sr.reveal('.home__data, .about__img-wrapper, .skills__header-block, .skills__category, .contact__info-card', {})
    sr.reveal('.home__img, .about__subtitle, .about__text, .about__details, .timeline__item, .exp-timeline__item, .certificates__card, .contact__form-card', { delay: 400, interval: 150 })
}
if (typeof ScrollReveal !== 'undefined') initializeScrollReveal();
else window.addEventListener('load', initializeScrollReveal, { once: true });
