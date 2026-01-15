# Process Modeler - Bachelor Thesis

Intelligente Automatisierung von Prozessmodellierung (Text-to-BPMN) basierend auf Verwaltungsvorschriften.

**Live Demo:** [http://209.38.205.46:3000](http://209.38.205.46:3000)  
**n8n Workflow Engine:** [https://209.38.205.46.nip.io](https://209.38.205.46.nip.io)

---

## 🏗️ Architektur

Das System folgt einer Microservice-Architektur auf einem Digital Ocean Droplet.

```mermaid
graph TD
    User[Anwender] -->|Port 3000| Frontend["React Frontend (PM2)"]
    User -->|HTTPS| Caddy[Caddy Reverse Proxy]
    
    subgraph "Docker Container Network"
        Caddy -->|/webhook| n8n[n8n Automation Engine]
        n8n -->|RAG / LLM| Backend[FastAPI Backend]
        Backend --> DB[("PostgreSQL + pgvector")]
        Backend --> Cache[("Redis")]
    end
    
    Frontend -->|API Calls| n8n

🚀 Quick Start

1. Lokale Entwicklung (Mac/Linux/Windows)

git clone [https://github.com/amue11er/process-modeller-thesis.git](https://github.com/amue11er/process-modeller-thesis.git)
cd process-modeller-thesis

# Docker Services starten (PostgreSQL, Redis, n8n)
docker-compose up -d

# Frontend starten
cd apps/frontend-react
npm install
npm start
# → http://localhost:3000
