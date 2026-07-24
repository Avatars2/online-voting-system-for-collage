# 🗳️ Online Voting System for College

A secure, full-stack digital democracy platform designed for college elections. This system enables students, teachers, HODs, and administrators to participate in and manage transparent, tamper-proof elections with real-time updates, fraud detection, and comprehensive audit trails.

---

## 📋 Table of Contents

- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [System Architecture](#-system-architecture)
- [Prerequisites](#-prerequisites)
- [Installation & Setup](#-installation--setup)
- [Environment Variables](#-environment-variables)
- [Running the Application](#-running-the-application)
- [Project Structure](#-project-structure)
- [API Endpoints](#-api-endpoints)
- [Database Models](#-database-models)
- [User Roles & Permissions](#-user-roles--permissions)
- [Security Features](#-security-features)
- [Deployment](#-deployment)
- [Screenshots](#-screenshots)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### 🔐 Authentication & Authorization
- JWT-based secure login system with token refresh
- OTP verification via email for account security
- Password reset with tokenized email links
- Role-based access control (Admin, HOD, Teacher, Student)
- Account lockout & suspension mechanisms

### 🗳️ Election Management
- Create and manage elections at multiple levels: **Global**, **Department**, and **Class**
- Set election schedules with start and end dates
- Add candidates with profiles and campaign details
- Real-time vote counting and result tabulation
- Election result publishing with detailed analytics

### 📊 Dashboard & Analytics
- Role-specific dashboards for Admin, HOD, Teacher, and Student
- Real-time election statistics and voter turnout
- Interactive result pages with vote breakdowns
- Student and department management panels

### 🔔 Real-time Notifications
- WebSocket-powered live notifications
- Election start/end alerts
- Result announcement broadcasts
- Notice board with targeted audience delivery

### 🛡️ Security & Fraud Detection
- Advanced fraud detection with risk scoring
- IP tracking and device fingerprinting
- Network-based and temporal anomaly detection
- Complete voting audit trail preservation
- Vote dispute management and resolution system
- XSS and NoSQL injection prevention
- Rate limiting and brute-force protection

### 📱 Progressive Web App
- Mobile-responsive design
- PWA-ready with service worker support
- Offline capability for essential features
- Touch-optimized UI components

### 📢 Notice Board System
- Create and publish notices with PDF attachments
- Target-specific audiences (All, Students, Department, Class)
- Rich text notice body with file support

---

## 🛠️ Technology Stack

### Backend
| Technology | Purpose |
|---|---|
| **Node.js** | Server runtime environment |
| **Express.js** | RESTful API web framework |
| **MongoDB** | NoSQL database for data persistence |
| **Mongoose** | MongoDB object modeling (ODM) |
| **JSON Web Tokens (JWT)** | Stateless authentication |
| **WebSocket (ws)** | Real-time bidirectional communication |
| **Nodemailer** | Email service for OTP & notifications |
| **Helmet** | HTTP security headers |
| **bcrypt.js** | Password hashing |
| **express-rate-limit** | API rate limiting |
| **express-mongo-sanitize** | NoSQL injection prevention |
| **Multer** | File upload handling |
| **xlsx** | Excel file processing (reports) |
| **xss** | XSS sanitization |

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** | Component-based UI framework |
| **Vite** | Next-gen frontend build tool |
| **React Router v7** | Client-side routing & navigation |
| **Tailwind CSS v4** | Utility-first CSS framework |
| **Lucide React** | Modern icon library |
| **Axios** | HTTP client for API calls |
| **Jest** | Unit testing framework |
| **React Testing Library** | Component testing utilities |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Browser)                      │
│              React + Vite + Tailwind CSS                 │
│         ┌──────────┬──────────┬──────────┐              │
│         │  Admin   │  Teacher │ Student  │              │
│         │Dashboard │Dashboard │Dashboard │              │
│         └────┬─────┴────┬─────┴────┬─────┘              │
└──────────────┼──────────┼──────────┼────────────────────┘
               │          │          │
        ┌──────▼──────────▼──────────▼──────┐
        │         REST API / WebSocket       │
        │         (Express.js Server)        │
        ├────────────────────────────────────┤
        │  Middleware Layer                  │
        │  ├─ JWT Authentication             │
        │  ├─ Role-based Authorization       │
        │  ├─ Rate Limiting                  │
        │  ├─ Security Headers (Helmet)      │
        │  ├─ Input Sanitization             │
        │  └─ Security Monitoring            │
        ├────────────────────────────────────┤
        │  Controllers                       │
        │  ├─ Auth (Login/Register/OTP)      │
        │  ├─ Admin (Users/Elections/Dept)    │
        │  ├─ HOD (Registration/Management)  │
        │  ├─ Teacher (Classes/Students)     │
        │  ├─ Student (Vote/Elections)       │
        │  └─ Vote (Cast/Count/Audit)        │
        ├────────────────────────────────────┤
        │  Services                          │
        │  ├─ WebSocket Service              │
        │  ├─ OTP Service                    │
        │  └─ Email Validation Service       │
        └──────────────┬─────────────────────┘
                       │
              ┌────────▼────────┐
              │    MongoDB      │
              │  (Database)     │
              └─────────────────┘
```

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** – v18.0 or higher → [Download](https://nodejs.org/)
- **MongoDB** – v6.0 or higher → [Download](https://www.mongodb.com/try/download/community)
- **npm** – v9.0 or higher (comes with Node.js)
- **Git** – Latest version → [Download](https://git-scm.com/)

---

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/online-voting-system-for-collage.git
cd online-voting-system-for-collage
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

### 4. Configure Environment Variables

```bash
cd ../backend
cp .env.example .env
```

Edit the `.env` file with your credentials (see [Environment Variables](#-environment-variables) section below).

---

## 🔧 Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Database
MONGODB_URI=mongodb://localhost:27017/online-voting-system

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Email Configuration (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Admin Configuration
ADMIN_EMAIL=admin@example.com

# Security Settings
ACCOUNT_LOCKOUT_DURATION=1800000
ACCOUNT_SUSPENSION_DURATION=604800000
PASSWORD_RESET_EXPIRES_IN=3600000
EMAIL_VERIFICATION_EXPIRES_IN=600000
```

> **Note:** For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833) instead of your regular password.

---

## ▶️ Running the Application

### Development Mode

Open **two terminal windows**:

**Terminal 1 – Backend Server (Port 5000):**
```bash
cd backend
npm run dev
```

**Terminal 2 – Frontend Dev Server (Port 5173):**
```bash
cd frontend
npm run dev
```

The application will be accessible at: **http://localhost:5173**

### Production Build

```bash
# Build the frontend
cd frontend
npm run build

# Start the backend server
cd ../backend
npm start
```

---

## 📁 Project Structure

```
online-voting-system-for-collage/
│
├── backend/                          # Express.js REST API server
│   ├── config/                       # Configuration files
│   │   ├── db.js                     #   MongoDB connection setup
│   │   ├── email.js                  #   Nodemailer email configuration
│   │   └── redis.js                  #   Redis configuration (optional caching)
│   │
│   ├── controllers/                  # Request handlers (business logic)
│   │   ├── adminController.js        #   Admin operations (CRUD users, elections)
│   │   ├── authController.js         #   Authentication (login, register, OTP)
│   │   ├── auditController.js        #   Voting audit trail management
│   │   ├── hodTeacherController.js   #   HOD & teacher operations
│   │   ├── studentController.js      #   Student-specific operations
│   │   ├── voteController.js         #   Vote casting and counting
│   │   ├── validationController.js   #   Email validation
│   │   ├── safeDeletionController.js #   Safe user deletion with audit
│   │   └── softDeleteController.js   #   Soft delete operations
│   │
│   ├── middleware/                    # Express middleware
│   │   ├── auth.js                   #   JWT authentication middleware
│   │   ├── roleAuth.js               #   Role-based authorization
│   │   ├── security.js               #   Security headers, rate limiting, sanitization
│   │   ├── securityMonitor.js        #   Login attempt monitoring
│   │   └── validation.js             #   Input validation rules
│   │
│   ├── models/                       # Mongoose database schemas
│   │   ├── User.js                   #   User model (all roles)
│   │   ├── Election.js               #   Election model
│   │   ├── Candidate.js              #   Candidate model
│   │   ├── Vote.js                   #   Vote model with fraud detection
│   │   ├── VotingAudit.js            #   Voting audit trail model
│   │   ├── Department.js             #   Department model
│   │   ├── Class.js                  #   Class model
│   │   ├── Notice.js                 #   Notice/announcement model
│   │   ├── Result.js                 #   Election result model
│   │   └── Admin.js                  #   Admin-specific model
│   │
│   ├── routes/                       # API route definitions
│   │   ├── auth.js                   #   /api/auth routes
│   │   ├── admin.js                  #   /api/admin routes
│   │   ├── hod.js                    #   /api/hod routes
│   │   ├── teacher.js                #   /api/teacher routes
│   │   ├── student.js                #   /api/student routes
│   │   ├── notice.js                 #   /api/notices routes
│   │   └── voteRoutes.js             #   /api/votes routes
│   │
│   ├── services/                     # Business logic services
│   │   ├── websocketService.js       #   WebSocket real-time notifications
│   │   ├── otpService.js             #   OTP generation and verification
│   │   └── emailValidationService.js #   Email validation service
│   │
│   ├── utils/                        # Utility functions
│   │   ├── jwtUtils.js               #   JWT helper functions
│   │   ├── messages.js               #   Email templates & messages
│   │   ├── softDeleteService.js      #   Soft delete utility
│   │   └── electionDataProtection.js #   Election data integrity
│   │
│   ├── server.js                     # Application entry point
│   ├── package.json                  # Backend dependencies
│   └── vercel.json                   # Vercel deployment config
│
├── frontend/                         # React SPA (Vite)
│   ├── public/                       # Static assets
│   ├── src/
│   │   ├── components/               # Reusable React components
│   │   │   ├── AdminMobileShell.jsx  #   Admin mobile layout wrapper
│   │   │   ├── StudentMobileShell.jsx#   Student mobile layout wrapper
│   │   │   ├── ProtectedRoute.jsx    #   Auth-guarded route component
│   │   │   ├── ErrorBoundary.jsx     #   Error boundary component
│   │   │   ├── LoadingSkeleton.jsx   #   Loading state skeletons
│   │   │   ├── OTPVerification.jsx   #   OTP input component
│   │   │   ├── RealtimeNotifications.jsx # WebSocket notification handler
│   │   │   └── UI/                   #   Common UI components
│   │   │
│   │   ├── pages/                    # Page-level components
│   │   │   ├── shared/               #   Shared pages (Login, Dashboard, etc.)
│   │   │   │   ├── Login.jsx
│   │   │   │   ├── DashboardPage.jsx
│   │   │   │   ├── ProfilePage.jsx
│   │   │   │   ├── ElectionCreationPage.jsx
│   │   │   │   ├── ResultsPage.jsx
│   │   │   │   ├── ResultDetailPage.jsx
│   │   │   │   ├── StudentRegistrationPage.jsx
│   │   │   │   ├── StudentsPage.jsx
│   │   │   │   ├── DepartmentDetail.jsx
│   │   │   │   ├── ClassDetailPage.jsx
│   │   │   │   ├── NoticePage.jsx
│   │   │   │   ├── ForgotPasswordReset.jsx
│   │   │   │   ├── ResetPassword.jsx
│   │   │   │   └── NotFoundPage.jsx
│   │   │   ├── admin/                #   Admin-only pages
│   │   │   │   ├── DepartmentPage.jsx
│   │   │   │   └── ClassPage.jsx
│   │   │   ├── hod/                  #   HOD-only pages
│   │   │   │   └── HODRegistration.jsx
│   │   │   ├── teacher/              #   Teacher-only pages
│   │   │   │   ├── TeacherClassPage.jsx
│   │   │   │   └── TeacherStudentDetail.jsx
│   │   │   └── student/              #   Student-only pages
│   │   │       ├── StudentElection.jsx
│   │   │       └── VotePage.jsx
│   │   │
│   │   ├── services/                 # API & service layer
│   │   │   ├── api.js                #   Axios API client configuration
│   │   │   └── realtimeService.js    #   WebSocket client service
│   │   │
│   │   ├── hooks/                    # Custom React hooks
│   │   │   └── useToast.js           #   Toast notification hook
│   │   │
│   │   ├── utils/                    # Utility functions
│   │   │   ├── messages.js           #   UI message constants
│   │   │   ├── validation.js         #   Form validation utilities
│   │   │   └── pageStatePersistence.js # Page state persistence utility
│   │   │
│   │   ├── assets/                   # Images, fonts, etc.
│   │   ├── App.jsx                   # Root application component
│   │   ├── App.css                   # Global styles
│   │   ├── index.css                 # Base CSS with Tailwind imports
│   │   └── main.jsx                  # React DOM entry point
│   │
│   ├── index.html                    # HTML template
│   ├── vite.config.js                # Vite configuration
│   ├── tailwind.config.js            # Tailwind CSS configuration
│   ├── postcss.config.js             # PostCSS configuration
│   ├── jest.config.js                # Jest testing configuration
│   ├── eslint.config.js              # ESLint configuration
│   ├── package.json                  # Frontend dependencies
│   └── vercel.json                   # Vercel deployment config
│
├── .gitignore                        # Git ignored files
└── README.md                         # Project documentation (this file)
```

---

## 🔌 API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | User login with email & password |
| `POST` | `/api/auth/register` | Register a new user account |
| `POST` | `/api/auth/verify-otp` | Verify OTP for email verification |
| `POST` | `/api/auth/forgot-password` | Request password reset email |
| `POST` | `/api/auth/reset-password` | Reset password with token |

### Admin (`/api/admin`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/users` | Get all users |
| `POST` | `/api/admin/users` | Create a new user |
| `PUT` | `/api/admin/users/:id` | Update user details |
| `DELETE` | `/api/admin/users/:id` | Delete a user (with audit) |
| `GET` | `/api/admin/departments` | Get all departments |
| `POST` | `/api/admin/departments` | Create a department |
| `GET` | `/api/admin/classes` | Get all classes |
| `POST` | `/api/admin/classes` | Create a class |
| `GET` | `/api/admin/elections` | Get all elections |
| `POST` | `/api/admin/elections` | Create an election |

### HOD (`/api/hod`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/hod/register` | HOD registration |
| `GET` | `/api/hod/department` | Get assigned department info |
| `GET` | `/api/hod/students` | Get department students |

### Teacher (`/api/teacher`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/teacher/class` | Get assigned class info |
| `GET` | `/api/teacher/students` | Get class students |
| `PUT` | `/api/teacher/students/:id` | Update student details |

### Student (`/api/student`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/student/elections` | Get available elections |
| `POST` | `/api/student/vote` | Cast a vote |
| `GET` | `/api/student/results` | Get election results |

### Notices (`/api/notices`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/notices` | Get all notices |
| `POST` | `/api/notices` | Create a notice (Admin/HOD/Teacher) |
| `PUT` | `/api/notices/:id` | Update a notice |
| `DELETE` | `/api/notices/:id` | Delete a notice |

### Utility
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Server health check |
| `POST` | `/api/validate/email-quick` | Quick email format validation |
| `POST` | `/api/validate/email-full` | Full email deliverability check |

---

## 🗄️ Database Models

### User
Stores all user accounts with role-based fields, security settings, and soft-delete support.
- Fields: `name`, `email`, `password`, `role`, `studentId`, `department`, `class`, `votedElections`
- Security: `loginAttempts`, `isLocked`, `lockUntil`, `isSuspended`, `isEmailVerified`

### Election
Defines elections with scope levels and scheduling.
- Fields: `title`, `description`, `startDate`, `endDate`, `level` (global/department/class), `isPublic`

### Candidate
Represents candidates registered for elections.
- Fields: `name`, `election`, `votes`, `profile`

### Vote
Stores individual votes with comprehensive metadata for fraud detection.
- Fields: `userId`, `electionId`, `candidateId`, `votedAt`
- Metadata: `ipAddress`, `userAgent`, `deviceInfo`, `votingMethod`, `location`
- Security: `fraudFlags`, `voteStatus`, `auditTrail`
- Constraint: One vote per user per election (compound unique index)

### VotingAudit
Immutable audit trail preserving vote records even after user deletion.
- Includes: Original user info, deletion context, fraud analysis, election context, security metrics

### Department & Class
Organizational structure models for scoping elections and users.

### Notice
Announcements with targeted audience delivery and PDF attachment support.

---

## 👥 User Roles & Permissions

| Feature | Admin | HOD | Teacher | Student |
|---------|:-----:|:---:|:-------:|:-------:|
| Manage Users | ✅ | ❌ | ❌ | ❌ |
| Create Elections | ✅ | ✅ | ❌ | ❌ |
| Manage Departments | ✅ | ❌ | ❌ | ❌ |
| Manage Classes | ✅ | ❌ | ❌ | ❌ |
| Register HODs/Teachers | ✅ | ✅ | ❌ | ❌ |
| View Department Students | ✅ | ✅ | ❌ | ❌ |
| View Class Students | ✅ | ✅ | ✅ | ❌ |
| Cast Votes | ❌ | ❌ | ❌ | ✅ |
| View Results | ✅ | ✅ | ✅ | ✅ |
| Create Notices | ✅ | ✅ | ✅ | ❌ |
| View Audit Trail | ✅ | ❌ | ❌ | ❌ |
| View Profile | ✅ | ✅ | ✅ | ✅ |

---

## 🔒 Security Features

### Authentication Security
- **Password Hashing** – bcrypt with 10 salt rounds
- **JWT Tokens** – Stateless authentication with configurable expiration
- **OTP Verification** – Time-limited email-based verification codes
- **Account Lockout** – Automatic lockout after repeated failed attempts
- **Password Reset** – Secure tokenized password recovery via email

### API Security
- **Helmet** – Sets various HTTP security headers
- **CORS** – Configured cross-origin resource sharing
- **Rate Limiting** – Separate limits for auth and general endpoints
- **Request Size Limiting** – 10MB body size cap
- **Compression** – Response compression middleware

### Data Security
- **MongoDB Sanitization** – Prevents NoSQL injection attacks
- **XSS Protection** – Input sanitization against cross-site scripting
- **Input Validation** – Express-validator for all user inputs
- **IP Blocking** – Block suspicious IP addresses

### Vote Integrity
- **One Vote Per Election** – Database-enforced unique constraint
- **Atomic Transactions** – MongoDB transactions for vote casting
- **Fraud Detection** – Multi-layered detection (IP, device, temporal, network)
- **Audit Trail** – Immutable record of all voting actions
- **Vote Recount** – Administrative capability to recount elections
- **Dispute Resolution** – System for flagging and resolving disputed votes

---

## 🌐 Deployment

### Vercel Deployment

Both the backend and frontend include `vercel.json` configurations for easy deployment.

**Backend:**
```bash
cd backend
vercel --prod
```

**Frontend:**
```bash
cd frontend
vercel --prod
```

> Update the `FRONTEND_URL` in the backend `.env` and the API base URL in the frontend `.env.production` to match your deployed URLs.

### Docker (Optional)

```bash
# Build and run with Docker Compose
docker-compose up --build
```

---

## 🧪 Testing

### Frontend Tests

```bash
cd frontend

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run tests for CI
npm run test:ci
```

### Backend Testing

```bash
cd backend

# Test account lockout
npm run test-lockout

# Test Redis OTP
npm run test-redis-otp
```

---

## 📸 Screenshots

> Screenshots can be added here to showcase the application UI.
>
> Suggested screenshots:
> - Login Page
> - Admin Dashboard
> - Election Creation
> - Student Voting Page
> - Election Results
> - Notice Board

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Coding Guidelines
- Follow ESLint rules configured in the project
- Write meaningful commit messages
- Add tests for new features where applicable
- Update documentation for significant changes

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

Developed as a college project for enabling transparent and secure digital elections.

---

<p align="center">
  Made with ❤️ for Digital Democracy
</p>
