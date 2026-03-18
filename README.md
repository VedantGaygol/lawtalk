# LawTalk – AI Legal Assistance Platform

A full-stack web application connecting legal clients with lawyers, featuring real-time chat, AI case analysis, and a complete case management system.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + Tailwind CSS + ShadCN UI |
| Backend | Node.js + Express 5 + TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| Real-time | Socket.io |
| Auth | JWT (bcryptjs) |
| Forms | React Hook Form + Zod |
| Charts | Recharts |

## Project Structure

```
lawtalk/
├── frontend/           # React + Vite app
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   │   ├── layout/ # AppLayout, navigation
│   │   │   └── ui/     # ShadCN components
│   │   ├── hooks/      # Custom hooks (useAuth, useSocket)
│   │   ├── pages/      # All pages/screens
│   │   │   ├── auth/   # Login, Signup
│   │   │   ├── user/   # User dashboard, cases, lawyers
│   │   │   ├── lawyer/ # Lawyer dashboard, requests
│   │   │   └── chat/   # Real-time chat
│   │   ├── lib/        # Utilities
│   │   ├── App.tsx     # Root component + routing
│   │   ├── main.tsx    # Entry point
│   │   └── index.css   # Global styles + Tailwind theme
│   ├── public/
│   │   └── images/     # Static images
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── backend/            # Express API server
│   ├── src/
│   │   ├── routes/     # API route handlers
│   │   │   ├── auth.ts
│   │   │   ├── users.ts
│   │   │   ├── lawyers.ts
│   │   │   ├── cases.ts
│   │   │   ├── requests.ts
│   │   │   ├── messages.ts
│   │   │   ├── reviews.ts
│   │   │   ├── notifications.ts
│   │   │   └── admin.ts
│   │   ├── middlewares/
│   │   │   └── auth.ts     # JWT middleware
│   │   ├── lib/
│   │   │   └── auth.ts     # bcrypt + JWT helpers
│   │   ├── db/
│   │   │   ├── index.ts    # Drizzle DB connection
│   │   │   └── schema/     # Database table definitions
│   │   ├── generated/
│   │   │   └── zod/        # Zod validation schemas
│   │   ├── scripts/
│   │   │   └── seed.ts     # Seed data script
│   │   ├── app.ts          # Express + Socket.io setup
│   │   └── index.ts        # Server entry point
│   ├── drizzle.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── .env.example        # Environment variable template
└── README.md
```

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### 1. Database Setup

Create a PostgreSQL database:
```sql
CREATE DATABASE lawtalk;
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp ../.env.example .env
# Edit .env and set your DATABASE_URL, JWT_SECRET

# Push database schema
npm run db:push

# Seed sample data
npm run seed

# Start development server
npm run dev
```

Backend runs on **http://localhost:5000**

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend runs on **http://localhost:3000**

The frontend is pre-configured to proxy `/api` requests to `http://localhost:5000`.

---

## Test Accounts (after seeding)

| Role   | Email | Password | Status |
|--------|-------|----------|--------|
| Admin | admin@lawtalk.com | password123 | — |
| User | alice@example.com | password123 | — |
| User | bob@example.com | password123 | — |
| Lawyer | vikram@lawtalk.com | password123 | Approved |
| Lawyer | priya@lawtalk.com | password123 | Approved |
| Lawyer | rajesh@lawtalk.com | password123 | Approved |
| Lawyer | kavita@lawtalk.com | password123 | Pending |

---

## Features

### Auth System (Dual Role)
- **Users**: Sign up → Instant access to dashboard
- **Lawyers**: Sign up → Upload license → Admin approval required → Dashboard
- **Admin**: Approve/reject lawyer applications, view platform stats

### User Dashboard
- Submit legal cases (title, description, category, location, budget)
- Browse and filter lawyers (by category, location, rating)
- View lawyer profiles, send case requests
- Real-time chat via Socket.io
- AI case analysis with winning probability chart
- Notification system

### Lawyer Dashboard
- Profile completion (specialization, experience, location, pricing)
- Unique lawyer code
- Accept/reject case requests
- Real-time chat with clients

### Admin Panel
- View all lawyers with approval status
- Approve or reject lawyer applications
- Platform statistics dashboard

---

## API Endpoints

### Auth
```
POST /api/auth/register    - Register user or lawyer
POST /api/auth/login       - Login (returns JWT)
GET  /api/auth/me          - Get current user (requires auth)
```

### Lawyers
```
GET  /api/lawyers                  - List approved lawyers (with filters)
GET  /api/lawyers/:id              - Get lawyer profile
PUT  /api/lawyers/profile          - Update lawyer profile (lawyer auth)
POST /api/lawyers/upload-license   - Upload license URL (lawyer auth)
```

### Cases
```
GET  /api/cases             - Get user's cases (auth required)
POST /api/cases             - Create new case (user auth)
GET  /api/cases/:id         - Get case details (auth required)
GET  /api/cases/:id/analysis - AI case analysis (auth required)
```

### Requests
```
GET  /api/requests                   - Get requests (auth required)
POST /api/requests                   - Send case request to lawyer (user auth)
PUT  /api/requests/:id/respond       - Accept/reject request (lawyer auth)
```

### Messages
```
GET  /api/conversations              - Get all conversations (auth required)
GET  /api/messages/:conversationId   - Get messages (auth required)
POST /api/messages/:conversationId   - Send message (auth required)
```

### Admin
```
GET /api/admin/lawyers               - List all lawyers (admin auth)
PUT /api/admin/lawyers/:id/approve   - Approve or reject lawyer (admin auth)
GET /api/admin/stats                 - Platform statistics (admin auth)
```

---

## Socket.io Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join_conversation` | Client → Server | Join a chat room |
| `send_message` | Client → Server | Send a message |
| `receive_message` | Server → Client | Incoming message |
| `typing` | Client → Server | User is typing |
| `user_typing` | Server → Client | Remote user typing |

---

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/lawtalk
PORT=5000
JWT_SECRET=your-super-secret-jwt-key
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000
```
