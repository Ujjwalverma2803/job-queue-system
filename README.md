# Distributed Job Queue System

A production-grade distributed job queue system built with Node.js, TypeScript, Bull, Redis, and PostgreSQL. Features priority queuing, exponential backoff retry, dead letter queue, tiered rate limiting, and real-time job tracking — deployed on Render with GitHub Actions CI/CD.

## Live Demo

- **API Service:** https://job-queue-api-wuz7.onrender.com
- **API Health:** https://job-queue-api-wuz7.onrender.com/health

---

## Architecture
Client Request
↓
Express API (Port 3000)
↓
API Key Authentication
↓
Tier-based Rate Limiter
↓
Bull Queue (Redis broker)
↓ ↓
PostgreSQL Worker Service
(job stored) (job processed)
↓
Result stored in PostgreSQL
↓
Client polls GET /api/jobs/:id

---

## Features

- Priority queues — high, medium, low
- Exponential backoff retry — 3 attempts with 2s, 4s, 8s delays
- Dead letter queue for exhausted failed jobs
- Tiered rate limiting — free 20 req/min, premium 200 req/min
- High priority jobs restricted to premium tier only
- Real-time job status tracking via PostgreSQL
- Three job types — email, image processing, report generation
- Full job lifecycle — pending, active, completed, failed, cancelled
- Independent API and worker microservices
- Fully containerized with Docker Compose

---

## Tech Stack

| Component | Technology |
|---|---|
| Language | Node.js + TypeScript |
| Framework | Express |
| Queue | Bull (Redis-backed) |
| Message Broker | Redis (Upstash in production) |
| Database | PostgreSQL (Supabase in production) |
| Deployment | Render |
| Containers | Docker + Docker Compose |
| CI/CD | GitHub Actions |

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | /health | None | Health check |
| POST | /api/jobs | API Key | Submit a new job |
| GET | /api/jobs | API Key | List all jobs with filters |
| GET | /api/jobs/:id | API Key | Get job status and result |
| DELETE | /api/jobs/:id | API Key | Cancel a pending job |
| GET | /api/stats | API Key | Queue statistics breakdown |

---

## Authentication

Pass your API key in every request header:
x-api-key: your-api-key-here


| Tier | API Key | Rate Limit | High Priority |
|---|---|---|---|
| Free | free-api-key-123 | 20 req/min | No |
| Premium | premium-api-key-456 | 200 req/min | Yes |

---

## Job Types and Payloads

### Email Job
```json
{
  "type": "email",
  "priority": "medium",
  "payload": {
    "to": "user@example.com",
    "subject": "Hello World",
    "body": "Email content here"
  }
}
Image Processing Job
JSON

{
  "type": "image",
  "priority": "low",
  "payload": {
    "url": "https://example.com/photo.jpg",
    "operations": ["resize", "compress"]
  }
}
Report Generation Job
JSON

{
  "type": "report",
  "priority": "high",
  "payload": {
    "report_type": "monthly",
    "date_range": "2026-06",
    "filters": {}
  }
}
Priority System
Priority	Processing Order	Available To
high	First (Bull priority 1)	Premium tier only
medium	Default (Bull priority 5)	All tiers
low	Last (Bull priority 10)	All tiers
Retry and Dead Letter Queue
text

Job fails on attempt 1
      ↓
Wait 2 seconds (exponential backoff)
      ↓
Retry attempt 2
      ↓
Wait 4 seconds
      ↓
Retry attempt 3
      ↓
All attempts exhausted
      ↓
Job marked as failed — moved to dead letter
Status updated in PostgreSQL
Job Lifecycle

submitted → pending → active → completed
                   ↓
                failed (retried up to 3x)
                   ↓
              dead letter (all attempts exhausted)

pending → cancelled (via DELETE /api/jobs/:id)
Quick Start
Prerequisites
Docker Desktop
Node.js 18+
Run Locally

git clone https://github.com/Ujjwalverma2803/job-queue-system
cd job-queue-system
cp .env.example .env
docker-compose up --build
Services Available At
API: http://localhost:3000
Bull Board Dashboard: http://localhost:3001
Worker: processing jobs in background
Environment Variables
Variable	Description
DATABASE_URL	PostgreSQL connection string
REDIS_URL	Redis connection string
JWT_SECRET	Secret for future JWT auth
NODE_ENV	development or production
API_PORT	API server port (default 3000)
WORKER_CONCURRENCY	Jobs processed simultaneously per queue
Example API Calls
Submit an email job

curl -X POST https://job-queue-api-wuz7.onrender.com/api/jobs \
  -H "Content-Type: application/json" \
  -H "x-api-key: free-api-key-123" \
  -d '{
    "type": "email",
    "payload": {
      "to": "test@gmail.com",
      "subject": "Hello",
      "body": "Test email"
    }
  }'
Check job status

curl https://job-queue-api-wuz7.onrender.com/api/jobs/JOB_ID \
  -H "x-api-key: free-api-key-123"
Get queue statistics

curl https://job-queue-api-wuz7.onrender.com/api/stats \
  -H "x-api-key: free-api-key-123"
Submit high priority job (premium only)

curl -X POST https://job-queue-api-wuz7.onrender.com/api/jobs \
  -H "Content-Type: application/json" \
  -H "x-api-key: premium-api-key-456" \
  -d '{
    "type": "report",
    "priority": "high",
    "payload": {
      "report_type": "monthly",
      "date_range": "2026-06"
    }
  }'
Cancel a pending job

curl -X DELETE https://job-queue-api-wuz7.onrender.com/api/jobs/JOB_ID \
  -H "x-api-key: free-api-key-123"
Project Structure

job-queue-system/
├── docker-compose.yml
├── .env.example
├── README.md
├── database/
│   └── init.sql
├── .github/
│   └── workflows/
│       └── deploy.yml
├── services/
│   ├── api/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── server.ts
│   │       ├── app.ts
│   │       ├── routes/
│   │       │   ├── jobs.ts
│   │       │   └── health.ts
│   │       ├── middleware/
│   │       │   ├── auth.ts
│   │       │   ├── rateLimit.ts
│   │       │   └── errorHandler.ts
│   │       ├── config/
│   │       │   ├── db.ts
│   │       │   ├── queue.ts
│   │       │   └── redis.ts
│   │       └── utils/
│   │           └── logger.ts
│   └── worker/
│       ├── Dockerfile
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── worker.ts
│           ├── processors/
│           │   ├── emailProcessor.ts
│           │   ├── imageProcessor.ts
│           │   └── reportProcessor.ts
│           ├── config/
│           │   ├── db.ts
│           │   ├── queue.ts
│           │   └── redis.ts
│           └── utils/
│               └── logger.ts
└── tests/
    └── jobs.test.ts
Deployment
Production Stack

API Service    → Render (Web Service)
Worker Service → Render (Web Service)
Database       → Supabase PostgreSQL
Message Broker → Upstash Redis
CI/CD          → GitHub Actions
Deploy Your Own

1. Fork this repo
2. Create accounts on Render, Supabase, Upstash
3. Create PostgreSQL on Supabase — run database/init.sql
4. Create Redis on Upstash
5. Deploy services/api as Web Service on Render
6. Deploy services/worker as Web Service on Render
7. Add environment variables in Render dashboard
8. Both services deploy automatically on every push


---

## Push README

```powershell
git add .
git commit -m "add production README"
git push
