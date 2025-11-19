import streamlit as st
import requests
import json
from datetime import datetime

# Page Config
st.set_page_config(
    page_title="Process Modeler",
    page_icon="⚙️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Styling
st.markdown("""
<style>
    .main {
        padding: 2rem;
    }
    .stTabs [data-baseweb="tab-list"] button [data-testid="stMarkdownContainer"] p {
        font-size: 1.1rem;
    }
</style>
""", unsafe_allow_html=True)

# Header
st.title("⚙️ Process Modeler")
st.markdown("*Intelligente Automatisierung von Prozessmodellierung für Verwaltungsvorschriften*")

# Sidebar
with st.sidebar:
    st.header("Settings")
    api_url = st.text_input("API URL", value="http://localhost:8000")
    st.divider()
    
    if st.button("🔄 Check Backend Health"):
        try:
            response = requests.get(f"{api_url}/health")
            if response.status_code == 200:
                st.success("✅ Backend is running!")
            else:
                st.error("❌ Backend error")
        except Exception as e:
            st.error(f"❌ Cannot connect to backend: {str(e)}")

# Main Tabs
tab1, tab2, tab3 = st.tabs(["📁 Upload", "📊 Dashboard", "ℹ️ Info"])

with tab1:
    st.header("Document Upload")
    
    col1, col2 = st.columns([3, 1])
    
    with col1:
        uploaded_file = st.file_uploader(
            "Upload PDF Document",
            type=["pdf"],
            help="Upload a German administrative document (Verwaltungsvorschrift)"
        )
    
    with col2:
        process_name = st.text_input(
            "Process Name",
            placeholder="z.B. Genehmigungsverfahren",
            help="Name for this process modeling task"
        )
    
    if uploaded_file is not None:
        st.divider()
        
        # File Info
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("File Name", uploaded_file.name)
        with col2:
            st.metric("File Size", f"{uploaded_file.size / 1024:.1f} KB")
        with col3:
            st.metric("Uploaded", datetime.now().strftime("%H:%M:%S"))
        
        st.divider()
        
        # Upload Button
        if st.button("🚀 Start Processing", type="primary", use_container_width=True):
            with st.spinner("📤 Uploading document..."):
                try:
                    # Prepare file
                    files = {'file': (uploaded_file.name, uploaded_file, 'application/pdf')}
                    data = {'process_name': process_name or uploaded_file.name}
                    
                    # Send to backend
                    response = requests.post(
                        f"{api_url}/api/upload",
                        files=files,
                        data=data,
                        timeout=30
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        st.success(f"✅ Document uploaded! Process ID: {result.get('process_id')}")
                        
                        # Save to session state
                        st.session_state.last_process_id = result.get('process_id')
                        st.session_state.last_process_name = process_name or uploaded_file.name
                        
                        st.info("""
                        **Processing started!**
                        - Document is being extracted and chunked
                        - Embeddings are being generated
                        - AI analysis will run next
                        
                        Check the Dashboard tab for progress.
                        """)
                    else:
                        st.error(f"❌ Upload failed: {response.text}")
                        
                except Exception as e:
                    st.error(f"❌ Error: {str(e)}")

with tab2:
    st.header("Dashboard")
    
    if 'last_process_id' in st.session_state:
        process_id = st.session_state.last_process_id
        process_name = st.session_state.last_process_name
        
        st.subheader(f"Process: {process_name}")
        st.write(f"**Process ID:** `{process_id}`")
        st.divider()
        
        # Status Metrics
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric("Status", "Processing", delta="Active")
        with col2:
            st.metric("Documents", "1", delta="+1")
        with col3:
            st.metric("Activities", "—", help="Waiting for extraction")
        with col4:
            st.metric("Quality Score", "—", help="Waiting for analysis")
        
        st.divider()
        
        # Progress
        st.subheader("Processing Pipeline")
        
        progress_steps = {
            "Document Extraction": True,
            "Text Chunking": True,
            "Embeddings Generation": False,
            "AI Analysis": False,
            "BPMN Generation": False,
        }
        
        for step, done in progress_steps.items():
            if done:
                st.success(f"✅ {step}")
            else:
                st.info(f"⏳ {step}")
        
        st.divider()
        
        # Refresh button
        if st.button("🔄 Refresh Status", use_container_width=True):
            st.rerun()
    
    else:
        st.info("👈 Upload a document first to see dashboard")

with tab3:
    st.header("About Process Modeler")
    
    st.markdown("""
    ### 🎯 Ziel
    Intelligente Automatisierung der Prozessmodellierung aus Verwaltungsvorschriften.
    
    ### 🚀 Features (in Entwicklung)
    - 📄 PDF Document Upload
    - 🔍 Automatic Text Extraction
    - 🧠 AI-Powered Analysis (Gemini + Claude)
    - 📊 BPMN Diagram Generation
    - ✅ Quality Metrics & Validation
    
    ### 🛠️ Tech Stack
    - **Frontend:** Streamlit
    - **Backend:** FastAPI
    - **Orchestration:** n8n
    - **Database:** PostgreSQL + pgvector
    - **LLMs:** Google Gemini, Anthropic Claude
    
    ### 📝 Status
    - Week 1: ✅ Backend Setup
    - Week 2: 🚀 Frontend & First Workflows
    - Week 3-16: Core Features & AI Integration
    
    ### 🔗 Links
    - [GitHub Repository](https://github.com/amue11er/process-modeller-thesis)
    - [Backend API Docs](http://localhost:8000/docs)
    - [n8n Workflows](http://localhost:5678)
    """)

# Footer
st.divider()
st.caption("Process Modeler | University of Rostock | Bachelor Thesis")
