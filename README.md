# Learning Management System (LMS) — LearnSpace

A scalable and modern Learning Management System (LMS) platform designed for courses, interactive learning, student-instructor collaboration, and role-based access control.

---

## 🛠 Technology Stack

### Frontend
- **Framework:** [React 19](https://react.dev/) + [Vite](https://vite.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Routing:** [React Router](https://reactrouter.com/) (`react-router-dom` v7)
- **HTTP Client:** [Axios](https://axios-http.com/) (configured with `withCredentials: true` for HttpOnly cookies)
- **Iconography:** [Lucide React](https://lucide.dev/)
- **Linter:** [oxlint](https://oxc.rs/)

### Backend
- **Runtime:** [Node.js](https://nodejs.org/) (v20+ recommended)
- **Web Framework:** [Express.js](https://expressjs.com/)
- **Database Modeling:** [Mongoose](https://mongoosejs.com/)
- **Database:** [MongoDB Atlas](https://www.mongodb.com/atlas) (Cloud NoSQL)
- **Authentication:** `jsonwebtoken` (JWT), `bcryptjs` (Cost 12), `cookie-parser`
- **Security:** `express-rate-limit`, strict CORS origin validation, sanitize user outputs
- **Email Delivery:** `nodemailer` (integrated for password resets, with fallback simulation)
- **Testing:** Node.js native test runner (`node:test`, `node:assert`) + `supertest`

---

## 📁 Repository Structure

```text
LMS-portal/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── ...
│   │   ├── context/
│   │   │   ├── authContextInstance.js
│   │   │   ├── AuthContext.jsx
│   │   │   └── useAuth.js
│   │   ├── layouts/
│   │   │   └── AuthLayout.jsx
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── ForgotPasswordPage.jsx
│   │   │   ├── ResetPasswordPage.jsx
│   │   │   ├── UnauthorizedPage.jsx
│   │   │   ├── StudentDashboard.jsx
│   │   │   ├── InstructorDashboard.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   └── NotFoundPage.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   └── healthController.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   ├── rateLimiter.js
│   │   ├── requestLogger.js
│   │   └── validateAuth.js
│   ├── models/
│   │   └── User.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── healthRoutes.js
│   ├── scripts/
│   │   └── provisionAdmin.js
│   ├── services/
│   │   └── emailService.js
│   ├── tests/
│   │   ├── auth.test.js
│   │   └── health.test.js
│   ├── utils/
│   │   ├── authUtils.js
│   │   └── logger.js
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── .gitignore
└── README.md
```

---

## 🔐 Phase 2: Authentication & Role-Based Authorization

### 1. User Roles & Capabilities
- **Student (`role: 'student'`):**
  - Public self-registration (default role).
  - Access to course discovery, syllabus previews, and Student Dashboard (`/student/dashboard`).
  - Blocked from administrative and instructor-only endpoints.
- **Instructor (`role: 'instructor'`):**
  - Registration sets `accountStatus: 'pending'` awaiting administrative approval.
  - Once active, gains access to Instructor Dashboard (`/instructor/dashboard`) and curriculum publishing APIs.
  - Blocked from administrative endpoints.
- **Admin (`role: 'admin'`):**
  - Never provisioned through public forms.
  - Provisioned safely and idempotently via CLI script (`npm run provision:admin`).
  - Access to Admin Console (`/admin/dashboard`), system security management, and cross-tier authorization.

### 2. Session Management & Security Features
- **HttpOnly Cookies:** JWT tokens are stored inside strict `HttpOnly` cookies (`auth_token`) with `SameSite: 'lax'` (or `'none'` in cross-site production HTTPS) and `secure: true` in production.
- **No Client Token Storage:** Frontend never stores JWTs in `localStorage` or `sessionStorage` (preventing XSS token extraction).
- **Session Restoration:** On application load, `GET /api/auth/me` verifies the cookie session and rehydrates authenticated context.
- **Password Hashing:** Passwords hashed with `bcryptjs` (salt factor 12) with schema-level `select: false`.
- **Sensitive Rate Limiting:**
  - Login / Register endpoints: 20 requests per 15-minute window per IP.
  - Password Reset endpoints: 5 requests per 15-minute window per IP.
- **Generic Responses:** Login and password reset endpoints return generic messages preventing account enumeration.

---

## ⚙️ Environment Variables Setup

### Backend (`backend/.env`)
Copy `backend/.env.example` to `backend/.env` and configure:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your-mongodb-atlas-uri
CLIENT_URL=http://localhost:5173

# JWT Configuration
JWT_SECRET=your-super-strong-jwt-secret-min-32-chars
JWT_EXPIRES_IN=7d

# Admin Provisioning CLI
ADMIN_SETUP_TOKEN=your-random-offline-setup-secret
ADMIN_EMAIL=admin@learnspace.io
ADMIN_PASSWORD=AdminPassword123!
ADMIN_NAME="LearnSpace Administrator"

# Email Configuration (Optional - simulation mode if left blank)
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_SECURE=false
EMAIL_USER=your-smtp-user
EMAIL_PASS=your-smtp-pass
EMAIL_FROM="LearnSpace Security <no-reply@learnspace.io>"
```

### Frontend (`frontend/.env`)
Copy `frontend/.env.example` to `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Provision the Initial Administrator
Run the idempotent admin provisioning script from `backend/`:
```bash
cd backend
npm run provision:admin
```
*(Uses credentials from `backend/.env` or creates default `admin@learnspace.io` if not specified).*

### 3. Start the Backend Server
```bash
cd backend
npm run dev
# Server listens on http://localhost:5000
```

### 4. Start the Frontend Application
```bash
cd frontend
npm run dev
# Vite runs at http://localhost:5173
```

---

## 🔑 Backend API Endpoints

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register new Student or submit Instructor application |
| POST | `/api/auth/login` | Public | Authenticate user, issue HttpOnly session cookie |
| POST | `/api/auth/logout` | Authenticated | Invalidate browser cookie and clear session |
| GET | `/api/auth/me` | Authenticated | Restore session and return sanitized user profile |
| POST | `/api/auth/forgot-password` | Public | Generate reset token and dispatch email / simulation |
| POST | `/api/auth/reset-password` | Public | Validate token hash and update password |
| PATCH | `/api/auth/change-password` | Authenticated | Verify current password and update to new password |
| GET | `/api/auth/student-only` | Student, Admin | Verification endpoint for role authorization |
| GET | `/api/auth/instructor-only` | Instructor, Admin | Verification endpoint for role authorization |
| GET | `/api/auth/admin-only` | Admin | Verification endpoint for role authorization |
| GET | `/api/health` | Public | Cluster and server health monitoring |

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
