import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Upload, FileText, Settings, HelpCircle, Menu, X, Download, Trash2, CheckCircle, Clock, Eye, Search, Edit2, FileJson, RefreshCw, Play, Maximize2, Plus, MessageSquare, Save, AlertCircle, List, Copy, Check, LogOut, User, Lock, Tags, FileCode, FileType, Database, Calendar } from 'lucide-react';

// --- BPMN Viewer ---
import BpmnViewer from 'bpmn-js/lib/NavigatedViewer';

// --- PDF Worker Setup (Version 3.11) ---
import { getDocument, GlobalWorkerOptions, version } from 'pdfjs-dist';
GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`;

// --- API URL ---
const API_BASE_URL = "https://209.38.205.46.nip.io/webhook";

// --- HILFSFUNKTIONEN ---

const extractTextFromPDF = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
};

const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

const extractContent = async (file) => {
  if (!file) return "";
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) {
    return await extractTextFromPDF(file);
  } else {
    return await readFileAsText(file);
  }
};

const cleanXmlResponse = (responseString) => {
  if (typeof responseString !== 'string') return '';
  return responseString.replace(/^```xml\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
};

const FileIcon = ({ fileName, size = 20, className = "" }) => {
  const name = fileName ? fileName.toLowerCase() : "";
  if (name.endsWith('.pdf')) return <FileText size={size} className={className} />;
  if (name.endsWith('.json')) return <FileJson size={size} className={className} />;
  if (name.endsWith('.md')) return <FileCode size={size} className={className} />;
  return <FileType size={size} className={className} />;
};

const BpmnVisu = ({ xml }) => {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !xml) return;
    viewerRef.current = new BpmnViewer({ container: containerRef.current, height: 500 });

    const renderBpmn = async () => {
      try {
        await viewerRef.current.importXML(xml);
        const canvas = viewerRef.current.get('canvas');
        canvas.zoom('fit-viewport');
      } catch (err) {
        console.error('BPMN Fehler:', err);
      }
    };
    renderBpmn();

    return () => { if (viewerRef.current) viewerRef.current.destroy(); };
  }, [xml]);

  return <div ref={containerRef} className="w-full h-full bg-white min-h-[400px]" />;
};

export default function ProcessModeller() {
  // --- STATE: LOGIN ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // --- STATE: VIEW MANAGEMENT ---
  const [currentView, setCurrentView] = useState('modeller'); 
  const [activeTab, setActiveTab] = useState('activities');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [previewItem, setPreviewItem] = useState(null);

  // --- STATE: MUSTERPROZESSE ---
  const [isUploadingPattern, setIsUploadingPattern] = useState(false);
  const [patternName, setPatternName] = useState('');
  const [xProcessFile, setXProcessFile] = useState(null);
  const [musterList, setMusterList] = useState([]);
  const [isLoadingMuster, setIsLoadingMuster] = useState(false);
  const [selectedPatternId, setSelectedPatternId] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [newName, setNewName] = useState('');

  // --- STATE: TÄTIGKEITSLISTE ---
  const [actFiles, setActFiles] = useState([]);
  const [extractedActivities, setExtractedActivities] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [userNotes, setUserNotes] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);

  // --- STATE: GENERATION TAB & XPROZESS ---
  const [genTitle, setGenTitle] = useState('');
  const [genFiles, setGenFiles] = useState([]);
  const [genNotes, setGenNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedXml, setGeneratedXml] = useState(null);
  const [generationError, setGenerationError] = useState(null);
  const [generatedModels, setGeneratedModels] = useState([]);

  // XProzess Metadaten
  const [katalogName, setKatalogName] = useState('Prozesskatalog M-V');
  const [bibliothekName, setBibliothekName] = useState('Prozessbibliothek');
  const [prozessId, setProzessId] = useState('');
  const [freigebendeStelle, setFreigebendeStelle] = useState('');
  const [ordnungsrahmen, setOrdnungsrahmen] = useState('FIM');
  const [klassenname, setKlassenname] = useState('');
  const [detLevel, setDetLevel] = useState('105');
  const [selectedStates, setSelectedStates] = useState(['13']); 
  const [steckbriefDraft, setSteckbriefDraft] = useState(null);
  const [isReviewing, setIsReviewing] = useState(false);

  // --- STATE: ARCHIV / RAG / HISTORY ---
  const [finalizedLists, setFinalizedLists] = useState([]);
  const [isLoadingFinalized, setIsLoadingFinalized] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);
  const [ragFile, setRagFile] = useState(null);
  const [ragResults, setRagResults] = useState([]);
  const [isClassifying, setIsClassifying] = useState(false);
  const [uploadPdfs, setUploadPdfs] = useState([]);
  const [uploadBpmn, setUploadBpmn] = useState(null);
  const [packageTitle, setPackageTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [documentPairs, setDocumentPairs] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // --- FUNKTIONEN: MUSTER & LISTEN ---
  const fetchMuster = async () => {
    setIsLoadingMuster(true);
    try {
      const response = await fetch(`${API_BASE_URL}/get_musterprozesse`);
      if (response.ok) {
        const data = await response.json();
        setMusterList(Array.isArray(data) ? data : (data.data || []));
      }
    } catch (error) { console.error("Fehler beim Laden der Muster:", error); }
    finally { setIsLoadingMuster(false); }
  };

  const deleteMuster = async (id) => {
    if (!window.confirm("Muster wirklich löschen?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/delete_musterprozess?id=${id}`, { method: 'DELETE' });
      if (response.ok) setMusterList(prevList => prevList.filter(item => item.id !== id));
    } catch (error) { console.error("Fehler beim Löschen:", error); }
  };

  const handleRename = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/rename_musterprozess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, newTitle: newName })
      });
      if (response.ok) {
        setMusterList(prev => prev.map(m => m.id === id ? { ...m, title: newName } : m));
        setEditingId(null);
      }
    } catch (e) { console.error("Fehler beim Umbenennen:", e); }
  };

  const handleUploadPattern = async () => {
    if (!patternName || !xProcessFile) return;
    setIsUploadingPattern(true);
    try {
      const formData = new FormData();
      formData.append('title', patternName);
      formData.append('xprocess', xProcessFile);
      const response = await fetch(`${API_BASE_URL}/insert_musterprozesse`, { method: 'POST', body: formData });
      if (response.ok) {
        setPatternName(''); setXProcessFile(null);
        await fetchMuster();
      }
    } catch (e) { alert("Upload-Fehler: " + e.message); }
    finally { setIsUploadingPattern(false); }
  };

  const fetchFinalizedLists = async () => {
    setIsLoadingFinalized(true);
    try {
      const response = await fetch(`${API_BASE_URL}/get-finalized-lists`);
      if (response.ok) {
        const data = await response.json();
        setFinalizedLists(Array.isArray(data) ? data : (data.data || []));
      }
    } catch (error) { console.error("Fehler beim Laden des Archivs:", error); }
    finally { setIsLoadingFinalized(false); }
  };

  const deleteFinalizedList = async (id) => {
    if (!window.confirm("Liste löschen?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/delete-finalized-list?id=${id}`, { method: 'DELETE' });
      if (response.ok) setFinalizedLists(prev => prev.filter(item => item.id !== id));
    } catch (error) { console.error("Fehler beim Löschen:", error); }
  };

  const loadFinalizedList = (item) => {
    setServiceName(item.titel);
    setUserNotes(item.user_notizen || '');
    setExtractedActivities(item.liste); 
    setActiveTab('activities');
  };

  // --- EDITOR LOGIK ---
  const updateActivityField = (index, field, value) => {
    const updated = [...extractedActivities];
    updated[index][field] = value;
    setExtractedActivities(updated);
  };

  const resequence = (list) => list.map((item, i) => {
    const { validated, ...rest } = item;
    return { ...rest, nr: i + 1 };
  });

  const deleteActivity = (index) => setExtractedActivities(prev => resequence(prev.filter((_, i) => i !== index)));
  const addActivity = () => setExtractedActivities(prev => resequence([...prev, { typ: 'Aktivitätengruppe', bezeichnung: '', handlungsgrundlage: '' }]));

  const handleFinalizeActivities = async () => {
    if (extractedActivities.length === 0) return;
    setIsFinalizing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/finalize-activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceName, userNotes, finalActivities: extractedActivities, finalizedAt: new Date().toISOString(), editor: "Arvid Müller" })
      });
      if (response.ok) {
        alert("Erfolgreich finalisiert!");
        addToHistory('activity_list', serviceName + " (Final)", extractedActivities, { userNotes, status: 'finalized' });
      }
    } catch (e) { alert("Fehler: " + e.message); }
    finally { setIsFinalizing(false); }
  };

  // --- GENERIERUNG LOGIK (n8n Schnittstelle) ---
  const handleGenerate = async () => {
    if (!genTitle || genFiles.length === 0) {
      alert("Bitte Titel und Gesetze angeben.");
      return;
    }
    setIsGenerating(true);
    setGeneratedXml(null);
    setGenerationError(null);
    setIsReviewing(false);

    try {
      const formData = new FormData();
      genFiles.forEach((file) => formData.append('files', file));
      formData.append('taetigkeitsliste', JSON.stringify(extractedActivities));
      formData.append('metadaten', JSON.stringify({
        prozessId: prozessId || `ID_${Date.now()}`,
        prozessname: genTitle,
        katalog: katalogName,
        bibliothek: bibliothekName,
        freigebendeStelle: freigebendeStelle,
        ordnungsrahmen: ordnungsrahmen,
        klasse: klassenname,
        detaillierungsstufe: detLevel,
        verwaltungspolitischeKodierung: selectedStates,
        notizen: genNotes
      }));

      const response = await fetch(`${API_BASE_URL}/generate`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const rawXml = data.bpmn_xml || data.text || data.output;
        if (rawXml) setGeneratedXml(cleanXmlResponse(rawXml));
        
        if (data.steckbrief || data.json) {
          setSteckbriefDraft(data.steckbrief || data.json);
          // Wir bleiben im Viewer, bieten aber Review Button an
        }
        
        const newModel = { id: Date.now(), name: genTitle, source: `${genFiles.length} Quellen`, createdAt: new Date().toLocaleString('de-DE'), status: 'completed' };
        setGeneratedModels([newModel, ...generatedModels]);
      } else { throw new Error("Server Fehler: " + response.status); }
    } catch (e) { setGenerationError(e.message); }
    finally { setIsGenerating(false); }
  };

  // --- HILFS-EFFEKTE & WEITERE FUNKTIONEN ---
  useEffect(() => { if (isLoggedIn) { fetchDocuments(); fetchMuster(); } }, [isLoggedIn]);

  const addToHistory = (type, title, data, meta = {}) => {
    const newItem = { id: Date.now().toString(), date: new Date().toISOString(), type, title: title || "Unbenannt", data, meta };
    setHistoryItems(prev => [newItem, ...prev]);
  };

  const deleteHistoryItem = (id) => { if (window.confirm("Löschen?")) setHistoryItems(prev => prev.filter(item => item.id !== id)); };

  const loadHistoryItem = (item) => {
    if (item.type === 'activity_list') {
      setServiceName(item.title); setExtractedActivities(item.data); setUserNotes(item.meta.userNotes || '');
      setActiveTab('activities');
    }
    setCurrentView('modeller');
  };

  const handleActFileSelect = (e) => { if (e.target.files) setActFiles(prev => [...prev, ...Array.from(e.target.files)]); };
  const removeActFile = (index) => setActFiles(prev => prev.filter((_, i) => i !== index));

  const handleExtractActivities = async () => {
    if (actFiles.length === 0 || !serviceName) return;
    setIsExtracting(true); setExtractedActivities([]);
    try {
      let fullText = "";
      for (const file of actFiles) {
        const text = await extractContent(file);
        fullText += `\n--- QUELLE: ${file.name} ---\n${text}\n`;
      }
      const response = await fetch(`${API_BASE_URL}/extract-activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: fullText, serviceName, userNotes, patternId: selectedPatternId })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.activities) {
          setExtractedActivities(data.activities);
          addToHistory('activity_list', serviceName, data.activities, { fileName: actFiles.map(f => f.name).join(', '), userNotes });
        }
      }
    } catch (e) { console.error(e); }
    finally { setIsExtracting(false); }
  };

  const handleClassifyRag = async () => {
    if (!ragFile) return;
    setIsClassifying(true); setRagResults([]);
    try {
      const text = await extractContent(ragFile);
      const response = await fetch(`${API_BASE_URL}/classify-rag`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text })
      });
      if (response.ok) {
        const data = await response.json();
        setRagResults(data.rag_results || data);
      }
    } catch (e) { console.error(e); }
    finally { setIsClassifying(false); }
  };

  const handleGenFileSelect = (e) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setGenFiles(prev => [...prev, ...files]);
      if (!genTitle && files.length > 0) setGenTitle(files[0].name.split('.')[0] + " (Prozess)");
    }
  };
  const removeGenFile = (i) => setGenFiles(prev => prev.filter((_, idx) => idx !== i));

  const fetchDocuments = async () => {
    setIsLoadingData(true);
    try {
      const response = await fetch(`${API_BASE_URL}/archive`);
      if (response.ok) {
        const data = await response.json();
        setDocumentPairs(data.map(item => ({
          id: item.id, title: item.title, createdAt: new Date(item.created_at).toLocaleString('de-DE'),
          raw_text: item.raw_law_text, xml_content: item.ground_truth_bpmn, fileCount: 1
        })));
      }
    } catch (e) { console.error(e); }
    finally { setIsLoadingData(false); }
  };

  const handlePdfSelect = (e) => {
    if (e.target.files) {
      setUploadPdfs(prev => [...prev, ...Array.from(e.target.files).map(file => ({
        id: Math.random().toString(36).substr(2, 9), file, customName: file.name.split('.')[0]
      }))]);
    }
  };

  const handleUpload = async () => {
    if (uploadPdfs.length === 0 || !uploadBpmn || !packageTitle) return;
    setIsUploading(true);
    try {
      let combinedText = "";
      for (const p of uploadPdfs) { combinedText += `\n--- QUELLE: ${p.customName} ---\n${await extractContent(p.file)}`; }
      const bpmnXml = await readFileAsText(uploadBpmn);
      const response = await fetch(`${API_BASE_URL}/ingest`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: packageTitle, raw_law_text: combinedText, ground_truth_bpmn: bpmnXml })
      });
      if (response.ok) { setUploadPdfs([]); setUploadBpmn(null); setPackageTitle(''); fetchDocuments(); }
    } catch (e) { console.error(e); }
    finally { setIsUploading(false); }
  };

  const handleDeletePair = async (id) => {
    if (!window.confirm("Löschen?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      if (response.ok) setDocumentPairs(prev => prev.filter(p => p.id !== id));
    } catch (e) { console.error(e); }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setTimeout(() => { setIsLoggedIn(true); setLoginLoading(false); }, 800);
  };

  // --- RENDER LOGIK ---
  if (!isLoggedIn) {
    return (
      <div className="flex h-screen bg-gray-950 items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-3xl font-black text-white">DVZ</span>
              <span className="text-blue-500 text-xl">×</span>
              <span className="text-xl font-bold text-slate-200">Arvid Müller</span>
            </div>
            <p className="text-slate-400 text-sm">XProzess Automatisierung</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-blue-500" placeholder="Benutzername" />
            <input type="password" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-blue-500" placeholder="Passwort" />
            <button type="submit" disabled={loginLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2">
              {loginLoading ? <Clock size={18} className="animate-spin" /> : "Anmelden"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950 text-slate-200 selection:bg-blue-500/30">
      
      {/* SIDEBAR */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300`}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between h-[69px]">
          {sidebarOpen && <span className="font-black text-white">DVZ MODELLER</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-500 hover:text-white"><Menu size={18} /></button>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavItem icon={<FileText size={18} />} label="Dokumentation" open={sidebarOpen} onClick={() => setCurrentView('modeller')} active={currentView === 'modeller'} />
          <NavItem icon={<Database size={18} />} label="Historie" open={sidebarOpen} onClick={() => setCurrentView('history')} active={currentView === 'history'} />
        </nav>
        <div className="p-3 border-t border-slate-800">
          <button onClick={() => setIsLoggedIn(false)} className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:bg-red-500/10 w-full"><LogOut size={18} />{sidebarOpen && "Abmelden"}</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        
        {currentView === 'history' && (
          <div className="flex-1 flex flex-col p-8 overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3"><Database className="text-blue-500" /> Verlauf</h2>
            <div className="grid gap-4">
              {historyItems.map(item => (
                <div key={item.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex justify-between items-center">
                  <div>
                    <div className="text-white font-bold">{item.title}</div>
                    <div className="text-xs text-slate-500">{new Date(item.date).toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => loadHistoryItem(item)} className="bg-blue-600 px-3 py-1.5 rounded text-xs">Öffnen</button>
                    <button onClick={() => deleteHistoryItem(item.id)} className="text-slate-500 hover:text-red-400"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentView === 'modeller' && (
          <>
            <div className="bg-slate-900 border-b border-slate-800 px-8 py-6">
              <h2 className="text-2xl font-bold text-white">Prozessmodellierung</h2>
              <p className="text-slate-400 text-sm">FIM & XProzess Generierung</p>
            </div>
            <div className="border-b border-slate-800 bg-slate-900/50 px-8 flex gap-8">
              <TabButton label="Editor" active={activeTab === 'activities'} onClick={() => setActiveTab('activities')} icon={<Edit2 size={16} />} />
              <TabButton label="RAG Klassifizierung" active={activeTab === 'rag'} onClick={() => setActiveTab('rag')} icon={<Tags size={16} />} />
              <TabButton label="Generierung" active={activeTab === 'generation'} onClick={() => setActiveTab('generation')} icon={<Play size={16} />} />
              <TabButton label="Archiv" active={activeTab === 'final_lists'} onClick={() => { setActiveTab('final_lists'); fetchFinalizedLists(); }} icon={<Database size={16} />} />
              <TabButton label="Training" active={activeTab === 'archive'} onClick={() => setActiveTab('archive')} icon={<FileType size={16} />} />
            </div>

            <main className="flex-1 overflow-y-auto p-8">
              
              {activeTab === 'activities' && (
                <div className="grid grid-cols-12 gap-8 h-[800px]">
                  <div className="col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-6 overflow-y-auto">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><List className="text-blue-500" /> Extraktion</h3>
                    <div className="space-y-4">
                      <input type="text" value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="Leistungstitel" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm" />
                      <textarea value={userNotes} onChange={(e) => setUserNotes(e.target.value)} placeholder="Notizen" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm h-24" />
                      <div className="border-2 border-dashed border-slate-800 rounded-xl p-4 text-center relative">
                        <input type="file" multiple onChange={handleActFileSelect} className="absolute inset-0 opacity-0 cursor-pointer" />
                        <span className="text-xs text-slate-500">PDF Gesetze hinzufügen ({actFiles.length})</span>
                      </div>
                      <button onClick={handleExtractActivities} disabled={isExtracting} className="w-full bg-blue-600 py-3 rounded-lg font-bold">
                        {isExtracting ? "Extrahiere..." : "Tätigkeiten laden"}
                      </button>
                    </div>
                  </div>
                  <div className="col-span-8 bg-slate-900 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-800 flex justify-between bg-slate-900/50">
                      <span className="font-bold">Prozess-Editor</span>
                      <div className="flex gap-2">
                        <button onClick={addActivity} className="text-xs bg-slate-800 px-2 py-1 rounded">+ Zeile</button>
                        <button onClick={handleFinalizeActivities} className="text-xs bg-green-600 px-3 py-1 rounded font-bold">Finalisieren</button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-auto bg-slate-950 p-4">
                      <table className="w-full text-xs">
                        <thead><tr className="text-slate-500 uppercase border-b border-slate-800"><th className="p-2 text-left">Nr</th><th className="p-2 text-left">Typ</th><th className="p-2 text-left">Bezeichnung</th><th className="p-2 text-left">Grundlage</th></tr></thead>
                        <tbody>
                          {extractedActivities.map((item, i) => (
                            <tr key={i} className="border-b border-slate-900 hover:bg-slate-900/50">
                              <td className="p-2 text-blue-500 font-bold">{item.nr}</td>
                              <td className="p-2">
                                <select value={item.typ} onChange={e => updateActivityField(i, 'typ', e.target.value)} className="bg-transparent outline-none">
                                  <option value="Aktivitätengruppe">AKTG</option>
                                  <option value="Prozessklasse">PKLS</option>
                                </select>
                              </td>
                              <td className="p-2"><textarea value={item.bezeichnung} onChange={e => updateActivityField(i, 'bezeichnung', e.target.value)} className="bg-transparent w-full resize-none outline-none" rows={1} /></td>
                              <td className="p-2"><textarea value={item.handlungsgrundlage} onChange={e => updateActivityField(i, 'handlungsgrundlage', e.target.value)} className="bg-transparent w-full text-slate-500 italic outline-none" rows={1} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'rag' && (
                <div className="grid grid-cols-2 gap-8 h-[700px]">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <h3 className="font-bold mb-4">RAG Bestimmung</h3>
                    <input type="file" onChange={e => setRagFile(e.target.files[0])} className="mb-4 text-sm" />
                    <button onClick={handleClassifyRag} className="w-full bg-blue-600 py-3 rounded-lg font-bold">Klassifizieren</button>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 overflow-y-auto">
                    {ragResults.map((r, i) => (
                      <div key={i} className="mb-4 p-3 bg-slate-900 rounded border border-slate-800">
                        <div className="text-blue-400 font-bold text-xs">{r.rag_name} ({r.rag_id})</div>
                        <div className="text-sm mt-1">{r.orig_text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'generation' && (
                <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 h-[850px] animate-in fade-in duration-500">
                  
                  {/* LINKE SPALTE: XProzess Konfiguration */}
                  <div className="lg:col-span-4 space-y-6 overflow-y-auto pr-2" style={{ maxHeight: '850px' }}>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Settings size={20} className="text-blue-400" /> Modell-Konfiguration
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Prozessname & ID</label>
                          <input type="text" value={genTitle} onChange={(e) => setGenTitle(e.target.value)} placeholder="Todesbescheinigung prüfen" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm mb-2" />
                          <input type="text" value={prozessId} onChange={(e) => setProzessId(e.target.value)} placeholder="Prozess-ID (z.B. 99...)" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs" />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Katalog</label>
                            <input type="text" value={katalogName} onChange={(e) => setKatalogName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Bibliothek</label>
                            <input type="text" value={bibliothekName} onChange={(e) => setBibliothekName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Detaillierungsstufe</label>
                          <select value={detLevel} onChange={(e) => setDetLevel(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs">
                            <option value="105">105 - Stammtext (Muster)</option>
                            <option value="102">102 - Land (Spezifisch)</option>
                            <option value="101">101 - Bund</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Gesetzestexte (PDF)</label>
                          <div className="bg-slate-950 border border-slate-700 rounded-lg overflow-hidden">
                            {genFiles.map((file, index) => (
                              <div key={index} className="flex items-center justify-between p-2 border-b border-slate-800 bg-slate-900/50 text-[10px]">
                                <span className="truncate text-slate-300">{file.name}</span>
                                <button onClick={() => removeGenFile(index)} className="text-slate-500 hover:text-red-400"><X size={12} /></button>
                              </div>
                            ))}
                            <div className="relative p-3 text-center hover:bg-slate-800 transition cursor-pointer border-t border-slate-800 border-dashed">
                              <input type="file" accept=".pdf" multiple onChange={handleGenFileSelect} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                              <div className="flex items-center justify-center gap-2 text-slate-500 text-[10px]"><Plus size={14} /> Dateien hinzufügen</div>
                            </div>
                          </div>
                        </div>

                        <button onClick={handleGenerate} disabled={isGenerating || genFiles.length === 0} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20">
                          {isGenerating ? <Clock size={20} className="animate-spin" /> : <Play size={20} />}
                          XProzess generieren
                        </button>
                      </div>
                    </div>
                    {generationError && <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg text-xs">{generationError}</div>}
                  </div>

                  {/* RECHTE SPALTE: BPMN-Viewer ODER Review-Maske */}
                  <div className="lg:col-span-8 flex flex-col h-full overflow-hidden">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-xl flex-1 flex flex-col overflow-hidden">
                      
                      {/* HEADER: Umschalter */}
                      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 rounded-t-xl shrink-0">
                        <div className="flex gap-6">
                          <button onClick={() => setIsReviewing(false)} className={`text-sm font-bold flex items-center gap-2 transition-colors ${!isReviewing ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}><Maximize2 size={16} /> BPMN Modell</button>
                          {steckbriefDraft && (
                            <button onClick={() => setIsReviewing(true)} className={`text-sm font-bold flex items-center gap-2 transition-colors ${isReviewing ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}><Edit2 size={16} /> Steckbrief-Review <span className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0.5 rounded-full ml-1">KI ENTWURF</span></button>
                          )}
                        </div>
                        {generatedXml && <a href={`data:application/xml;charset=utf-8,${encodeURIComponent(generatedXml)}`} download={`${genTitle}.bpmn`} className="text-xs bg-blue-600 px-3 py-1.5 rounded text-white shadow-md"><Download size={14} /></a>}
                      </div>

                      {/* CONTENT BEREICH */}
                      <div className="flex-1 bg-slate-950 relative overflow-hidden flex flex-col rounded-b-lg">
                        
                        {isReviewing && steckbriefDraft ? (
                          <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in duration-300">
                            <div className="flex-1 overflow-y-auto p-8 space-y-8">
                              <section className="space-y-4">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Inhaltliche Definition</label>
                                <textarea value={steckbriefDraft.definition} onChange={(e) => setSteckbriefDraft({...steckbriefDraft, definition: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-white h-28 focus:border-blue-500/50 outline-none transition-all resize-none shadow-inner" />
                              </section>
                              <section className="space-y-4">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Prozessbeschreibung (Zusammenfassung)</label>
                                <textarea value={steckbriefDraft.beschreibung} onChange={(e) => setSteckbriefDraft({...steckbriefDraft, beschreibung: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-white h-44 focus:border-blue-500/50 outline-none transition-all resize-none shadow-inner" />
                              </section>
                              <section className="space-y-4">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Identifizierte Akteure</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {steckbriefDraft.prozessteilnehmer?.map((tp, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-slate-900/50 border border-slate-800 rounded-lg">
                                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20"><User size={14} /></div>
                                      <div><div className="text-xs font-bold text-slate-200">{tp.name}</div><div className="text-[10px] text-slate-500">Code: {tp.rolle?.code || 'n/a'}</div></div>
                                    </div>
                                  ))}
                                </div>
                              </section>
                            </div>
                            <div className="p-6 bg-slate-900 border-t border-slate-800 flex gap-4 shrink-0">
                              <button className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]" onClick={() => { alert("Daten übernommen!"); }}><Save size={18} /> Bestätigen & XML erzeugen</button>
                              <button onClick={() => setIsReviewing(false)} className="px-8 py-3.5 border border-slate-700 text-slate-400 rounded-xl font-medium transition-all hover:bg-slate-800">Abbrechen</button>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full bg-white">
                            {generatedXml ? <div className="w-full h-full animate-in fade-in duration-700"><BpmnVisu xml={generatedXml} /></div> : <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-20 text-center"><FileJson size={64} className="mx-auto mb-4 opacity-20" /><p className="text-sm">Hier erscheint nach der Analyse das BPMN-Modell.</p></div>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'final_lists' && (
                <div className="max-w-6xl mx-auto space-y-6">
                  <h3 className="text-xl font-bold flex items-center gap-3"><Database className="text-blue-500" /> Archivierte Listen</h3>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-950 text-[10px] uppercase font-black text-slate-500 border-b border-slate-800 tracking-widest">
                        <tr><th className="px-8 py-5">Leistung</th><th className="px-8 py-5">Editor</th><th className="px-8 py-5 text-right">Aktionen</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {finalizedLists.map(item => (
                          <tr key={item.id} className="hover:bg-slate-800/40 transition">
                            <td className="px-8 py-5 font-bold">{item.titel}</td>
                            <td className="px-8 py-5 text-slate-400">{item.editor || 'System'}</td>
                            <td className="px-8 py-5 text-right flex justify-end gap-2"><button onClick={() => loadFinalizedList(item)} className="bg-blue-600 px-3 py-1 rounded text-xs">Editieren</button><button onClick={() => deleteFinalizedList(item.id)} className="text-slate-500 hover:text-red-400"><Trash2 size={16} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'archive' && (
                <div className="max-w-6xl mx-auto space-y-8">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
                    <h2 className="text-lg font-bold mb-6">Neues Trainings-Paket (RAG)</h2>
                    <div className="space-y-4">
                      <input type="text" value={packageTitle} onChange={(e) => setPackageTitle(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" placeholder="Name des Pakets" />
                      <div className="grid grid-cols-2 gap-8">
                        <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                          <span className="text-xs text-slate-500 block mb-2">1. Gesetzestexte</span>
                          <input type="file" multiple onChange={handlePdfSelect} className="text-xs" />
                          <div className="mt-2 text-[10px]">{uploadPdfs.map(p => p.customName).join(', ')}</div>
                        </div>
                        <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                          <span className="text-xs text-slate-500 block mb-2">2. Referenz-BPMN</span>
                          <input type="file" accept=".bpmn,.xml" onChange={e => setUploadBpmn(e.target.files[0])} className="text-xs" />
                        </div>
                      </div>
                      <button onClick={handleUpload} disabled={isUploading} className="w-full bg-blue-600 py-3 rounded-lg font-bold mt-4">
                        {isUploading ? "Lade hoch..." : "Paket in Datenbank speichern"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </>
        )}
      </div>
    </div>
  );
}

function NavItem({ icon, label, open, onClick, active }) {
  return (
    <div onClick={onClick} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${active ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
      {icon}{open && <span className="text-sm font-medium">{label}</span>}
    </div>
  );
}

function TabButton({ label, active, onClick, icon }) { 
  return (
    <button onClick={onClick} className={`pb-3 px-2 text-sm font-medium border-b-2 transition flex items-center gap-2 mt-4 ${active ? 'text-white border-blue-500' : 'text-slate-400 border-transparent hover:text-slate-200'}`}>
      {icon}<span>{label}</span>
    </button> 
  );
}
