# Process Modeler - Bachelor Thesis

Intelligente Automatisierung von Prozessmodellierung für Verwaltungsvorschriften.

**Live Demo:** http://209.38.205.46:3000

---

## 🚀 Quick Start

### Lokale Entwicklung (Mac/Linux)

```bash
git clone https://github.com/amue11er/process-modeller-thesis.git
cd process-modeller-thesis

# Docker Services starten (PostgreSQL, Redis, n8n)
docker-compose up -d

# Frontend starten
cd apps/frontend-react
npm install
npm start
# → http://localhost:3000
```

### Production Server (Digital Ocean)

```bash
ssh root@209.38.205.46

cd /opt/process-modeller-thesis
docker-compose up -d

cd apps/frontend-react
HOST=0.0.0.0 npm start
# → http://209.38.205.46:3000
```

---

## 🏗️ Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                         INTERNET                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ Port 80/443
┌─────────────────────────────────────────────────────────────┐
│                     CADDY (Reverse Proxy)                    │
│                   209.38.205.46.nip.io                       │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Frontend   │    │     n8n      │    │  Portainer   │
│    React     │    │  Workflows   │    │   Docker UI  │
│  Port 3000   │    │  Port 5678   │    │  Port 9000   │
└──────────────┘    └──────────────┘    └──────────────┘
                           │
                           ▼ Webhooks
                    ┌──────────────┐
                    │   Backend    │
                    │   FastAPI    │
                    │  Port 8000   │
                    └──────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                                     ▼
┌──────────────┐                    ┌──────────────┐
│  PostgreSQL  │                    │    Redis     │
│  + pgvector  │                    │    Cache     │
└──────────────┘                    └──────────────┘
```

---

## 📦 Services

| Service | Port | URL | Beschreibung |
|---------|------|-----|--------------|
| Frontend | 3000 | http://209.38.205.46:3000 | React UI |
| n8n | 5678 | https://209.38.205.46.nip.io | Workflow Automation |
| PostgreSQL | 5432 | - | Datenbank + pgvector |
| Redis | 6379 | - | Cache |
| Caddy | 80/443 | - | Reverse Proxy, SSL |
| Portainer | 9000 | - | Docker Management |

---

## 🔄 Development Workflow

### 1. Lokal entwickeln

```bash
cd ~/dev/process-modeller-thesis
# Änderungen machen...

# Lokal testen
cd apps/frontend-react
npm start
# → http://localhost:3000
```

### 2. Änderungen pushen

```bash
git add .
git commit -m "feat: beschreibung"
git push origin main
```

### 3. Auf Server deployen

```bash
ssh root@209.38.205.46

cd /opt/process-modeller-thesis
git pull origin main

# Falls package.json geändert:
cd apps/frontend-react
npm install

# Frontend neu starten
pkill -f "react-scripts"
HOST=0.0.0.0 npm start
```

---

## 🖥️ Server Management

### Alle Services starten

```bash
ssh root@209.38.205.46
cd /opt/process-modeller-thesis

# Docker Services
docker-compose up -d

# Frontend (im Hintergrund mit screen)
screen -S frontend
cd apps/frontend-react
HOST=0.0.0.0 npm start
# Ctrl+A, dann D zum Detachen
```

### Status prüfen

```bash
docker ps                      # Docker Container
screen -r frontend             # Frontend Logs
netstat -tlnp | grep 3000      # Port Check
```

### Services neustarten

```bash
# Docker Services
docker-compose restart

# Frontend
pkill -f "react-scripts"
cd /opt/process-modeller-thesis/apps/frontend-react
HOST=0.0.0.0 npm start
```

---

## 🔧 Troubleshooting

### npm install wird "Killed" (Out of Memory)

```bash
# Swap aktivieren
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Dann nochmal
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Port 3000 blockiert

```bash
# Prozess finden und beenden
pkill -f "react-scripts"
# oder
kill $(lsof -t -i:3000)
```

### Frontend nicht erreichbar

1. Check ob Prozess läuft: `netstat -tlnp | grep 3000`
2. Check Digital Ocean Firewall: Port 3000 TCP muss offen sein
3. Check ob auf 0.0.0.0 gebunden: `HOST=0.0.0.0 npm start`

### Docker Container down

```bash
docker-compose up -d
docker ps  # Alle sollten "Up" sein
```

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React 19, Tailwind CSS, bpmn-js |
| Backend | FastAPI (Python) |
| Database | PostgreSQL + pgvector |
| Cache | Redis |
| Workflows | n8n |
| LLMs | Google Gemini, Claude |
| Deployment | Docker Compose, Digital Ocean |
| Reverse Proxy | Caddy (Auto-SSL) |

---

## 📁 Projektstruktur

```
process-modeller-thesis/
├── apps/
│   ├── backend/           # FastAPI Backend
│   │   ├── main.py
│   │   └── requirements.txt
│   └── frontend-react/    # React Frontend
│       ├── src/App.js
│       └── package.json
├── docker-compose.yml     # Docker Services
├── Caddyfile              # Reverse Proxy Config
└── README.md
```

---

## 📋 API Endpoints (n8n Webhooks)

| Endpoint | Funktion |
|----------|----------|
| `/webhook/extract-activities` | Tätigkeitsliste extrahieren |
| `/webhook/classify-rag` | FIM-Klassifizierung |
| `/webhook/generate` | BPMN generieren |
| `/webhook/archive` | Dokumente abrufen |
| `/webhook/ingest` | Trainingspaket speichern |
| `/webhook/delete` | Dokument löschen |

---

## 📄 License

MIT License - See LICENSE file
