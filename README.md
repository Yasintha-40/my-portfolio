# Yasintha Portfolio

Personal portfolio website for Yasintha, a Software Engineering student at SLIIT.

The project combines a modern frontend portfolio with a Node.js backend admin panel so the content can be managed locally.

## Features

- Responsive personal portfolio built with HTML, CSS, and JavaScript.
- Animated sections, smooth scrolling, and a mobile-first layout.
- Admin dashboard for managing portfolio data and contact messages.
- File upload support for images, videos, and PDFs.
- Backend API powered by Express and Multer.

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- File handling: Multer
- Data storage: JSON file in the backend folder

## Project Structure

- `frontend/` contains the public portfolio website.
- `backend/` contains the API server and admin panel.
- `backend/admin/` contains the admin login and dashboard files.
- `backend/data.json` stores portfolio content, projects, and messages.

## Run Locally

1. Install dependencies inside the backend folder:

	```bash
	npm install
	```

2. Start the server:

	```bash
	npm start
	```

3. Open the site in your browser:

	- Portfolio: `http://localhost:8080`
	- Admin panel: `http://localhost:8080/admin`


## Notes

- The backend serves the frontend statically from the project root.
- Uploaded files are stored in `frontend/assets/uploads/`.
- If `.env` is not present, the server falls back to default admin credentials defined in `backend/server.js`.

