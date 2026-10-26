# Learning Management System (LMS)

A scalable and modern Learning Management System (LMS) platform designed for courses, interactive learning, and student-instructor collaboration.

---

## 🛠 Technology Stack

### Frontend
- **Framework:** [React 19](https://react.dev/) + [Vite](https://vite.dev/)
- **Routing:** [React Router](https://reactrouter.com/) (`react-router-dom`)
- **HTTP Client:** [Axios](https://axios-http.com/)
- **Iconography:** [Lucide React](https://lucide.dev/)
- **Language:** JavaScript (ES modules)

### Backend
- **Runtime:** [Node.js](https://nodejs.org/) (v20+ recommended)
- **Web Framework:** [Express.js](https://expressjs.com/)
- **Database Modeling:** [Mongoose](https://mongoosejs.com/) (Object Data Modeling)
- **Database:** [MongoDB Atlas](https://www.mongodb.com/atlas) (Cloud NoSQL)
- **CORS & Environment:** `cors`, `dotenv`
- **Development Tooling:** `nodemon`
- **Language:** JavaScript (CommonJS)

---

## 📁 Repository Structure

```text
LMS-portal/
├── frontend/
│   ├── public/
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── App.css
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .env.example
│   ├── .gitignore
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   └── healthController.js
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   │   └── healthRoutes.js
│   ├── services/
│   ├── tests/
│   │   └── health.test.js
│   ├── utils/
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   └── server.js
├── .gitignore
└── README.md
```

---

## 📋 Prerequisites

Before running the project locally, ensure you have the following installed:
- **Node.js** (v18.0.0 or higher, tested on v24.14.0)
- **npm** (v9.0.0 or higher, tested on 11.9.0)
- A **MongoDB Atlas** account (or local MongoDB instance) for database connectivity

---

## ⚙️ Environment Variables Setup

### Backend (`backend/.env`)
Create a `.env` file inside the `backend/` directory by copying `.env.example`:

```bash
cd backend
cp .env.example .env
```

Variables:
```env
PORT=5000
MONGODB_URI=
CLIENT_URL=http://localhost:5173
```

### Frontend (`frontend/.env`)
Create a `.env` file inside the `frontend/` directory by copying `.env.example`:

```bash
cd frontend
cp .env.example .env
```

Variables:
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 🚀 Installation & Setup

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
```

---

## ▶️ Running the Applications

### Starting the Backend

From the `backend/` directory:

- **Development mode (with auto-reload via nodemon):**
  ```bash
  npm run dev
  ```
- **Production / standard mode:**
  ```bash
  npm start
  ```

The backend server listens on `http://localhost:5000`.

### Starting the Frontend

From the `frontend/` directory:

- **Development server:**
  ```bash
  npm run dev
  ```
- **Production build test:**
  ```bash
  npm run build
  ```
- **Preview production build:**
  ```bash
  npm run preview
  ```



```
6. **Set in `.env`:**
   - Open `backend/.env` and paste your URI into `MONGODB_URI`:
     ```env
     MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/lms?retryWrites=true&w=majority
     ```
7. Restart the backend server and re-check `http://localhost:5000/api/health` to verify `database.status` changes to `"connected"`.

---

## 🧪 Testing

### Backend Unit Tests
Execute the backend test suite:
```bash
cd backend
npm test
```
Runs unit tests verifying that the health controller reports server status and database connectivity independently.

---

