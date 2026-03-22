# 🧟 Oblivion — Intelligent API Defense Platform for Banking

> **"Antivirus for APIs in a bank"** — Detects hidden, stale, and dangerous zombie APIs, scores their risk, and automates remediation.

---

## 🎯 What This Project Does

Oblivion is a full-stack cybersecurity platform that:

1. **Discovers** APIs from Swagger files, manual input, and simulated network scanning
2. **Classifies** each API as: `active`, `deprecated`, `orphaned`, or **`zombie`**
3. **Analyzes security** — authentication, HTTPS, rate limiting, PII exposure, OWASP API Top 10
4. **Scores risk** — 0 to 100 score per API, with `low / medium / high / critical` levels
5. **Detects zombies** — APIs with no traffic for 30+ days that are still publicly accessible
6. **Recommends fixes** — specific, actionable recommendations per API
7. **Alerts** — Jira ticket creation, Slack notifications, email alerts (configurable)
8. **Auto-quarantines** — one-click or automated shutdown of zombie APIs

---

## 🏗️ Architecture

```
Frontend (React)  ←→  Backend (Node/Express)  ←→  MongoDB
                            ↓
                   Classification Engine
                   (zombie detection + risk scoring)
                            ↓
                   Scanner Service
                   (Swagger parser + network scan)
                            ↓
                   Alert Service
                   (Jira / Slack / Email)
```

---

## 📁 Folder Structure

```
oblivion/
├── backend/
│   ├── server.js                    # Express entry point + cron scheduler
│   ├── models/
│   │   ├── API.js                   # API document schema
│   │   ├── Scan.js                  # Scan run tracking
│   │   └── Alert.js                 # Security alerts
│   ├── routes/
│   │   ├── apis.js                  # CRUD + quarantine/decommission
│   │   ├── scan.js                  # Trigger scans, upload Swagger
│   │   ├── dashboard.js             # Aggregated stats + trends
│   │   ├── security.js              # Posture + OWASP violations
│   │   ├── alerts.js                # Alert management
│   │   └── auth.js                  # JWT login
│   ├── services/
│   │   ├── classificationService.js # 🧠 THE BRAIN — zombie detection + risk scoring
│   │   ├── scannerService.js        # Swagger parsing + endpoint ingestion
│   │   └── alertService.js          # Alert creation + resolution
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── public/index.html
│   └── src/
│       ├── App.jsx                  # Router + sidebar layout
│       ├── App.css                  # Light banking theme design system
│       ├── index.js                 # React entry point
│       ├── utils/api.js             # All API calls (Axios)
│       └── pages/
│           ├── Dashboard.jsx        # Overview with charts + metrics
│           ├── Inventory.jsx        # Full API table with filters
│           ├── ZombieCenter.jsx     # 🔥 Zombie-focused view + actions
│           ├── SecurityPosture.jsx  # OWASP + compliance checks
│           ├── Remediation.jsx      # Fix queue + workflow
│           └── Monitoring.jsx       # Scan history + CI/CD integration
│
└── README.md
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router, Recharts, Lucide icons |
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose |
| Styling | Custom CSS (light banking theme, no UI library needed) |
| Scheduling | node-cron (auto-scans every 6h) |
| Auth | JWT |
| File parsing | js-yaml (Swagger YAML/JSON) |

---

## 🚀 Setup & Run

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env: set your MONGO_URI (default: mongodb://localhost:27017/oblivion)

npm install
npm run dev
# Backend runs on http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm start
# Frontend runs on http://localhost:3000
```

### 3. Load demo data

Once both are running, open `http://localhost:3000` and click **"Load Demo Data"** on the Overview page.

This seeds the system with realistic banking API data including:
- Active payment, auth, and account APIs
- Deprecated v1/v2 endpoints still accessible
- 5 zombie APIs with no traffic, no auth, and PII exposure

---

## 🧠 Zombie Detection Logic

An API is classified as a **Zombie** if ANY of these are true:

```
1. No traffic for 30+ days (configurable via ZOMBIE_THRESHOLD_DAYS)
2. Marked as deprecated but still publicly accessible
3. No owner assigned (team = 'unknown')
4. No documentation/description
```

### Risk Score Formula (0–100)

| Condition | Points |
|-----------|--------|
| No authentication | +30 |
| No HTTPS | +15 |
| Exposes PII data | +15 |
| Exposes financial data | +10 |
| No rate limiting | +10 |
| Each OWASP violation (max 10) | +1 each |
| **Is zombie** | ×1.3 multiplier |
| **Is orphaned** | ×1.1 multiplier |

Risk level thresholds: `low <25` · `medium <50` · `high <75` · `critical ≥75`

---

## 🔌 API Reference

### Core endpoints

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/api/dashboard/stats` | Aggregated metrics for overview |
| GET | `/api/apis` | List APIs with filters + pagination |
| GET | `/api/apis/zombies` | All zombie APIs |
| POST | `/api/scan/demo` | Load sample banking dataset |
| POST | `/api/scan/swagger` | Upload Swagger/OpenAPI file |
| POST | `/api/scan/endpoints` | Paste endpoint list |
| POST | `/api/apis/:id/quarantine` | Quarantine a zombie API |
| GET | `/api/security/posture` | Full security posture report |
| GET | `/api/alerts` | Alert list |

---

## 🎤 How to Present This Project

> *"We built Oblivion — a platform that continuously scans banking infrastructure to detect zombie APIs: endpoints that are no longer used but remain publicly accessible and pose serious security risks. The system parses Swagger files and network traffic, classifies every API using a rule-based engine, computes a risk score from 0 to 100 using OWASP criteria, and automatically quarantines high-risk zombies. It integrates with Jira, Slack, and CI/CD pipelines to enforce API lifecycle governance."*

### Why judges will love it

- ✅ **Real-world problem** — API sprawl is a top banking security risk (OWASP API Security Top 10)
- ✅ **Full-stack** — React frontend + Node backend + MongoDB + REST API
- ✅ **Security depth** — OWASP mapping, RBI/GDPR compliance checks, risk scoring
- ✅ **DevSecOps** — CI/CD integration snippets, scheduled scanning, automated alerts
- ✅ **Not a CRUD app** — actual detection logic with a classification engine

---

## 🔧 Configuration

```env
# Backend .env
PORT=5000
MONGO_URI=mongodb://localhost:27017/oblivion
JWT_SECRET=change-in-production

# Zombie detection thresholds
ZOMBIE_THRESHOLD_DAYS=30      # days of inactivity = zombie
ORPHAN_THRESHOLD_DAYS=14      # days of inactivity = orphaned

# Optional integrations
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SMTP_HOST=smtp.gmail.com
SMTP_USER=your@email.com
SMTP_PASS=app-password
```

---

## 📈 Future Enhancements

- [ ] Python ML microservice for anomaly detection using traffic time-series
- [ ] Real network traffic ingestion (Nginx logs, AWS API Gateway logs)
- [ ] GitHub repository scanning for API route definitions
- [ ] OWASP ZAP integration for active vulnerability scanning
- [ ] Role-based access control (RBAC) for Security, DevOps, Compliance roles
- [ ] Grafana dashboard integration via Prometheus metrics endpoint

---

## 👨‍💻 Built With

MERN Stack (MongoDB · Express · React · Node.js)

**Demo credentials** (once backend is running):
- Email: `admin@oblivion.bank`
- Password: `demo1234`