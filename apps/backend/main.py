from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv
from pathlib import Path
import requests
from datetime import datetime

load_dotenv(".env.local")

app = FastAPI(title="Process Modeler")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# N8N WEBHOOK URL
N8N_WEBHOOK_URL = "https://n8n.pxtra.de/webhook/86236ead-9d06-4d89-9242-daf3461510de"

@app.post("/api/archive-pair")
async def archive_pair(
    pdf_file: UploadFile = File(...),
    bpmn_file: UploadFile = File(...),
    pdf_name: str = Form(...),
    bpmn_name: str = Form(...)
):
    """
    Empfängt PDF + BPMN Dateien und triggert n8n Workflow für Vector DB Upload
    """
    try:
        # 1. Erstelle Verzeichnis
        archive_dir = Path("data/archive-uploads")
        archive_dir.mkdir(parents=True, exist_ok=True)
        
        # 2. Speichere PDF
        pdf_path = archive_dir / pdf_name
        pdf_content = await pdf_file.read()
        with open(pdf_path, "wb") as f:
            f.write(pdf_content)
        
        # 3. Speichere BPMN
        bpmn_path = archive_dir / bpmn_name
        bpmn_content = await bpmn_file.read()
        with open(bpmn_path, "wb") as f:
            f.write(bpmn_content)
        
        print(f"✅ Files gespeichert: {pdf_path}, {bpmn_path}")
        
        # 4. Trigger n8n Webhook
        payload = {
            "pdfPath": str(pdf_path.absolute()),
            "bpmnPath": str(bpmn_path.absolute()),
            "pdfName": pdf_name,
            "bpmnName": bpmn_name,
            "pdfSize": len(pdf_content),
            "bpmnSize": len(bpmn_content),
            "timestamp": datetime.now().isoformat()
        }
        
        print(f"📤 Triggere n8n Webhook mit Payload: {payload}")
        
        response = requests.post(N8N_WEBHOOK_URL, json=payload, timeout=30)
        
        print(f"✅ n8n Response: {response.status_code}")
        
        return {
            "status": "success",
            "message": "Modell-Paar an n8n Workflow gesendet",
            "files": {
                "pdf": str(pdf_path),
                "bpmn": str(bpmn_path)
            },
            "n8n_webhook_triggered": True
        }
    
    except Exception as e:
        print(f"❌ Fehler: {str(e)}")
        return {
            "status": "error",
            "message": str(e)
        }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
