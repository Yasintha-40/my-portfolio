const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// Load environment variables from .env if present
if (typeof process.loadEnvFile === 'function') {
    try {
        process.loadEnvFile(path.join(__dirname, '.env'));
    } catch (err) {
        // Quietly fail if .env is missing
    }
}


const app = express();
const PORT = process.env.PORT || 8080;
const DATA_FILE = path.join(__dirname, 'data.json');
const SECURE_TOKEN = "yasintha_secure_session_token";

// Middleware
app.use(cors());
app.use(express.json());

// Helper functions for reading/writing data
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
        date: 'Jun 2024 – Aug 2024',
        title: 'Software Engineering Intern',
        type: 'Internship',
        typeClass: 'exp-timeline__type--intern',
        company: 'Sri Lanka Tourism Development Authority (SLTDA) · Colombo, Sri Lanka',
        bullets: [
            'Collaborated in the IT department to design, maintain, and enhance the official web portals and travel information management systems.',
            'Worked with PHP, Laravel, and OpenCart platforms to implement dynamic tourist information features and administrative systems.',
            'Optimised SQL queries and database indexes to improve web portal performance under heavy tourist search traffic.'
        ],
        tags: ['PHP', 'Laravel', 'OpenCart', 'MySQL', 'Git'],
        icon: 'bx-code-block',
        themeColor: 'var(--secondary-color)',
        themeColorRGB: '6, 182, 212'
    }
];

function readData() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            const initialData = {
                profile: defaultProfile,
                skills: defaultSkills,
                education: defaultEducation,
                experience: defaultExperience,
                projects: [],
                messages: []
            };
            fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf8');
            return initialData;
        }
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (err) {
        console.error('Error reading data.json:', err);
        return {};
    }
}

function writeData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('Error writing data.json:', err);
        return false;
    }
}

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: "Access denied. Token missing." });
    }

    if (token !== SECURE_TOKEN) {
        return res.status(403).json({ error: "Forbidden. Invalid token." });
    }

    next();
};

// Configure Multer Storage for local PC media uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../frontend/assets/uploads/');
        // Ensure destination folder exists
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // limit files to 50MB (useful for videos)
});

// Secure Upload Route (Requires auth token)
app.post('/api/upload', authenticateToken, upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 },
    { name: 'pdf', maxCount: 1 }
]), (req, res) => {
    try {
        const responseData = {};
        if (req.files) {
            if (req.files.image && req.files.image[0]) {
                responseData.image = '/assets/uploads/' + req.files.image[0].filename;
            }
            if (req.files.video && req.files.video[0]) {
                responseData.video = '/assets/uploads/' + req.files.video[0].filename;
            }
            if (req.files.pdf && req.files.pdf[0]) {
                responseData.pdf = '/assets/uploads/' + req.files.pdf[0].filename;
            }
        }
        res.json({ success: true, ...responseData });
    } catch (err) {
        console.error('File upload error:', err);
        res.status(500).json({ error: 'Failed to process uploaded file.' });
    }
});

/*===== API ENDPOINTS =====*/

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const adminUser = process.env.ADMIN_USERNAME || "admin";
    const adminPass = process.env.ADMIN_PASSWORD || "admin123";
    if (username === adminUser && password === adminPass) {
        res.json({ success: true, token: SECURE_TOKEN });
    } else {
        res.status(401).json({ success: false, error: "Invalid credentials." });
    }
});

// GET complete state
app.get('/api/portfolio', (req, res) => {
    const data = readData();
    res.json({
        profile: data.profile || defaultProfile,
        skills: data.skills || defaultSkills,
        education: data.education || defaultEducation,
        experience: data.experience || defaultExperience,
        projects: data.projects || [],
        certificates: data.certificates || []
    });
});

// Update Profile settings
app.post('/api/profile', authenticateToken, (req, res) => {
    const data = readData();
    data.profile = req.body;
    if (writeData(data)) {
        res.json({ success: true, message: "Profile settings saved." });
    } else {
        res.status(500).json({ error: "Failed to write database." });
    }
});

// Update Skills
app.post('/api/skills', authenticateToken, (req, res) => {
    const data = readData();
    data.skills = req.body;
    if (writeData(data)) {
        res.json({ success: true, message: "Skills saved." });
    } else {
        res.status(500).json({ error: "Failed to write database." });
    }
});

// Update Education
app.post('/api/education', authenticateToken, (req, res) => {
    const data = readData();
    data.education = req.body;
    if (writeData(data)) {
        res.json({ success: true, message: "Education timeline saved." });
    } else {
        res.status(500).json({ error: "Failed to write database." });
    }
});

// Update Experience
app.post('/api/experience', authenticateToken, (req, res) => {
    const data = readData();
    data.experience = req.body;
    if (writeData(data)) {
        res.json({ success: true, message: "Experience timeline saved." });
    } else {
        res.status(500).json({ error: "Failed to write database." });
    }
});

// Update Projects (curated one-by-one list)
app.post('/api/projects', authenticateToken, (req, res) => {
    const data = readData();
    data.projects = req.body;
    if (writeData(data)) {
        res.json({ success: true, message: "Projects saved." });
    } else {
        res.status(500).json({ error: "Failed to write database." });
    }
});

// Update Certificates
app.post('/api/certificates', authenticateToken, (req, res) => {
    const data = readData();
    data.certificates = req.body;
    if (writeData(data)) {
        res.json({ success: true, message: "Certificates saved." });
    } else {
        res.status(500).json({ error: "Failed to write database." });
    }
});

// GET Messages list
app.get('/api/messages', authenticateToken, (req, res) => {
    const data = readData();
    res.json(data.messages || []);
});

// POST Message (public contact form target)
app.post('/api/messages', (req, res) => {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
        return res.status(400).json({ error: "All fields are required." });
    }

    const data = readData();
    const newMessage = {
        id: Date.now(),
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        date: new Date().toLocaleString(),
        read: false
    };

    if (!data.messages) data.messages = [];
    data.messages.unshift(newMessage);

    if (writeData(data)) {
        res.json({ success: true, message: "Contact request logged successfully." });
    } else {
        res.status(500).json({ error: "Database write error." });
    }
});

// Toggle message read status
app.post('/api/messages/read', authenticateToken, (req, res) => {
    const { id } = req.body;
    const data = readData();
    
    if (!data.messages) data.messages = [];
    data.messages = data.messages.map(msg => {
        if (msg.id === id) {
            msg.read = !msg.read;
        }
        return msg;
    });

    if (writeData(data)) {
        res.json({ success: true, message: "Message status updated." });
    } else {
        res.status(500).json({ error: "Database error." });
    }
});

// DELETE message(s)
app.delete('/api/messages', authenticateToken, (req, res) => {
    const { id } = req.body;
    const data = readData();
    
    if (!data.messages) data.messages = [];

    if (id) {
        // Delete individual message
        data.messages = data.messages.filter(msg => msg.id !== id);
    } else {
        // Delete all
        data.messages = [];
    }

    if (writeData(data)) {
        res.json({ success: true, message: "Message(s) deleted." });
    } else {
        res.status(500).json({ error: "Database error." });
    }
});

/*===== STATIC ASSETS HOSTING =====*/
// Host admin statically at /admin
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Host frontend statically at root /
app.use('/', express.static(path.join(__dirname, '../frontend')));

// Fallback for route /admin (loads /admin/index.html)
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
