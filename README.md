# LearnSpace LMS

LearnSpace is a full-featured Learning Management System built for modern online education. The platform connects students, instructors, and administrators in a single ecosystem for course delivery, assessment, communication, analytics, and secure role-based access.

This project is now fully implemented and ready for local use, showcasing a complete LMS workflow from registration and authentication to course management, quizzes, assignments, reminders, reviews, certificates, and admin controls.

---

## Overview

LearnSpace includes:

- Student enrollment and dashboard experiences
- Instructor course and content management tools
- Admin control panels for approvals, monitoring, and management
- Secure authentication with JWT + HttpOnly cookies
- Course discovery, announcements, and discussions
- Assessment workflows with quizzes and assignments
- Learning analytics, streak tracking, and completion insights
- Payment and enrollment integration support
- Notifications, calendar scheduling, and deadline reminders
- Profile management, reviews, and certificate issuance

---

## Tech Stack

### Frontend
- React 19
- Vite
- Tailwind CSS v4
- React Router DOM
- Axios
- Lucide React
- Framer Motion
- Firebase for authentication-related integrations

### Backend
- Node.js
- Express.js
- MongoDB with Mongoose
- JWT + bcryptjs
- Cookie-based session management
- Nodemailer for email workflows
- Cloudinary for file/media storage
- Razorpay for payment integration
- Socket.IO for real-time updates
- Node.js test runner + Supertest for API testing

### Security Features
- HttpOnly cookie-based auth
- Role-based route protection
- Rate limiting on sensitive endpoints
- Session timeout and warning flow
- Password hashing and token validation
- Admin provisioning via secure script

---

## Project Structure

```text
LMS-portal/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   ├── services/
│   ├── tests/
│   ├── utils/
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
├── .gitignore
├── README.md
└── backend-testing-report/
```

---

## Main Features

### For Students
- User registration and login
- Personalized student dashboard
- Course browsing and enrollment
- Assignment submission workflow
- Quiz participation and results viewing
- Learning streak and activity tracking
- Announcements and discussion feeds
- Profile completion and academic progress insights
- Certificate verification and download support

### For Instructors
- Instructor dashboard with course analytics
- Course and lesson creation management
- Assignment and quiz publishing tools
- Student submissions review and grading
- Announcement publishing for enrolled learners
- Discussion moderation and updates
- Performance tracking and teaching insights

### For Admins
- Secure admin dashboard
- User approval and management workflows
- Monitoring of learning activity and system health
- Access control across roles and routes
- Notification and communication oversight
- Course and enrollment administration

---

## Authentication & Authorization

The platform implements a role-based access model:

- Student: public registration, course access, dashboard access
- Instructor: registration with pending approval, course management access
- Admin: protected provisioning and system-level control

Security measures include:

- HttpOnly cookies for JWT storage
- Protected routes and middleware-based access checks
- Strict rate limiting on sensitive APIs
- Session restoration using `/api/auth/me`
- Secure password handling with `bcryptjs`
- Generic responses for auth-related flows to reduce enumeration risks

---

## Environment Setup

### Backend
Create `backend/.env` from `backend/.env.example`:

```env
PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>
CLIENT_URL=http://localhost:5174

JWT_SECRET=your_jwt_secret_key_minimum_32_characters_long
JWT_EXPIRES_IN=8h
ADMIN_SETUP_TOKEN=your_secure_admin_provisioning_token

EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your_email@example.com
EMAIL_PASS=your_email_password
EMAIL_FROM="LearnSpace" <your_email@example.com>

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
TOTP_ENCRYPTION_KEY=your_secure_32_character_totp_encryption_key
```

### Frontend
Create `frontend/.env` from `frontend/.env.example`:

```env
VITE_API_URL=http://localhost:5000/api

VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

---

## Getting Started

### 1. Install dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. Provision the initial admin

```bash
cd backend
npm run provision:admin
```

This creates the initial admin account using the values from `backend/.env` if they are present.

### 3. Start backend

```bash
cd backend
npm run dev
```

The backend runs on: `http://localhost:5000` (or the port configured in `.env`)

### 4. Start frontend

```bash
cd frontend
npm run dev
```

The frontend runs on: `http://localhost:5174`

---

## Available Scripts

### Backend
```bash
npm run dev
npm run start
npm run test
npm run provision:admin
```

### Frontend
```bash
npm run dev
npm run build
npm run preview
npm run lint
```

---

## API Highlights

Key backend modules include:

- Auth APIs: login, register, reset password, change password, session restore
- Course APIs: browse, create, update, enroll learners, manage content
- Assignment APIs: create, submit, grade, track deadlines
- Quiz APIs: generate assessments, track attempts, evaluate performance
- Discussion APIs: course discussions and replies
- Notification APIs: notifications, announcements, reminders
- Payment APIs: enrollment/payment processing support
- Admin APIs: approvals, system monitoring, user management
- Health APIs: service health checks

---

## Notes

- The project is designed for local development and can be extended for production deployment.
- MongoDB connection, email credentials, cloud storage keys, and payment credentials should be configured securely before deployment.
- The repository includes test coverage for many LMS flows such as authentication, courses, quizzes, dashboard logic, discussions, and notifications.

---

## Final Note

LearnSpace is a complete and modern LMS platform that covers the core workflow of online education systems, combining security, role management, analytics, and learning operations in a single application.

---

## 🧪 Automated Testing

### Backend Security & Auth Tests (24 Cases)
```bash
cd backend
npm test
```
Covers:
1. Student registration validation & sanitized profile responses.
2. Missing required field rejections.
3. Invalid email format handling.
4. Weak password validation (< 8 chars, missing numbers).
5. Duplicate email conflict checks (`409 Conflict`).
6. Bcrypt hash storage verification.
7. Login credential verification & HttpOnly cookie issuance.
8. Generic 401 error responses for invalid passwords.
9. Account enumeration resistance for nonexistent users.
10. Session restoration via `GET /api/auth/me`.
11. Unauthenticated rejection handling.
12. Logout cookie clearance.
13. Token forgery & expiration rejection.
14. Student forbidden from Admin endpoints (`403 Forbidden`).
15. Instructor forbidden from Admin endpoints (`403 Forbidden`).
16. Rejection of client attempts to self-assign Admin role.
17. Suspended account access denial.
18. Expired / invalid reset token rejection.
19. Reset token single-use consumption.
20. Password change current password verification.
21. Health and database status reporting.
22. Sensitive query parameter log sanitization.

### Frontend Linting & Production Build
```bash
cd frontend
# Run linter
npm run lint

# Run production build
npm run build
```
Result: 0 lint errors, 0 lint warnings, clean Vite production bundle.
