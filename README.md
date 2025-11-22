# Support Ticket System – Full Stack Documentation

This repository contains a **scalable, modern support ticket system** built using:

* **Flask** – Backend API
* **PostgreSQL** – Database
* **React (Vite)** – Frontend UI
* **SQLAlchemy** – ORM
* **JWT Auth** – Authentication

---

## 📦 Project Structure

```
project/
├── backend/
│   ├── app/
│   │   ├── routes/
│   │   ├── models/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── __init__.py
│   ├── venv/
│   ├── run.py
│   ├── requirements.txt
│
├── frontend/
│   ├── src/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│
└── README.md
```

---

## 🗃️ Database Schema (PostgreSQL)

### **Tickets Table**

* id (UUID)
* title
* description
* status
* priority
* assigned_to
* created_at
* updated_at
* resolved_at

### **Users Table**

* id (UUID)
* name
* email
* role
* password_hash
* created_at

### **Activity Log Table**

* id (UUID)
* ticket_id
* action
* user_id
* timestamp

---

## 🚀 Backend (Flask) Overview

### **Main Technologies**

* Flask
* SQLAlchemy
* Flask-JWT-Extended
* Marshmallow (validation)
* Alembic (migrations)
* Psycopg2 (PostgreSQL driver)
* Cloudinary (optional) for media storage

### **API Endpoints**

#### **Auth**

* `POST /api/auth/login`
* `POST /api/auth/register`

#### **Tickets**

* `GET /api/tickets`
* `POST /api/tickets`
* `GET /api/tickets/<id>`
* `PUT /api/tickets/<id>`
* `DELETE /api/tickets/<id>`

#### **Analytics**

* `/api/analytics/overview`
* `/api/analytics/tickets-by-priority`

---

## 🎨 Frontend (React + Vite + Tailwind + shadcn/ui)

### **Libraries Used**

* React
* React Router
* Axios
* Shadcn/UI
* Lucide Icons
* Recharts
* TailwindCSS

### **Frontend Pages**

* Login Page
* Tickets Dashboard
* Ticket Detail View
* Create Ticket
* Analytics Dashboard (Charts)

---

## 🔐 Authentication Flow

1. User logs in → Backend returns JWT
2. Token stored in localStorage
3. Axios sends token in headers
4. Protected routes enforced via Flask-JWT

---

## 🚢 Deployment Guide

### **Backend Deployment (Ubuntu + Gunicorn + Nginx)**

* Create a Python venv
* Install requirements
* Run Alembic migrations
* Set up systemd service for Gunicorn
* Configure Nginx reverse proxy

### **Frontend Deployment**

```
npm run build
```

Upload the generated `dist/` folder to:

* Netlify, Vercel, or
* Serve via Nginx

### **PostgreSQL Setup**

```
sudo -u postgres createdb support_db
sudo -u postgres createuser support_user
```

---

## 📊 Scaling for Analytics & High Use

* Use **Redis** for caching
* Add **Celery** for async tasks
* Add **pgvector** for AI analytics later
* Add **Indexing** for query optimization
* Separate frontend/backend into microservices

---

## 🧪 Development Setup

### **Backend**

```
cd backend
pip install -r requirements.txt
flask run
```

### **Frontend**

```
cd frontend
npm install
npm run dev
```

---

## 📝 License

MIT

---

If you'd like, I can also generate:

* A **system architecture diagram**
* A **Swagger/OpenAPI file**
* Database ERD image
* Full GitHub-ready project skeleton
