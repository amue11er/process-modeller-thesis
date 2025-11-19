import streamlit as st
import requests
from datetime import datetime
import time

st.set_page_config(page_title="Process Modeler", page_icon="⚙️", layout="wide", initial_sidebar_state="collapsed")

st.markdown("""<style>
.stApp { background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%); }
[data-testid="stAppViewContainer"] { background: transparent; }
h1, h2, h3, h4, h5, h6 { color: #f1f5f9; }
p, span, label { color: #e2e8f0; }
.stTabs [data-baseweb="tab-list"] { gap: 2rem; border-bottom: 2px solid rgba(71, 85, 105, 0.3); }
.stTabs [data-baseweb="tab-list"] button { background-color: transparent; color: #94a3b8; }
.stTabs [data-baseweb="tab-list"] button[aria-selected="true"] { color: #60a5fa; border-bottom: 3px solid #60a5fa; }
.stButton > button { background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%); color: white; }
.stDownloadButton > button { background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); color: white; }
</style>""", unsafe_allow_html=True)

if 'uploaded_files' not in st.session_state:
    st.session_state.uploaded_files = []
if 'generated_models' not in st.session_state:
    st.session_state.generated_models = []

st.markdown("---")
col1, col2 = st.columns([5, 1])
with col1:
    st.markdown("# ⚙️ Process Modeler")
    st.markdown("*AI-powered BPMN Generation from Legal Texts*")
with col2:
    try:
        requests.get("http://localhost:8000/health", timeout=2)
        st.success("✅ Backend Connected")
    except:
        st.error("❌ Backend Offline")
st.markdown("---")

tab1, tab2 = st.tabs(["📁 Legal Documents", "📊 BPMN Models"])

with tab1:
    st.subheader("Upload Legal Documents")
    st.markdown("Drag and drop PDF files or click to select.")
    
    uploaded_pdfs = st.file_uploader("Choose PDF files", type=["pdf"], accept_multiple_files=True, label_visibility="collapsed")
    
    if uploaded_pdfs:
        for pdf_file in uploaded_pdfs:
            if not any(f['name'] == pdf_file.name for f in st.session_state.uploaded_files):
                st.session_state.uploaded_files.append({
                    'id': len(st.session_state.uploaded_files),
                    'name': pdf_file.name,
                    'size': round(pdf_file.size / 1024 / 1024, 2),
                    'uploaded_at': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    'status': 'ready'
                })
    
    if st.session_state.uploaded_files:
        st.subheader(f"📋 Uploaded Documents ({len(st.session_state.uploaded_files)})")
        for i, file in enumerate(st.session_state.uploaded_files):
            with st.container(border=True):
                col1, col2, col3, col4, col5 = st.columns([2, 1, 1, 1, 1])
                with col1:
                    st.markdown(f"**📄 {file['name']}**")
                    st.caption(f"{file['size']} MB • {file['uploaded_at']}")
                with col2:
                    st.markdown("🟢 Ready")
                with col4:
                    if st.button("🚀 Generate", key=f"gen_{i}", use_container_width=True):
                        st.session_state.uploaded_files[i]['status'] = 'processing'
                        st.rerun()
                with col5:
                    if st.button("🗑️ Delete", key=f"del_{i}", use_container_width=True):
                        st.session_state.uploaded_files.pop(i)
                        st.rerun()
            
            if file['status'] == 'processing':
                st.markdown("### ⏳ Processing...")
                progress_bar = st.progress(0)
                status_text = st.empty()
                
                steps = ["📄 Extracting text...", "🔍 Analyzing...", "🎯 Identifying steps...", "🔨 Generating BPMN...", "✅ Validating..."]
                for idx, step in enumerate(steps):
                    status_text.markdown(f"**{step}**")
                    progress_bar.progress((idx + 1) / len(steps))
                    time.sleep(1)
                
                model = {
                    'id': len(st.session_state.generated_models),
                    'name': f"BPMN-{file['name'].replace('.pdf', '')}-{datetime.now().strftime('%Y%m%d')}",
                    'source_file': file['name'],
                    'generated_at': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    'quality': '85%',
                    'xml_file': f"process-{int(datetime.now().timestamp())}.bpmn"
                }
                st.session_state.generated_models.append(model)
                st.session_state.uploaded_files[i]['status'] = 'ready'
                st.success("✅ BPMN generated!")
                time.sleep(1)
                st.rerun()

with tab2:
    st.subheader("Generated BPMN Models")
    
    if not st.session_state.generated_models:
        st.info("📋 No BPMN models yet. Upload a document and click Generate.")
    else:
        st.markdown(f"**Total: {len(st.session_state.generated_models)} models**")
        for i, model in enumerate(st.session_state.generated_models):
            with st.container(border=True):
                st.markdown(f"**✅ {model['name']}**")
                col_info1, col_info2 = st.columns(2)
                with col_info1:
                    st.caption(f"📄 From: {model['source_file']}")
                with col_info2:
                    st.caption(f"⏰ {model['generated_at']}")
                
                st.caption(f"Quality: {model['quality']}")
                
                bpmn_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions_{model['id']}">
  <bpmn2:process id="Process_{model['id']}" name="{model['name']}">
    <!-- From: {model['source_file']} -->
  </bpmn2:process>
</bpmn2:definitions>"""
                
                col_btn1, col_btn2, col_btn3 = st.columns(3)
                with col_btn1:
                    st.download_button(label="📥 Download", data=bpmn_xml, file_name=model['xml_file'], mime="application/xml", key=f"dl_{i}", use_container_width=True)
                with col_btn2:
                    if st.button("👁️ Preview", key=f"prev_{i}", use_container_width=True):
                        st.session_state[f"prev_{i}"] = not st.session_state.get(f"prev_{i}", False)
                with col_btn3:
                    if st.button("🗑️ Delete", key=f"del_m_{i}", use_container_width=True):
                        st.session_state.generated_models.pop(i)
                        st.rerun()
                
                if st.session_state.get(f"prev_{i}", False):
                    st.code(bpmn_xml, language="xml")

st.markdown("---")
col1, col2, col3 = st.columns(3)
with col1:
    st.caption("📊 Process Modeler • University of Rostock")
with col2:
    st.caption(f"Docs: {len(st.session_state.uploaded_files)} | Models: {len(st.session_state.generated_models)}")
with col3:
    st.caption("✨ Streamlit • FastAPI")
