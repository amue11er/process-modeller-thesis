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
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [currentView, setCurrentView] = useState('modeller'); 
  const [activeTab, setActiveTab] = useState('activities');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // --- STATE: MUSTERPROZESSE (PDF ENTFERNT) ---
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
      if (response.ok) {
        fetchMuster();
      } else {
        alert("Fehler beim Löschen des Musters.");
      }
    } catch (error) {
      console.error("Fehler beim Löschen:", error);
    }
  };

  useEffect(() => {
    if (isLoggedIn) fetchMuster();
  }, [isLoggedIn]);

  const handleUploadPattern = async () => {
    if (!patternName || !xProcessFile) {
      alert("Bitte Titel und XProzess-Datei auswählen.");
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
        throw new Error("Server-Fehler");
      }
    } catch (e) {
      alert("Fehler: " + e.message);
    } finally {
      setIsUploadingPattern(false);
    }
  };

  const [historyItems, setHistoryItems] = useState([]);
  const [actFiles, setActFiles] = useState([]);
  const [extractedActivities, setExtractedActivities] = useState([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [userNotes, setUserNotes] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [ragFile, setRagFile] = useState(null);
  const [ragResults, setRagResults] = useState([]);
  const [isClassifying, setIsClassifying] = useState(false);
  const [genTitle, setGenTitle] = useState('');
  const [genFiles, setGenFiles] = useState([]);
  const [genNotes, setGenNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedXml, setGeneratedXml] = useState(null);
  const [generationError, setGenerationError] = useState(null);
  const [generatedModels, setGeneratedModels] = useState([]);
  const [uploadPdfs, setUploadPdfs] = useState([]);
  const [uploadBpmn, setUploadBpmn] = useState(null);
  const [packageTitle, setPackageTitle] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [documentPairs, setDocumentPairs] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [allModels, setAllModels] = useState([]);
  const [previewItem, setPreviewItem] = useState(null);

  useEffect(() => {
    if (isLoggedIn) {
      fetchDocuments();
      const savedHistory = localStorage.getItem('dvz_process_history');
      if (savedHistory) setHistoryItems(JSON.parse(savedHistory));
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) localStorage.setItem('dvz_process_history', JSON.stringify(historyItems));
  }, [historyItems, isLoggedIn]);

  const addToHistory = (type, title, data, meta = {}) => {
    const newItem = { id: Date.now().toString(), date: new Date().toISOString(), type, title: title || "Unbenannt", data, meta };
    setHistoryItems(prev => [newItem, ...prev]);
  };

  const deleteHistoryItem = (id) => {
    if (window.confirm("Eintrag löschen?")) setHistoryItems(prev => prev.filter(item => item.id !== id));
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

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setTimeout(() => { setIsLoggedIn(true); setLoginLoading(false); }, 800);
  };

  const handleLogout = () => { setIsLoggedIn(false); setCurrentView('modeller'); setActiveTab('activities'); };

  const fetchDocuments = async () => {
    setIsLoadingData(true);
    try {
      const response = await fetch(`${API_BASE_URL}/archive`);
      if (response.ok) {
        const data = await response.json();
        setDocumentPairs(data.map(item => ({
          id: item.id,
          title: item.title,
          fileCount: (item.raw_law_text.match(/--- QUELLE:/g) || []).length || 1,
          createdAt: new Date(item.created_at).toLocaleString('de-DE'),
          raw_text: item.raw_law_text,
          xml_content: item.ground_truth_bpmn
        })));
      }
    } catch (e) { console.error(e); }
    setIsLoadingData(false);
  };

  const handleActFileSelect = (e) => { if (e.target.files) setActFiles(prev => [...prev, ...Array.from(e.target.files)]); };
  const removeActFile = (index) => setActFiles(prev => prev.filter((_, i) => i !== index));

  const handleExtractActivities = async () => {
    if (actFiles.length === 0 || !serviceName) return;
    setIsExtracting(true);
    try {
      let fullText = "";
      for (const file of actFiles) {
        const text = await extractContent(file);
        fullText += `\n--- QUELLE: ${file.name} ---\n${text}\n`;
      }
      const response = await fetch(`${API_BASE_URL}/extract-activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: fullText, serviceName, userNotes })
      });
      if (response.ok) {
        const data = await response.json();
        setExtractedActivities(data.activities);
        addToHistory('activity_list', serviceName, data.activities, { fileName: actFiles.map(f => f.name).join(', '), userNotes });
      }
    } catch (e) { alert(e.message); }
    setIsExtracting(false);
  };

  const handleDownloadJSON = () => {
    const blob = new Blob([JSON.stringify({ serviceName, activities: extractedActivities }, null, 2)], { type: "application/json" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${serviceName}_activities.json`;
    link.click();
  };

  const handleCopyToClipboard = () => {
    let mdText = `## Prozess: ${serviceName}\n| Nr. | Typ | Bezeichnung |\n|---|---|---|\n`;
    extractedActivities.forEach(item => { mdText += `| ${item.nr} | ${item.typ} | ${item.bezeichnung} |\n`; });
    navigator.clipboard.writeText(mdText).then(() => { setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); });
  };

  const handleClassifyRag = async () => {
    if (!ragFile) return;
    setIsClassifying(true);
    try {
      const text = await extractContent(ragFile);
      const response = await fetch(`${API_BASE_URL}/classify-rag`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text })
      });
      if (response.ok) {
        const data = await response.json();
        setRagResults(data.rag_results || data);
        addToHistory('rag_class', ragFile.name, data.rag_results || data, { fileName: ragFile.name });
      }
    } catch (e) { alert(e.message); }
    setIsClassifying(false);
  };

  const handleGenerate = async () => {
    if (!genTitle || genFiles.length === 0) return;
    setIsGenerating(true);
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
        const xml = cleanXmlResponse(data.bpmn_xml || data.text || data.output);
        setGeneratedXml(xml);
        setGeneratedModels([{ id: Date.now(), name: genTitle, createdAt: new Date().toLocaleString() }, ...generatedModels]);
      }
    } catch (e) { setGenerationError(e.message); }
    setIsGenerating(false);
  };

  const handleUpload = async () => {
    if (uploadPdfs.length === 0 || !uploadBpmn || !packageTitle) return;
    setIsUploading(true);
    try {
      let lawText = "";
      for (const pdf of uploadPdfs) { lawText += `\n--- QUELLE: ${pdf.customName} ---\n${await extractContent(pdf.file)}`; }
      const response = await fetch(`${API_BASE_URL}/ingest`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: packageTitle, raw_law_text: lawText, ground_truth_bpmn: await readFileAsText(uploadBpmn) })
      });
      if (response.ok) { setUploadPdfs([]); setUploadBpmn(null); setPackageTitle(''); fetchDocuments(); }
    } catch (e) { alert(e.message); }
    setIsUploading(false);
  };

  const handleDeletePair = async (id) => {
    if (window.confirm("Löschen?")) {
      const response = await fetch(`${API_BASE_URL}/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      if (response.ok) fetchDocuments();
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="flex h-screen bg-gray-950 items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-3xl font-black text-white">DVZ</span>
              <span className="text-blue-500 text-xl font-medium">×</span>
              <span className="text-xl font-bold text-slate-200">Arvid Müller</span>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white" placeholder="Benutzername" />
            <input type="password" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white" placeholder="Passwort" />
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-lg transition-all">Anmelden</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950 text-slate-200">
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">{previewItem.title}</h3>
              <button onClick={() => setPreviewItem(null)} className="p-2 hover:bg-slate-800 rounded-full transition"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-hidden bg-slate-950">
              {previewItem.type === 'xml' ? <BpmnVisu xml={previewItem.content} /> : <div className="p-6 overflow-y-auto h-full"><pre className="text-xs text-slate-300 whitespace-pre-wrap">{previewItem.content}</pre></div>}
            </div>
          </div>
        </div>
      )}

      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300`}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between h-[69px]">
          {sidebarOpen && <div className="text-xl font-black text-white tracking-tighter">DVZ <span className="text-blue-500">×</span> Arvid</div>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-500 p-1"><Menu size={18} /></button>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavItem icon={<FileText size={18} />} label="Modeller" open={sidebarOpen} onClick={() => setCurrentView('modeller')} active={currentView === 'modeller'} />
          <NavItem icon={<Database size={18} />} label="Historie" open={sidebarOpen} onClick={() => setCurrentView('history')} active={currentView === 'history'} />
        </nav>
        <button onClick={handleLogout} className="m-3 p-3 flex items-center gap-3 text-slate-400 hover:text-white hover:bg-red-500/10 rounded-lg transition-all"><LogOut size={18} />{sidebarOpen && "Abmelden"}</button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {currentView === 'history' ? (
          <div className="flex-1 p-8 overflow-y-auto">
            <h2 className="text-2xl font-semibold mb-6">Projekt-Historie</h2>
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400"><tr><th className="px-6 py-4">Typ</th><th className="px-6 py-4">Titel</th><th className="px-6 py-4 text-right">Aktionen</th></tr></thead>
                <tbody className="divide-y divide-slate-800">
                  {historyItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-800/50 transition"><td className="px-6 py-4 text-xs">{item.type}</td><td className="px-6 py-4 font-medium text-white">{item.title}</td><td className="px-6 py-4 text-right space-x-2"><button onClick={() => loadHistoryItem(item)} className="px-3 py-1 bg-blue-600 rounded text-xs">Öffnen</button><button onClick={() => deleteHistoryItem(item.id)} className="text-slate-500 hover:text-red-400"><Trash2 size={16} /></button></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-slate-900 border-b border-slate-800 px-8 py-6"><h2 className="text-2xl font-semibold">Prozessmodellierung</h2></div>
            <div className="px-8 flex gap-8 py-3 bg-slate-900/50 border-b border-slate-800 overflow-x-auto">
              <TabButton label="Tätigkeiten" active={activeTab === 'activities'} onClick={() => setActiveTab('activities')} icon={<List size={16} />} />
              <TabButton label="Klassifizierung" active={activeTab === 'rag'} onClick={() => setActiveTab('rag')} icon={<Tags size={16} />} />
              <TabButton label="Generierung" active={activeTab === 'generation'} onClick={() => setActiveTab('generation')} icon={<Play size={16} />} />
              <TabButton label="Musterprozesse" active={activeTab === 'patterns'} onClick={() => setActiveTab('patterns')} icon={<Database size={16} />} />
              <TabButton label="Ablage" active={activeTab === 'archive'} onClick={() => setActiveTab('archive')} icon={<FileText size={16} />} />
            </div>

            <main className="flex-1 overflow-y-auto p-8 bg-gray-950">
              {activeTab === 'activities' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-6">
                    <input type="text" value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="Prozessname" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3" />
                    <textarea value={userNotes} onChange={(e) => setUserNotes(e.target.value)} placeholder="Anmerkungen" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 h-32" />
                    <div className="border-2 border-dashed border-slate-700 p-4 rounded-lg text-center relative hover:bg-slate-800 transition">
                      <input type="file" multiple onChange={handleActFileSelect} className="absolute inset-0 opacity-0 cursor-pointer" />
                      <Plus className="mx-auto mb-2 text-slate-500" />
                      <span className="text-sm text-slate-500">Dateien hinzufügen ({actFiles.length})</span>
                    </div>
                    <button onClick={handleExtractActivities} disabled={isExtracting} className="w-full bg-blue-600 py-3 rounded-lg font-bold flex items-center justify-center gap-2">{isExtracting ? <Clock className="animate-spin" /> : <List />} Analysieren</button>
                  </div>
                  <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col min-h-[500px]">
                    <div className="p-4 bg-slate-900 flex justify-between items-center border-b border-slate-800"><h3 className="font-semibold">Ergebnis</h3>{extractedActivities.length > 0 && <div className="flex gap-2"><button onClick={handleCopyToClipboard} className="p-2 bg-slate-800 rounded hover:bg-slate-700"><Copy size={16}/></button><button onClick={handleDownloadJSON} className="p-2 bg-blue-600 rounded hover:bg-blue-500"><Download size={16}/></button></div>}</div>
                    <div className="p-4 overflow-auto flex-1 text-sm">
                      {extractedActivities.length > 0 ? (
                        <table className="w-full text-left"><thead className="text-slate-500 text-xs"><tr><th className="p-2">Nr.</th><th className="p-2">Bezeichnung</th></tr></thead><tbody>{extractedActivities.map((a,i)=>(<tr key={i} className="border-b border-slate-800 hover:bg-slate-900"><td className="p-2 font-mono text-blue-400">{a.nr}</td><td className="p-2">{a.bezeichnung}</td></tr>))}</tbody></table>
                      ) : <div className="h-full flex items-center justify-center opacity-20"><List size={48}/></div>}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'patterns' && (
                <div className="max-w-4xl mx-auto space-y-8">
                  <div className="bg-slate-900 p-8 rounded-xl border border-slate-800 shadow-xl">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Plus className="text-blue-500" /> Neuen Musterprozess registrieren</h2>
                    <div className="space-y-6">
                      <div><label className="text-xs text-slate-500 uppercase font-bold mb-2 block">Name des Musters</label><input type="text" value={patternName} onChange={(e) => setPatternName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white" placeholder="z.B. Standard-Verfahren XY" /></div>
                      <div><label className="text-xs text-slate-500 uppercase font-bold mb-2 block">XProzess XML-Datei</label><div className="relative border-2 border-dashed border-slate-700 p-6 rounded-lg text-center hover:bg-slate-950 transition"><input type="file" accept=".xml" onChange={(e) => setXProcessFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" /><FileCode className={`mx-auto mb-2 ${xProcessFile ? "text-blue-400" : "text-slate-600"}`} size={32} /><p className="text-sm text-slate-400">{xProcessFile ? xProcessFile.name : "XML Datei hier ablegen oder klicken"}</p></div></div>
                      <button onClick={handleUploadPattern} disabled={isUploadingPattern || !xProcessFile} className="w-full bg-blue-600 py-4 rounded-lg font-black uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-900/20 disabled:opacity-20">{isUploadingPattern ? <Clock className="animate-spin" /> : <Save />} Prozess-Muster Speichern</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {musterList.map(m => (
                      <div key={m.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between group hover:border-blue-500/50 transition-all">
                        <div className="flex items-center gap-4"><div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500"><FileCode size={20}/></div><div><h4 className="text-white font-medium truncate max-w-[200px]">{m.title}</h4><p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">XProzess-Modell</p></div></div>
                        <button onClick={() => deleteMuster(m.id)} className="p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'generation' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1 bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-4">
                    <input type="text" value={genTitle} onChange={(e) => setGenTitle(e.target.value)} placeholder="Titel" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm" />
                    <div className="bg-slate-950 border border-slate-700 rounded-lg p-4 text-center relative hover:bg-slate-800 transition"><input type="file" multiple onChange={handleGenFileSelect} className="absolute inset-0 opacity-0 cursor-pointer" /><Plus className="mx-auto mb-1 text-slate-500" size={20}/><span className="text-xs text-slate-500">Quelltexte ({genFiles.length})</span></div>
                    <textarea value={genNotes} onChange={(e) => setGenNotes(e.target.value)} placeholder="Kontext..." className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs h-24" />
                    <button onClick={handleGenerate} disabled={isGenerating} className="w-full bg-blue-600 py-3 rounded-lg font-bold flex items-center justify-center gap-2">{isGenerating ? <Clock className="animate-spin" /> : <Play fill="currentColor" size={16}/>} Generieren</button>
                  </div>
                  <div className="lg:col-span-2 bg-slate-900 rounded-xl border border-slate-800 h-[650px] flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 rounded-t-xl shrink-0"><h3 className="font-semibold flex items-center gap-2"><FileJson className="text-green-400" /> BPMN Modell</h3>{generatedXml && <a href={`data:application/xml;charset=utf-8,${encodeURIComponent(generatedXml)}`} download="modell.bpmn" className="text-xs bg-blue-600 px-3 py-1.5 rounded flex items-center gap-2"><Download size={14}/> Download</a>}</div>
                    <div className="flex-1 bg-white relative overflow-hidden">{generatedXml ? <BpmnVisu xml={generatedXml} /> : <div className="h-full flex items-center justify-center text-slate-300 opacity-10"><FileCode size={128}/></div>}</div>
                  </div>
                </div>
              )}
              
              {activeTab === 'archive' && (
                <div className="space-y-8">
                  <div className="bg-slate-900 p-6 rounded-xl border border-slate-800"><h3 className="text-lg font-bold mb-4">Neues Paket</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><input value={packageTitle} onChange={e=>setPackageTitle(e.target.value)} placeholder="Paket-Name" className="w-full bg-slate-950 border border-slate-700 p-3 rounded-lg md:col-span-2"/><div className="border-2 border-dashed border-slate-700 p-6 rounded-lg text-center relative"><input type="file" multiple onChange={handlePdfSelect} className="absolute inset-0 opacity-0 cursor-pointer"/><span className="text-sm text-slate-500">Texte ({uploadPdfs.length})</span></div><div className="border-2 border-dashed border-slate-700 p-6 rounded-lg text-center relative"><input type="file" onChange={e=>setUploadBpmn(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer"/><span className="text-sm text-slate-500">{uploadBpmn ? uploadBpmn.name : "Referenz-BPMN"}</span></div></div><button onClick={handleUpload} className="w-full bg-blue-600 py-3 mt-4 rounded-lg font-bold">Paket Speichern</button></div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm"><thead className="bg-slate-950 text-slate-500 uppercase text-[10px] font-bold"><tr><th className="px-6 py-4">Titel</th><th className="px-6 py-4">Datum</th><th className="px-6 py-4 text-right">Aktionen</th></tr></thead><tbody className="divide-y divide-slate-800">{filteredDocuments.map(d=>(<tr key={d.id} className="hover:bg-slate-800/50"><td className="px-6 py-4 text-white font-medium">{d.title}</td><td className="px-6 py-4 text-slate-500">{d.createdAt}</td><td className="px-6 py-4 text-right space-x-2"><button onClick={()=>setPreviewItem({title:d.title, content:d.raw_text, type:'text'})} className="p-2 text-slate-400 hover:text-blue-400"><FileText size={18}/></button><button onClick={()=>setPreviewItem({title:'BPMN', content:d.xml_content, type:'xml'})} className="p-2 text-slate-400 hover:text-green-400"><FileJson size={18}/></button><button onClick={()=>handleDeletePair(d.id)} className="p-2 text-slate-400 hover:text-red-400"><Trash2 size={18}/></button></td></tr>))}</tbody></table>
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
    <div onClick={onClick} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${active ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-lg shadow-blue-500/5' : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'}`}>
      {icon}{open && <span className="text-sm font-bold tracking-tight">{label}</span>}
    </div>
  );
}

function TabButton({ label, active, onClick, icon }) {
  return <button onClick={onClick} className={`pb-3 px-2 text-sm font-bold border-b-2 transition flex items-center gap-2 ${active ? 'text-white border-blue-500' : 'text-slate-500 border-transparent hover:text-slate-300 hover:border-slate-800'}`}>{icon}<span>{label}</span></button>
}
