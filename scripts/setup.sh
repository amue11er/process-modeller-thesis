#!/bin/bash
set -e

echo "🚀 Process Modeler Setup"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose not found. Please install Docker Compose."
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.12+."
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites installed${NC}"
echo ""

# 2. Environment Setup
echo -e "${YELLOW}📝 Setting up environment...${NC}"

if [ ! -f .env.local ]; then
    cp .env.example .env.local
    echo -e "${GREEN}✅ Created .env.local${NC}"
    echo -e "${YELLOW}⚠️  Please edit .env.local and add your API keys!${NC}"
else
    echo -e "${GREEN}✅ .env.local already exists${NC}"
fi
echo ""

# 3. Docker Setup
echo -e "${YELLOW}🐳 Starting Docker containers...${NC}"

docker-compose down 2>/dev/null || true
docker-compose up -d

echo -e "${YELLOW}⏳ Waiting for PostgreSQL to be ready...${NC}"
sleep 5

# Check if postgres is healthy
until docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
    echo "Waiting for PostgreSQL..."
    sleep 2
done

echo -e "${GREEN}✅ Docker services started${NC}"
docker-compose ps
echo ""

# 4. Backend Setup
echo -e "${YELLOW}⚙️  Setting up backend...${NC}"

cd apps/backend

if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate venv
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt > /dev/null 2>&1

echo -e "${GREEN}✅ Backend setup complete${NC}"
echo ""

# 5. Summary
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Edit .env.local with your API keys:"
echo "   nano ../.env.local"
echo ""
echo "2. Start backend (in this terminal, it's already activated):"
echo "   python -m uvicorn main:app --host 0.0.0.0 --port 8000"
echo ""
echo "3. Start frontend (in a new terminal):"
echo "   cd apps/frontend"
echo "   pip install -r requirements.txt"
echo "   streamlit run app.py"
echo ""
echo "📱 Access services at:"
echo "   - Backend: http://localhost:8000"
echo "   - Backend Docs: http://localhost:8000/docs"
echo "   - Frontend: http://localhost:8501 (after week 2)"
echo "   - n8n: http://localhost:5678"
echo "   - PostgreSQL: localhost:5432"
echo ""
