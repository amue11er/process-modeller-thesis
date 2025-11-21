import streamlit as st
import requests
import json
from datetime import datetime
import time

# -----------------------------------------------------------------------------
# 1. KONFIGURATION & STYLING (FIM-PORTAL STYLE)
# -----------------------------------------------------------------------------

st.set_page_config(
    page_title="Process Modeler | Verwaltungsportal",
    page_icon="⚖️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS für den FIM/Behörden-Look
st.markdown("""
<style>
    /* GRUNDLAYOUT & HINTERGRUND */
    .stApp {
        background-color: #F3F5F7; /* Helles Behörden-Grau */
        color: #333333;
        font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    
    /* HEADER BEREICH */
    header[data-testid="stHeader"] {
        background-color: #FFFFFF;
        border-bottom: 1px solid #E5E7EB;
    }

    /* ÜBERSCHRIFTEN */
    h1, h2, h3 {
        color: #1A3A5F; /* Seriöses Dunkelblau */
        font-weight: 600;
    }
    h1 { margin-top: -1rem; }

    /* CONTAINERS & KARTEN */
    [data-testid="stVerticalBlock"] > div > div[data-testid="stVerticalBlock"] {
        background-color: #FFFFFF;
        padding: 1.5rem;
        border-radius: 4px;
        border: 1px solid #E2E8F0;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    /* TABS DESIGN */
    .stTabs [data-baseweb="tab-list"] {
        gap: 2px;
        background-color: transparent;
        border-bottom: 2px solid #E2E8F0;
    }
    .stTabs [data-baseweb="tab"] {
        height: 50px;
        white-space: pre-wrap;
        background-color: #FFFFFF;
        border-radius: 4px 4px 0px 0px;
        color: #4B5563;
        font-weight: 500;
        border: 1px solid transparent;
    }
    .stTabs [aria-selected="true"] {
        background-color: #FFFFFF;
        color: #1A3A5F; /* Active Blue */
        border-bottom: 2px solid #D97706; /* Gold/Orange Akzent (typisch Bund/FIM) */
        font-weight: bold;
    }

    /* BUTTONS (FIM Style - Eckig & Seriös) */
    .stButton > button {
        background-color: #1A3A5F;
        color: white;
        border-radius: 4px;
        border: none;
        padding: 0.5rem 1rem;
        font-weight: 500;
        box-shadow: none;
        transition: background-color 0.2s;
    }
    .stButton > button:hover {
        background-color: #2C5282;
        color: white;
        border: none;
    }
    /* Sekundäre Buttons (Outline) */
    div[data-testid="column"] .stButton > button {
        width: 100%;
    }

    /* DOWNLOAD BUTTON */
    .stDownloadButton > button {
        background-color: #FFFFFF;
        color: #1A3A5F;
        border: 1px solid #1A3A5F;
        border-radius: 4px;
    }
    .stDownloadButton > button:hover {
        background-color: #F8FAFC;
        color: #1A3A5F;
    }

    /* ALERTS & STATUS */
    .stAlert {
        background-color: #EFF6FF;
        border: 1px solid #BFDBFE;
        color: #1E3A8A;
        border-radius: 4px;
    }
    
    /* SIDEBAR */
    [data-testid="stSidebar"] {
        background-color: #FFFFFF;
        border-right: 1px solid #E5E7EB;
    }
</style>
""", unsafe_allow_html=True)

# -----------------------------------------------------------------------------
# 2. SESSION STATE MANAGEMENT
# -----------------------------------------------------------------------------

if 'uploaded_files' not in st.session_state:
    st.session_state.uploaded_files = []
if 'generated_models' not in st.session_state:
    st.session_state.generated_models = []
if 'ratings' not in st.session_state:
    st.session_state.ratings = []

# -----------------------------------------------------------------------------
# 3. SIDEBAR (META-INFOS)
# -----------------------------------------------------------------------------

with st.sidebar:
    st.image("https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Dienstsiegel_der_Bundesbeh%C3%B6rden_%28Bundesadler%29.svg/100px-Dienstsiegel_der_Bundesbeh%C3%B6rden_%28Bundesadler%29.svg.png", width=80)
    st.markdown("### Process Modeler")
    st.caption("Version 1.0.2 (BETA)")
    st.markdown("---")
    
    # Backend Status Check (Discreet)
    try:
        # Mock check usually, put real url here
        # response = requests.get("http://localhost:8000/health", timeout=1)
        st.markdown("##### Systemstatus")
        st.success("Backend verbunden")
    except:
        st.markdown("##### Systemstatus")
        st.error("Backend nicht erreichbar")
        
    st.markdown("---")
    st.info("""
    **Hinweis zur Nutzung:**
    Laden Sie nur bereinigte Gesetzestexte oder Verwaltungsvorschriften im PDF-Format hoch.
    """)

# -----------------------------------------------------------------------------
# 4. MAIN CONTENT
# -----------------------------------------------------------------------------

# Header Area
col_h1, col_h2 = st.columns([3, 1])
with col_h1:
    st.title("Automatisierte Prozessmodellierung")
    st.markdown("Generierung von BPMN 2.0 Modellen aus Rechtstexten der öffentlichen Verwaltung.")

st.markdown("---")

# Navigation Tabs
tab1, tab2, tab3 = st.tabs(["Dokumentenablage", "Modell-Generierung", "Qualitätssicherung & Feedback"])

# --- TAB 1: UPLOAD (Dokumentenablage) ---
with tab1:
    st.subheader("Gesetzestexte importieren")
    st.markdown("Laden Sie hier die Quelldateien für die Prozessanalyse hoch.")
    
    with st.container():
        uploaded_pdfs = st.file_uploader(
            "Datei auswählen (PDF)",
            type=["pdf"],
            accept_multiple_files=True
        )

        if uploaded_pdfs:
            for pdf_file in uploaded_pdfs:
                # Check if already added
                if not any(f['name'] == pdf_file.name for f in st.session_state.uploaded_files):
                    st.session_state.uploaded_files.append({
                        'id': len(st.session_state.uploaded_files),
                        'name': pdf_file.name,
                        'size': f"{round(pdf_file.size / 1024 / 1024, 2)} MB",
                        'uploaded_at': datetime.now().strftime("%d.%m.%Y %H:%M"),
                        'status': 'Bereit zur Analyse',
                        'object': pdf_file
                    })
    
    # File List Table Style
    if st.session_state.uploaded_files:
        st.markdown("#### Verfügbare Dokumente")
        
        # Header Row
        c1, c2, c3, c4 = st.columns([3, 2, 2, 2])
        c1.markdown("**Dateiname**")
        c2.markdown("**Größe**")
        c3.markdown("**Importdatum**")
        c4.markdown("**Aktion**")
        st.markdown("<hr style='margin: 0.5rem 0; border-color: #E5E7EB;'>", unsafe_allow_html=True)

        for i, file in enumerate(st.session_state.uploaded_files):
            c1, c2, c3, c4 = st.columns([3, 2, 2, 2])
            with c1:
                st.markdown(f"📄 {file['name']}")
            with c2:
                st.text(file['size'])
            with c3:
                st.text(file['uploaded_at'])
            with c4:
                if st.button("Löschen", key=f"del_{i}"):
                    st.session_state.uploaded_files.pop(i)
                    st.rerun()

# --- TAB 2: GENERATION & MODELS (Modell-Generierung) ---
with tab2:
    st.subheader("BPMN Generierung")
    
    if not st.session_state.uploaded_files:
        st.info("Bitte laden Sie zunächst Dokumente im Reiter 'Dokumentenablage' hoch.")
    else:
        # Selection for Generation
        st.markdown("Wählen Sie ein Dokument zur Analyse:")
        
        col_sel, col_btn = st.columns([3, 1])
        with col_sel:
            selected_doc_name = st.selectbox(
                "Verfügbare Dokumente",
                options=[f['name'] for f in st.session_state.uploaded_files],
                label_visibility="collapsed"
            )
        with col_btn:
            if st.button("Prozessmodell generieren", type="primary", use_container_width=True):
                # PROCESSING SIMULATION
                with st.status("Analysiere Rechtstext...", expanded=True) as status:
                    st.write("Extrahiere Textinhalte...")
                    time.sleep(1)
                    st.write("Identifiziere Prozessbeteiligte und Aktivitäten...")
                    time.sleep(1.5)
                    st.write("Erstelle BPMN 2.0 XML Struktur...")
                    time.sleep(1)
                    status.update(label="Generierung erfolgreich abgeschlossen", state="complete", expanded=False)
                
                # Create Mock Model
                new_model = {
                    'id': len(st.session_state.generated_models) + 1,
                    'name': f"Prozess: {selected_doc_name.replace('.pdf', '')}",
                    'source': selected_doc_name,
                    'date': datetime.now().strftime("%d.%m.%Y %H:%M"),
                    'xml_content': '<?xml version="1.0" ...><bpmn:definitions>...</bpmn:definitions>',
                    'rated': False
                }
                st.session_state.generated_models.append(new_model)
                st.rerun()

    st.markdown("---")
    st.subheader("Generierte Modelle")
    
    if not st.session_state.generated_models:
        st.markdown("_Keine Modelle vorhanden._")
    else:
        for model in st.session_state.generated_models:
            with st.container():
                m1, m2, m3 = st.columns([4, 2, 2])
                with m1:
                    st.markdown(f"**{model['name']}**")
                    st.caption(f"Quelle: {model['source']} | ID: {model['id']}")
                with m2:
                    st.text(f"Erstellt: {model['date']}")
                with m3:
                    col_dl, col_del = st.columns(2)
                    with col_dl:
                        st.download_button(
                            "XML",
                            data=model['xml_content'],
                            file_name=f"model_{model['id']}.bpmn",
                            mime="application/xml",
                            key=f"dl_{model['id']}"
                        )
                    with col_del:
                         if st.button("🗑", key=f"del_mod_{model['id']}"):
                             # Logic to remove model would go here
                             pass

# --- TAB 3: RATING (Qualitätssicherung) ---
with tab3:
    st.subheader("Qualitätssicherung & Feedback")
    st.markdown("Bewerten Sie die Qualität der generierten Modelle, um den Algorithmus zu verbessern (Human-in-the-loop).")
    
    # Filter unrated models
    unrated_models = [m for m in st.session_state.generated_models if not m['rated']]
    
    if not unrated_models:
        st.success("Keine ausstehenden Bewertungen. Alle Modelle wurden geprüft.")
    else:
        model_to_rate = unrated_models[0] # Take first unrated
        
        with st.container():
            st.markdown(f"#### Bewertung für: {model_to_rate['name']}")
            st.info("Bitte prüfen Sie das Modell in ADONIS/BPMN-Tool vor der Bewertung.")
            
            with st.form(key="rating_form"):
                c_rate1, c_rate2 = st.columns(2)
                with c_rate1:
                    score = st.slider("Strukturelle Korrektheit (1-10)", 1, 10, 8)
                    accuracy = st.slider("Inhaltliche Genauigkeit (1-10)", 1, 10, 7)
                with c_rate2:
                    feedback_text = st.text_area("Qualitatives Feedback / Anmerkungen", placeholder="Z.B. Gateway an Stelle X fehlt...")
                
                submit_rating = st.form_submit_button("Bewertung speichern")
                
                if submit_rating:
                    # Save Rating logic
                    st.session_state.ratings.append({
                        'model_id': model_to_rate['id'],
                        'score': score,
                        'accuracy': accuracy,
                        'feedback': feedback_text,
                        'timestamp': datetime.now().isoformat()
                    })
                    # Mark as rated
                    for m in st.session_state.generated_models:
                        if m['id'] == model_to_rate['id']:
                            m['rated'] = True
                    st.success("Feedback gespeichert. Vielen Dank.")
                    time.sleep(1)
                    st.rerun()

    # History of Ratings
    if st.session_state.ratings:
        st.markdown("---")
        with st.expander("Historie der Bewertungen anzeigen"):
            for r in st.session_state.ratings:
                st.markdown(f"**Modell ID {r['model_id']}** - Score: {r['score']}/10")
                st.caption(r['feedback'])
                st.divider()

# FOOTER
st.markdown("<br><br><br>", unsafe_allow_html=True)
st.markdown("---")
col_f1, col_f2 = st.columns(2)
with col_f1:
    st.caption("© 2025 Universität Rostock - Lehrstuhl für Wirtschaftsinformatik")
with col_f2:
    st.caption("Systemstatus: Online | Umgebung: Localhost")
