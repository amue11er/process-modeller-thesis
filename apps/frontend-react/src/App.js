import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Upload, FileText, Settings, HelpCircle, Menu, X, Download, Trash2, CheckCircle, 
  Clock, Eye, Search, Edit2, FileJson, RefreshCw, Play, Maximize2, Plus, 
  MessageSquare, Save, AlertCircle, List, Copy, Check, LogOut, User, Lock, 
  Tags, FileCode, FileType, Database, Calendar 
} from 'lucide-react';

// --- BPMN Viewer ---
import BpmnViewer from 'bpmn-js/lib/NavigatedViewer';

// --- API URL ---
const API_BASE_URL = "https://209.38.205.46.nip.io/webhook";

// --- HILFSFUNKTIONEN ---

// Text/JSON/MD Extraktion
const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

// UNIVERSAL-EXTRAKTOR (PDF-Logik entfernt)
const extractContent = async (file) => {
  if (!file) return "";
  return await readFileAsText(file);
};

const cleanXmlResponse = (responseString) => {
  if (typeof responseString !== 'string') return '';
  return responseString.replace(/^```xml\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
};

// --- KOMPONENTE: DATEI ICON ---
const FileIcon = ({ fileName, size = 20, className = "" }) => {
  const name = fileName ? fileName.toLowerCase() : "";
  if (name.endsWith('.json')) return <FileJson size={size} className={className} />;
  if (name.endsWith('.md')) return <FileCode size={size} className={className} />;
  return <FileType size={size} className={className} />;
};

// --- KOMPONENTE: BPMN VIEWER ---
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

  // --- STATE: MUSTERPROZESSE ---
  const [isUploadingPattern, setIsUploadingPattern] = useState(false);
  const [patternName, setPatternName] = useState('');
  const [xProcessFile, setXProcessFile] = useState(null);
  const [musterList, setMusterList] = useState([]);
  const [isLoadingMuster, setIsLoadingMuster] = useState(false);

  const fetchMuster = async () => {
    setIsLoadingMuster(true);
    try {
      const response = await fetch(`${API_BASE_URL}/get_musterprozesse`);
      if (response.ok) {
        const data = await response.json();
        setMusterList(data);
      }
    } catch (error) {
      console.error("Fehler beim Laden der Muster:", error);
    } finally {
      setIsLoadingMuster(false);
    }
  };

  const deleteMuster = async (id) => {
    if (!window.confirm("Muster wirklich aus der Datenbank löschen?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/delete_musterprozesse?id=${id}`, {
        method: 'DELETE'
      });
      if (response.ok) fetchMuster();
    } catch (error) {
      console.error("Fehler beim Löschen:", error);
    }
  };

  useEffect(() => {
    if (isLoggedIn) fetchMuster();
  }, [isLoggedIn]);

  const handleUploadPattern = async () => {
    if (!patternName || !xProcessFile) {
      alert("Bitte mindestens einen Namen und die XProzess-XML auswählen.");
      return;
    }

    setIsUploadingPattern(true);
    try {
      const formData = new FormData();
      formData.append('title', patternName);
      formData.append('xprocess', xProcessFile);

      const response = await fetch(`${API_BASE_URL}/insert_musterprozesse`, {
        method: 'POST',
        body: formData 
      });

      if (response.ok) {
        alert("Musterprozess erfolgreich gespeichert!");
        setPatternName('');
        setXProcessFile(null);
        fetchMuster();
      } else {
        throw new Error("Fehler beim Speichern.");
      }
    } catch (e) {
      alert("Fehler: " + e.message);
    } finally {
      setIsUploadingPattern(false);
    }
  };

  // --- STATE: HISTORY / DATABASE ---
  const [historyItems, setHistoryItems] = useState([]);

  // --- STATE: TÄTIGKEITSLISTE ---
  const [actFiles, setActFiles] = useState([]);
  const [extractedActivities, setExtractedActivities] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [userNotes, setUserNotes] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // --- STATE: RAG KLASSIFIZIERUNG ---
  const [ragFile, setRagFile] = useState(null);
  const [ragResults, setRagResults] = useState([]);
  const [isClassifying, setIsClassifying] = useState(false);

  // --- STATE: GENERATION TAB ---
  const [genTitle, setGenTitle] = useState('');
  const [genFiles, setGenFiles] = useState([]);
  const [genNotes, setGenNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedXml, setGeneratedXml] = useState(null);
  const [generationError, setGenerationError] = useState(null);
  const [generatedModels, setGeneratedModels] = useState([]);

  // --- STATE: ARCHIV / UPLOAD TAB ---
  const [uploadPdfs, setUploadPdfs] = useState([]);
  const [uploadBpmn, setUploadBpmn] = useState(null);
  const [packageTitle, setPackageTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [documentPairs, setDocumentPairs] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // --- STATE: QUALITÄTSSICHERUNG TAB ---
  const [allModels, setAllModels] = useState([]);
  const [previewItem, setPreviewItem] = useState(null);

  // --- INITIAL LOAD & HISTORY ---
  useEffect(() => {
    if (isLoggedIn) {
      fetchDocuments();
      const savedHistory = localStorage.getItem('dvz_process_history');
      if (savedHistory) {
        try {
          setHistoryItems(JSON.parse(savedHistory));
        } catch (e) {
          console.error("Fehler beim Laden der Historie", e);
        }
      }
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      localStorage.setItem('dvz_process_history', JSON.stringify(historyItems));
    }
  }, [historyItems, isLoggedIn]);

  const addToHistory = (type, title, data, meta = {}) => {
    const newItem = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      type, 
      title: title || "Unbenannt",
      data,
      meta 
    };
    setHistoryItems(prev => [newItem, ...prev]);
  };

  const deleteHistoryItem = (id) => {
    if (window.confirm("Eintrag wirklich löschen?")) {
      setHistoryItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const loadHistoryItem = (item) => {
    if (item.type === 'activity_list') {
      setServiceName(item.title);
      setExtractedActivities(item.data);
      setUserNotes(item.meta.userNotes || '');
      setActiveTab('activities');
    } else if (item.type === 'rag_class') {
      setRagResults(item.data);
      setActiveTab('rag');
    }
    setCurrentView('modeller');
  };

  // --- LOGIN & LOGOUT ---
  const handleLogin = (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setTimeout(() => {
      setIsLoggedIn(true);
      setLoginLoading(false);
    }, 800);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentView('modeller');
    setActiveTab('activities');
  };

  const fetchDocuments = async () => {
    setIsLoadingData(true);
    try {
      const response = await fetch(`${API_BASE_URL}/archive`);
      if (response.ok) {
        const data = await response.json();
        const formattedData = data.map(item => ({
          id: item.id,
          title: item.title,
          fileCount: (item.raw_law_text.match(/--- QUELLE:/g) || []).length || 1,
          createdAt: new Date(item.created_at).toLocaleString('de-DE'),
          raw_text: item.raw_law_text,
          xml_content: item.ground_truth_bpmn
        }));
        setDocumentPairs(formattedData);
      }
    } catch (error) {
      console.error("Fehler:", error);
    }
    setIsLoadingData(false);
  };

  const handleActFileSelect = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setActFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeActFile = (index) => {
    setActFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleExtractActivities = async () => {
    if (actFiles.length === 0 || !serviceName) return;
    setIsExtracting(true);
    setExtractedActivities([]);
    try {
      let fullText = "";
      for (const file of actFiles) {
        const text = await extractContent(file);
        fullText += `\n--- QUELLE: ${file.name} ---\n${text}\n`;
      }
      const response = await fetch(`${API_BASE_URL}/extract-activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: fullText, serviceName: serviceName, userNotes: userNotes })
      });
      if (response.ok) {
        const data = await response.json();
        setExtractedActivities(data.activities);
        addToHistory('activity_list', serviceName, data.activities, { fileName: actFiles.map(f => f.name).join(', '), userNotes });
      }
    } catch (e) { alert("Fehler: " + e.message); }
    setIsExtracting(false);
  };

  const handleDownloadJSON = () => {
    if (extractedActivities.length === 0) return;
    const jsonString = JSON.stringify({ serviceName, userNotes, activities: extractedActivities }, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = `${serviceName.replace(/\s+/g, '_')}_activities.json`;
    link.click();
  };

  const handleCopyToClipboard = () => {
    if (extractedActivities.length === 0) return;
    let mdText = `## Prozess: ${serviceName}\n| Nr. | Typ | Bezeichnung |\n|---|---|---|\n`;
    extractedActivities.forEach(item => { mdText += `| ${item.nr} | ${item.typ} | ${item.bezeichnung} |\n`; });
    navigator.clipboard.writeText(mdText).then(() => { setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); });
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
    } catch (e) { alert("Fehler: " + e.message); }
    setIsClassifying(false);
  };

  const handleGenFileSelect = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setGenFiles(prev => [...prev, ...newFiles]);
      if (!genTitle && newFiles.length > 0) {
        setGenTitle(newFiles[0].name.replace(/\.[^/.]+$/, "") + " (Prozess)");
      }
    }
  };

  const removeGenFile = (i) => setGenFiles(prev => prev.filter((_, index) => index !== i));

  const handleGenerate = async () => {
    if (!genTitle || genFiles.length === 0) return;
    setIsGenerating(true); setGeneratedXml(null);
    try {
      let fullQueryText = "";
      for (const file of genFiles) {
        const text = await extractContent(file);
        fullQueryText += `\n--- QUELLE: ${file.name} ---\n${text}\n`;
      }
      const response = await fetch(`${API_BASE_URL}/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: genTitle, query: fullQueryText })
      });
      if (response.ok) {
        const data = await response.json();
        setGeneratedXml(cleanXmlResponse(data.bpmn_xml || data.text || data.output));
      }
    } catch (e) { setGenerationError(e.message); }
    setIsGenerating(false);
  };

  const handlePdfSelect = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file: file,
        customName: file.name
      }));
      setUploadPdfs(prev => [...prev, ...newFiles]);
    }
  };
  const updatePdfName = (id, newName) => setUploadPdfs(prev => prev.map(item => item.id === id ? { ...item, customName: newName } : item));
  const removePdf = (id) => setUploadPdfs(prev => prev.filter(item => item.id !== id));

  const handleUpload = async () => {
    if (uploadPdfs.length === 0 || !uploadBpmn || !packageTitle) return;
    setIsUploading(true);
    try {
      let combinedLawText = "";
      for (const pdfItem of uploadPdfs) {
        const text = await extractContent(pdfItem.file);
        combinedLawText += `\n--- QUELLE: ${pdfItem.customName} ---\n${text}`;
      }
      const bpmnXml = await readFileAsText(uploadBpmn);
      const response = await fetch(`${API_BASE_URL}/ingest`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: packageTitle, raw_law_text: combinedLawText, ground_truth_bpmn: bpmnXml })
      });
      if (response.ok) { alert("Gespeichert!"); setUploadPdfs([]); setUploadBpmn(null); fetchDocuments(); }
    } catch (e) { alert("Fehler: " + e.message); }
    setIsUploading(false);
  };

  const handleDeletePair = async (pairId) => {
    if (!window.confirm("Wirklich löschen?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/delete`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pairId })
      });
      if (response.ok) fetchDocuments();
    } catch (e) { alert(e.message); }
  };

  const filteredDocuments = useMemo(() => documentPairs.filter(doc => doc.title.toLowerCase().includes(searchTerm.toLowerCase())), [documentPairs, searchTerm]);
  const handleRateModel = (modelId, rating, feedback) => setAllModels(allModels.map(m => m.id === modelId ? { ...m, rating, feedback } : m));
  const ratedModels = allModels.filter(m => m.rating !== null);
  const unratedModels = allModels.filter(m => m.rating === null);

  // --- LOGIN SCREEN RENDER ---
  if (!isLoggedIn) {
    return (
      <div className="flex h-screen bg-gray-950 font-sans text-slate-200 items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-3xl font-black text-white">DVZ × Arvid</span>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3" placeholder="Benutzername" />
            <input type="password" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3" placeholder="Passwort" />
            <button type="submit" disabled={loginLoading} className="w-full bg-blue-600 py-3 rounded-lg font-bold transition-all">Anmelden</button>
          </form>
        </div>
      </div>
    );
  }

  // --- MAIN APP RENDER ---
  return (
    <div className="flex h-screen bg-gray-950 font-sans text-slate-200">

      {/* PREVIEW MODAL */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-white">{previewItem.title}</h3>
              <button onClick={() => setPreviewItem(null)} className="p-2 hover:bg-slate-800 rounded-full"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-hidden bg-slate-950">
              {previewItem.type === 'xml' ? (
                <BpmnVisu xml={previewItem.content} />
              ) : (
                <div className="p-6 overflow-y-auto h-full">
                  <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap">{previewItem.content}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300`}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between h-[69px]">
          {sidebarOpen && <span className="text-xl font-black text-white">DVZ × Arvid</span>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-500 hover:text-slate-300 p-1"><Menu size={18} /></button>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavItem icon={<FileText size={18} />} label="Dokumentation" open={sidebarOpen} onClick={() => setCurrentView('modeller')} active={currentView === 'modeller'} />
          <NavItem icon={<Database size={18} />} label="Historie" open={sidebarOpen} onClick={() => setCurrentView('history')} active={currentView === 'history'} />
        </nav>
        <div className="p-3 border-t border-slate-800">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white w-full"><LogOut size={18} /> {sidebarOpen && "Abmelden"}</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">

        {currentView === 'history' && (
          <div className="flex-1 flex flex-col p-8 overflow-y-auto">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3"><Database className="text-blue-500" /> Historie</h2>
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-xs">
                  <tr><th className="px-6 py-4">Typ</th><th className="px-6 py-4">Titel</th><th className="px-6 py-4 text-right">Aktionen</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {historyItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-800/50">
                      <td className="px-6 py-4 text-xs font-bold text-blue-400 uppercase">{item.type}</td>
                      <td className="px-6 py-4 text-white font-medium">{item.title}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => deleteHistoryItem(item.id)} className="text-slate-500 hover:text-red-400"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {currentView === 'modeller' && (
          <>
            <div className="bg-slate-900 border-b border-slate-800 px-8 py-6"><h2 className="text-2xl font-semibold">Prozessmodellierung</h2></div>
            <div className="border-b border-slate-800 bg-slate-900/50 flex px-8 gap-8 py-3">
              <TabButton label="Tätigkeiten" active={activeTab === 'activities'} onClick={() => setActiveTab('activities')} icon={<List size={16} />} />
              <TabButton label="Klassifizierung" active={activeTab === 'rag'} onClick={() => setActiveTab('rag')} icon={<Tags size={16} />} />
              <TabButton label="Generierung" active={activeTab === 'generation'} onClick={() => setActiveTab('generation')} icon={<Play size={16} />} />
              <TabButton label="Musterprozesse" active={activeTab === 'patterns'} onClick={() => setActiveTab('patterns')} icon={<Database size={16} />} />
              <TabButton label="Ablage" active={activeTab === 'archive'} onClick={() => setActiveTab('archive')} icon={<FileText size={16} />} />
            </div>

            <main className="flex-1 overflow-y-auto p-8 bg-gray-950">
              {activeTab === 'activities' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full min-h-[600px]">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
                    <input type="text" value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="Prozessname" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" />
                    <textarea value={userNotes} onChange={(e) => setUserNotes(e.target.value)} placeholder="Zusätzliche Notizen" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 h-32 text-white" />
                    <div className="border-2 border-dashed border-slate-700 p-4 rounded-lg relative hover:bg-slate-800 cursor-pointer">
                      <input type="file" multiple onChange={handleActFileSelect} className="absolute inset-0 opacity-0 cursor-pointer" />
                      <div className="text-center text-slate-500 text-sm">Dokumente hinzufügen ({actFiles.length})</div>
                    </div>
                    <button onClick={handleExtractActivities} disabled={isExtracting || !serviceName} className="w-full bg-blue-600 py-3 rounded-lg font-bold">{isExtracting ? 'Wird analysiert...' : 'Analysieren'}</button>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 overflow-auto">
                    {extractedActivities.length > 0 ? (
                       <pre className="text-xs text-slate-400">{JSON.stringify(extractedActivities, null, 2)}</pre>
                    ) : <div className="text-center text-slate-700 mt-20">Noch keine Daten extrahiert.</div>}
                  </div>
                </div>
              )}

              {activeTab === 'patterns' && (
                <div className="max-w-4xl mx-auto space-y-6">
                  <div className="bg-slate-900 p-6 border border-slate-800 rounded-xl space-y-4 shadow-xl">
                    <h3 className="font-bold flex items-center gap-2"><Database size={20} className="text-blue-500" /> Muster hochladen</h3>
                    <input type="text" value={patternName} onChange={(e) => setPatternName(e.target.value)} placeholder="Name des Musters" className="w-full bg-slate-950 border border-slate-700 p-3 rounded text-white" />
                    <div className="border border-dashed border-slate-700 p-6 rounded text-center relative hover:bg-slate-800 cursor-pointer">
                       <input type="file" accept=".xml" onChange={(e) => setXProcessFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                       <span className="text-slate-500 text-sm">{xProcessFile ? xProcessFile.name : "XProzess-XML auswählen"}</span>
                    </div>
                    <button onClick={handleUploadPattern} className="w-full bg-blue-600 py-3 rounded font-bold shadow-lg">Muster in DB speichern</button>
                  </div>
                  <div className="space-y-2">
                    {musterList.map(m => (
                      <div key={m.id} className="bg-slate-900 p-4 border border-slate-800 rounded flex justify-between items-center group">
                        <span className="text-white font-medium">{m.title}</span>
                        <button onClick={() => deleteMuster(m.id)} className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'archive' && (
                <div className="space-y-6">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6"><h3 className="font-bold mb-4">Neues Paket indizieren</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <input value={packageTitle} onChange={e=>setPackageTitle(e.target.value)} placeholder="Paket Titel" className="w-full bg-slate-950 p-3 rounded border border-slate-700 md:col-span-2" />
                       <div className="border border-dashed border-slate-700 p-4 rounded text-center relative cursor-pointer"><input type="file" multiple onChange={handlePdfSelect} className="absolute inset-0 opacity-0 cursor-pointer" /><span className="text-xs text-slate-500">Quellen ({uploadPdfs.length})</span></div>
                       <div className="border border-dashed border-slate-700 p-4 rounded text-center relative cursor-pointer"><input type="file" onChange={e=>setUploadBpmn(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" /><span className="text-xs text-slate-500">{uploadBpmn ? uploadBpmn.name : "Referenz-Modell"}</span></div>
                    </div>
                    <button onClick={handleUpload} className="w-full bg-blue-600 py-3 mt-4 rounded font-bold">In Datenbank speichern</button>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-sm text-left"><thead className="bg-slate-950 text-slate-500 uppercase text-xs"><tr><th className="px-6 py-4">Paket</th><th className="px-6 py-4">Datum</th><th className="px-6 py-4 text-right">Aktionen</th></tr></thead>
                    <tbody className="divide-y divide-slate-800">
                      {filteredDocuments.map(doc => (
                        <tr key={doc.id} className="hover:bg-slate-800/40">
                          <td className="px-6 py-4 font-medium text-white">{doc.title}</td>
                          <td className="px-6 py-4 text-slate-500 text-xs">{doc.createdAt}</td>
                          <td className="px-6 py-4 text-right space-x-2">
                             <button onClick={() => setPreviewItem({title: doc.title, content: doc.raw_text, type: 'text'})} className="p-2 text-slate-500 hover:text-blue-400"><FileText size={18}/></button>
                             <button onClick={() => setPreviewItem({title: 'BPMN', content: doc.xml_content, type: 'xml'})} className="p-2 text-slate-500 hover:text-green-400"><FileJson size={18}/></button>
                             <button onClick={() => handleDeletePair(doc.id)} className="p-2 text-slate-500 hover:text-red-400"><Trash2 size={18}/></button>
                          </td>
                        </tr>
                      ))}
                    </tbody></table>
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
      {icon} {open && <span className="text-sm font-medium">{label}</span>}
    </div>
  );
}

function TabButton({ label, active, onClick, icon }) { return <button onClick={onClick} className={`pb-3 px-2 text-sm font-medium border-b-2 transition flex items-center gap-2 ${active ? 'text-white border-blue-500' : 'text-slate-400 border-transparent hover:text-slate-200'}`}>{icon}<span>{label}</span></button> }
