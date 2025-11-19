# Process Modeler - Bachelor Thesis

Intelligente Automatisierung von Prozessmodellierung für Verwaltungsvorschriften.

**Status:** Week 1 Complete - Backend & Docker Stack Running ✅

---

## Quick Start

### Option 1: Automated Setup (Recommended)
```bash
git clone https://github.com/amue11er/process-modeller-thesis.git
cd process-modeller-thesis

# Run setup script
./scripts/setup.sh

# Edit environment and add API keys
nano .env.local
# Add: GOOGLE_API_KEY, CLAUDE_API_KEY

# Start services (in separate terminals)
# Terminal 1: Backend
cd apps/backend && source venv/bin/activate
python -m uvicorn main:app --host 0.0.0.0 --port 8000

# Terminal 2: Frontend (Week 2+)
cd apps/frontend
streamlit run app.py
```

### Option 2: Manual Setup

**Prerequisites:**
- Docker & Docker Compose
- Python 3.12+
- Git

**Step 1: Clone & Setup Environment**
```bash
git clone https://github.com/amue11er/process-modeller-thesis.git
cd process-modeller-thesis

cp .env.example .env.local
# Edit .env.local and add your API keys:
# - GOOGLE_API_KEY (from Google AI Studio)
# - CLAUDE_API_KEY (from Anthropic)
```

**Step 2: Start Docker Services**
```bash
docker-compose up -d

# Verify all services are running
docker-compose ps
# You should see: postgres (healthy), redis, n8n (all running)
```

**Step 3: Setup Backend**
```bash
cd apps/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start backend server
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

**Step 4: Test Backend**
```bash
# In a new terminal
curl http://localhost:8000/health
# Expected: {"status":"healthy"}
```

**Step 5: Start Frontend (Week 2+)**
```bash
cd apps/frontend
pip install -r requirements.txt
streamlit run app.py
# Opens: http://localhost:8501
```

---

## Architecture
```
process-modeller-thesis/
├── apps/
│   ├── backend/           # FastAPI (Port 8000)
│   │   ├── main.py
│   │   └── requirements.txt
│   └── frontend/          # Streamlit (Port 8501) - Week 2+
├── services/              # Additional microservices
├── n8n-workflows/         # n8n workflow definitions
├── infrastructure/
│   ├── docker/            # Docker configurations
│   └── postgres/          # Database schemas
├── docs/                  # Documentation & thesis
├── docker-compose.yml     # Docker services (Postgres, Redis, n8n)
└── .env.example           # Environment template
```

---

## Running Services

### Docker Services (All running in background)
```bash
# Start all
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all
docker-compose down

# Check status
docker-compose ps
```

**Available Services:**
- **PostgreSQL:** `localhost:5432` (user: postgres, pw: devpassword)
- **Redis:** `localhost:6379`
- **n8n:** `http://localhost:5678` (Workflow Orchestration)

### Backend
```bash
cd apps/backend
source venv/bin/activate
python -m uvicorn main:app --host 0.0.0.0 --port 8000

# API Docs: http://localhost:8000/docs
```

### Frontend
```bash
cd apps/frontend
streamlit run app.py
# Opens: http://localhost:8501
```

---

## Development

### Adding Dependencies

**Backend:**
```bash
cd apps/backend
source venv/bin/activate
pip install new-package
pip freeze > requirements.txt
```

**Frontend:**
```bash
cd apps/frontend
pip install new-package
pip freeze > requirements.txt
```

### Database Access
```bash
# Via Docker
docker-compose exec postgres psql -U postgres -d process_modeler

# Or with CLI tools (if installed)
psql -h localhost -U postgres -d process_modeler
```

### n8n Workflows

1. Open http://localhost:5678
2. Create workflows for document processing & analysis
3. Set up webhooks to communicate with backend

---

## Project Timeline

- **Week 1:** ✅ Backend Setup, Docker, PostgreSQL
- **Week 2:** Frontend (Streamlit), First n8n Workflows
- **Week 3-4:** Core Features (Document Upload, PDF Processing)
- **Week 5-6:** AI Integration (Gemini, Claude, RAG)
- **Week 7-8:** BPMN Generation & Validation
- **Week 9-10:** n8n Orchestration Workflows
- **Week 11-12:** Frontend Refinement & UX
- **Week 13-14:** Testing & Quality Assurance
- **Week 15-16:** Thesis Documentation & Deployment

---

## Troubleshooting

### PostgreSQL Connection Issues
```bash
# Check if container is running
docker-compose ps

# View logs
docker-compose logs postgres

# Restart
docker-compose down
docker-compose up -d postgres
```

### Python Dependency Conflicts
```bash
# Clear cache and reinstall
pip install --upgrade pip
pip install --force-reinstall -r requirements.txt
```

### Port Already in Use
```bash
# Find process using port 8000
lsof -i :8000

# Kill it
kill -9 <PID>
```

### Device Switch / Different Machine

The project is fully portable via Docker + Git:
```bash
# On new machine
git clone https://github.com/amue11er/process-modeller-thesis.git
cd process-modeller-thesis

# Everything starts fresh
docker-compose up -d
cd apps/backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Database data is local (development mode) - production would use cloud database.

---

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend | Streamlit | UI/UX for process modeling |
| Backend | FastAPI | REST API |
| Database | PostgreSQL + pgvector | Data storage + vector embeddings |
| Cache | Redis | Session & temporary data |
| Orchestration | n8n | Workflow automation |
| LLMs | Google Gemini, Claude | AI processing |
| Deployment | Docker Compose | Local development |

---

## Git Workflow
```bash
# Before starting work
git pull origin main

# Make changes
git add .
git commit -m "feat: description of changes"
git push origin main

# Check status
git status
git log --oneline
```

---

## Support & Issues

- Check existing [GitHub Issues](https://github.com/amue11er/process-modeller-thesis/issues)
- Review logs: `docker-compose logs -f`
- Consult documentation in `/docs`

---

## License

MIT License - See LICENSE file
