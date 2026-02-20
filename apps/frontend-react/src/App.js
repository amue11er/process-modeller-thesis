import React, { useState, useEffect, useMemo, useRef } from 'react';
// NEU: 'Database' und 'Calendar' Icons hinzugefügt
import { Upload, FileText, Settings, HelpCircle, Menu, X, Download, Trash2, CheckCircle, Clock, Eye, Search, Edit2, FileJson, RefreshCw, Play, Maximize2, Plus, MessageSquare, Save, AlertCircle, List, Copy, Check, LogOut, User, Lock, Tags, FileCode, FileType, Database, Calendar } from 'lucide-react';

// --- BPMN Viewer ---
import BpmnViewer from 'bpmn-js/lib/NavigatedViewer';

// --- PDF Worker Setup (Version 3.11) ---
import { getDocument, GlobalWorkerOptions, version } from 'pdfjs-dist';
GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`;

// --- API URL ---
const API_BASE_URL = "https://209.38.205.46.nip.io/webhook";

// --- HILFSFUNKTIONEN ---

// 1. PDF Extraktion (intern)
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

// 2. Text/JSON/MD Extraktion (intern)
const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

// 3. UNIVERSAL-EXTRAKTOR
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

// --- KOMPONENTE: DATEI ICON ---
const FileIcon = ({ fileName, size = 20, className = "" }) => {
  const name = fileName ? fileName.toLowerCase() : "";
  if (name.endsWith('.pdf')) return <FileText size={size} className={className} />;
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
  const [selectedPatternId, setSelectedPatternId] = useState('');

  const fetchMuster = async () => {
  setIsLoadingMuster(true);
  try {
    const response = await fetch(`${API_BASE_URL}/get_musterprozesse`);
    if (response.ok) {
      const data = await response.json();
      // WICHTIG: n8n sendet oft ein Array. Falls es ein Objekt ist, 
      // müssen wir sicherstellen, dass React ein Array erhält.
      setMusterList(Array.isArray(data) ? data : (data.data || []));
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
    const response = await fetch(`${API_BASE_URL}/delete_musterprozess?id=${id}`, {
      method: 'DELETE'
    });

    if (response.ok) {
      // WICHTIG: Wir entfernen das gelöschte Element sofort aus der Anzeige
      setMusterList(prevList => prevList.filter(item => item.id !== id));
      console.log("Eintrag lokal entfernt");
    } else {
      alert("Fehler beim Löschen des Musters auf dem Server.");
    }
  } catch (error) {
    console.error("Netzwerkfehler beim Löschen:", error);
  }
};

  // Neue States für das Umbenennen
const [editingId, setEditingId] = useState(null);
const [newName, setNewName] = useState('');

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
  } catch (e) {
    console.error("Fehler beim Umbenennen:", e);
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
        // Zuerst die Felder leeren für sofortiges visuelles Feedback
        setPatternName('');
        setXProcessFile(null);

        // WICHTIG: Die Liste neu vom Server abrufen und auf die Antwort warten
        await fetchMuster(); 
        
        console.log("Liste nach Upload erfolgreich aktualisiert");
      } else {
        const errorText = await response.text();
        throw new Error(`Server-Fehler: ${response.status} - ${errorText}`);
      }
    } catch (e) {
      console.error("Upload-Fehler:", e);
      alert("Fehler beim Speichern: " + e.message);
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
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);

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

  // 1. Inhalts-Update für Felder (Textarea / Select)
const updateActivityField = (index, field, value) => {
  const updated = [...extractedActivities];
  updated[index][field] = value;
  setExtractedActivities(updated);
};

// 2. Zentrale Hilfsfunktion: Korrigiert die Nr. und entfernt 'validated'
// Dies stellt sicher, dass die JSON-Struktur immer exakt der Anzeige entspricht
const resequence = (list) => list.map((item, i) => {
  const { validated, ...rest } = item; // Entfernt das Feld 'validated'
  return { ...rest, nr: i + 1 };       // Setzt die Nr. strikt nach Index
});

// 3. Zeile löschen und Liste neu nummerieren
const deleteActivity = (index) => {
  setExtractedActivities(prev => resequence(prev.filter((_, i) => i !== index)));
};

// 4. Neue Zeile hinzufügen und Liste neu nummerieren
const addActivity = () => {
  setExtractedActivities(prev => resequence([
    ...prev, 
    { typ: 'Aktivitätengruppe', bezeichnung: '', handlungsgrundlage: '' }
  ]));
};

// 5. Zeile verschieben und Liste neu nummerieren
const moveActivity = (index, direction) => {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= extractedActivities.length) return;
  const updated = [...extractedActivities];
  [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
  setExtractedActivities(resequence(updated));
};

  const handleFinalizeActivities = async () => {
  if (extractedActivities.length === 0) return;
  setIsFinalizing(true);
  try {
    const response = await fetch(`${API_BASE_URL}/finalize-activities`, { // Neuer n8n-Endpunkt
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceName,
        userNotes,
        finalActivities: extractedActivities,
        finalizedAt: new Date().toISOString(),
        editor: "Arvid Müller"
      })
    });
    if (response.ok) {
      alert("Tätigkeitsliste wurde erfolgreich finalisiert und abgelegt!");
      // Optional: In Historie speichern
      addToHistory('activity_list', serviceName + " (Final)", extractedActivities, { userNotes, status: 'finalized' });
    } else {
      throw new Error("Fehler beim Senden an den Webhook");
    }
  } catch (e) {
    alert("Fehler: " + e.message);
  } finally {
    setIsFinalizing(false);
  }
};

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
    if (window.confirm("Eintrag wirklich aus der Datenbank löschen?")) {
      setHistoryItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const loadHistoryItem = (item) => {
    if (item.type === 'activity_list') {
      setServiceName(item.title);
      setExtractedActivities(item.data);
      setUserNotes(item.meta.userNotes || '');
      if (item.meta.fileName) {
        setActFiles([{ name: item.meta.fileName + " (aus Verlauf)" }]);
      }
      setActiveTab('activities');
    } else if (item.type === 'rag_class') {
      setRagResults(item.data);
      if (item.meta.fileName) {
        setRagFile({ name: item.meta.fileName + " (aus Verlauf)" });
      }
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
          bpmnName: 'Prozessmodell.bpmn',
          createdAt: new Date(item.created_at).toLocaleString('de-DE'),
          status: 'indexed',
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
    if (actFiles.length === 0) { alert("Bitte mindestens eine Datei auswählen."); return; }
    if (!serviceName) { alert("Bitte geben Sie den Namen der Leistung an."); return; }
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
        body: JSON.stringify({ query: fullText, serviceName: serviceName, userNotes: userNotes, patternId: selectedPatternId })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.activities && Array.isArray(data.activities)) {
          setExtractedActivities(data.activities);
          const fileNames = actFiles.map(f => f.name).join(', ');
          addToHistory('activity_list', serviceName, data.activities, { fileName: fileNames, userNotes });
        }
        else alert("Die KI hat keine gültige Liste zurückgegeben.");
      } else throw new Error("Server Fehler: " + response.status);
    } catch (e) { alert("Fehler: " + e.message); }
    setIsExtracting(false);
  };

  const handleDownloadJSON = () => {
    if (extractedActivities.length === 0) return;
    const exportData = { serviceName, userNotes, activities: extractedActivities };
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href; link.download = `${serviceName.replace(/\s+/g, '_')}_activities.json`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleCopyToClipboard = () => {
    if (extractedActivities.length === 0) return;
    let mdText = `## Prozess: ${serviceName}\n`;
    if (userNotes) mdText += `> Notiz: ${userNotes}\n\n`;
    mdText += `| Nr. | Typ | Bezeichnung | Grundlage |\n|---|---|---|---|\n`;
    extractedActivities.forEach(item => { mdText += `| ${item.nr} | ${item.typ} | ${item.bezeichnung} | ${item.handlungsgrundlage} |\n`; });
    navigator.clipboard.writeText(mdText).then(() => { setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); });
  };

  const handleClassifyRag = async () => {
    if (!ragFile) { alert("Bitte Datei auswählen."); return; }
    setIsClassifying(true); setRagResults([]);
    try {
      const text = await extractContent(ragFile);
      const response = await fetch(`${API_BASE_URL}/classify-rag`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.rag_results && Array.isArray(data.rag_results)) {
          setRagResults(data.rag_results);
          addToHistory('rag_class', ragFile.name, data.rag_results, { fileName: ragFile.name });
        }
        else if (Array.isArray(data)) {
          setRagResults(data);
          addToHistory('rag_class', ragFile.name, data, { fileName: ragFile.name });
        }
      } else throw new Error("Server Fehler: " + response.status);
    } catch (e) { alert("Fehler: " + e.message); }
    setIsClassifying(false);
  };

  const handleGenFileSelect = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setGenFiles(prev => [...prev, ...newFiles]);
      if (!genTitle && newFiles.length > 0) {
        const name = newFiles[0].name;
        const cleanName = name.replace(/\.(pdf|json|md|txt)$/i, '');
        setGenTitle(cleanName + " (Prozess)");
      }
    }
  };

  const removeGenFile = (i) => setGenFiles(prev => prev.filter((_, index) => index !== i));

  const handleGenerate = async () => {
    if (!genTitle || genFiles.length === 0) { alert("Bitte Titel und mindestens eine Datei angeben."); return; }
    setIsGenerating(true); setGeneratedXml(null); setGenerationError(null);
    try {
      let fullQueryText = "";
      if (genNotes) fullQueryText += `ZUSÄTZLICHE HINWEISE: ${genNotes}\n\n`;
      fullQueryText += "BASIS-DOKUMENTE:\n";
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
        const rawXml = data.bpmn_xml || data.text || data.output;
        if (rawXml) {
          setGeneratedXml(cleanXmlResponse(rawXml));
          const newModel = { id: Date.now(), name: genTitle, source: `${genFiles.length} Quellen`, createdAt: new Date().toLocaleString('de-DE'), status: 'completed', rating: null, feedback: null };
          setGeneratedModels([newModel, ...generatedModels]); setAllModels([newModel, ...allModels]);
        } else throw new Error("Kein XML in Antwort.");
      } else throw new Error("Server Fehler: " + response.status);
    } catch (e) { setGenerationError(e.message); }
    setIsGenerating(false);
  };

  const handlePdfSelect = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file: file,
        customName: file.name.replace(/\.(pdf|json|md|txt)$/i, '')
      }));
      setUploadPdfs(prev => [...prev, ...newFiles]);
      if (!packageTitle && newFiles.length > 0) setPackageTitle(newFiles[0].customName + " (Prozess)");
    }
  };
  const updatePdfName = (id, newName) => setUploadPdfs(prev => prev.map(item => item.id === id ? { ...item, customName: newName } : item));
  const removePdf = (id) => setUploadPdfs(prev => prev.filter(item => item.id !== id));

  const handleUpload = async () => {
    if (uploadPdfs.length === 0 || !uploadBpmn || !packageTitle) { alert("Bitte alles ausfüllen."); return; }
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
      if (response.ok) { alert("Gespeichert!"); setUploadPdfs([]); setUploadBpmn(null); setPackageTitle(''); fetchDocuments(); }
      else throw new Error("Fehler: " + response.status);
    } catch (e) { alert("Fehler: " + e.message); }
    setIsUploading(false);
  };

  const handleDeletePair = async (pairId) => {
  if (!window.confirm("Wirklich löschen?")) return;
  try {
    const response = await fetch(`${API_BASE_URL}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: pairId })
    });

    if (response.ok) {
      // WICHTIG: Das Archiv-Element sofort aus der Tabelle löschen
      setDocumentPairs(prevPairs => prevPairs.filter(p => p.id !== pairId));
    } else {
      alert("Fehler beim Löschen des Archiv-Eintrags.");
    }
  } catch (error) {
    console.error("Fehler:", error);
  }
};

  const filteredDocuments = useMemo(() => documentPairs.filter(doc => doc.title.toLowerCase().includes(searchTerm.toLowerCase())), [documentPairs, searchTerm]);
  const handleRateModel = (modelId, rating, feedback) => setAllModels(allModels.map(m => m.id === modelId ? { ...m, rating, feedback } : m));
  const ratedModels = allModels.filter(m => m.rating !== null);
  const unratedModels = allModels.filter(m => m.rating === null);

  // --- LOGIN SCREEN RENDER ---
  if (!isLoggedIn) {
    return (
      <div className="flex h-screen bg-gray-950 font-sans text-slate-200 items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-8 animate-in fade-in zoom-in duration-300">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-3xl font-black text-white tracking-tighter">DVZ</span>
              <span className="text-blue-500 text-xl font-medium">×</span>
              <span className="text-xl font-bold text-slate-200">Arvid Müller</span>
            </div>
            <p className="text-slate-400 text-sm">Automatisierte Prozessmodellierung & Analyse</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div><label className="block text-xs font-medium text-slate-500 uppercase mb-2 ml-1">Benutzername</label><div className="relative"><User size={18} className="absolute left-3 top-3 text-slate-500" /><input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none transition-colors" placeholder="name@dvz-mv.de" /></div></div>
            <div><label className="block text-xs font-medium text-slate-500 uppercase mb-2 ml-1">Passwort</label><div className="relative"><Lock size={18} className="absolute left-3 top-3 text-slate-500" /><input type="password" className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-600 focus:border-blue-500 focus:outline-none transition-colors" placeholder="••••••••" /></div></div>
            <button type="submit" disabled={loginLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-lg transition-all flex items-center justify-center gap-2 mt-6 shadow-lg shadow-blue-900/20">{loginLoading ? <Clock size={18} className="animate-spin" /> : "Anmelden"}</button>
          </form>
          <div className="mt-8 text-center"><p className="text-xs text-slate-600">Geschützter Bereich. Nur für autorisiertes Personal.</p></div>
        </div>
      </div>
    );
  }

  // --- MAIN APP RENDER ---
  return (
    <div className="flex h-screen bg-gray-950 font-sans text-slate-200 selection:bg-blue-500/30 animate-in fade-in duration-500">

      {/* PREVIEW MODAL */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                {previewItem.type === 'xml' ? <FileJson size={20} className="text-green-400" /> : previewItem.type === 'pdf' ? <FileText size={20} className="text-red-400" /> : <FileText size={20} className="text-blue-400" />}
                {previewItem.title}
              </h3>
              <button onClick={() => setPreviewItem(null)} className="p-2 hover:bg-slate-800 rounded-full transition"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-hidden bg-slate-950 p-0">
              {previewItem.type === 'xml' ? (
                <div className="h-full w-full bg-white overflow-hidden">
                  <BpmnVisu xml={previewItem.content} />
                </div>
              ) : previewItem.type === 'pdf' ? (
                <iframe
                  // .replace(/\s/g, '') entfernt ALLE Leerzeichen und Zeilenumbrüche
                  src={`data:application/pdf;base64,${previewItem.content.replace(/\s/g, '')}`}
                  className="w-full h-full min-h-[600px] border-none"
                  title="PDF Vorschau"
                />
              ) : (
                <div className="p-6 overflow-y-auto h-full">
                  <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">{previewItem.content}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300`}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between h-[69px]">
          {sidebarOpen && (
            <div className="flex items-baseline gap-1.5 tracking-tight select-none">
              <span className="text-xl font-black text-white">DVZ</span>
              <span className="text-blue-500 font-medium">×</span>
              <span className="text-sm font-bold text-slate-200">Arvid Müller</span>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-500 hover:text-slate-300 p-1"><Menu size={18} /></button>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavItem icon={<FileText size={18} />} label="Dokumentation" open={sidebarOpen} onClick={() => setCurrentView('modeller')} active={currentView === 'modeller'} />
          <NavItem icon={<Settings size={18} />} label="Konfiguration" open={sidebarOpen} />
          <div className="pt-2">
            <div className={`text-xs uppercase text-slate-500 font-semibold px-3 mb-1 ${!sidebarOpen && 'hidden'}`}>Datenbank</div>
            <NavItem icon={<Database size={18} />} label="Verlauf / Historie" open={sidebarOpen} onClick={() => setCurrentView('history')} active={currentView === 'history'} />
          </div>
        </nav>
        <div className="p-3 border-t border-slate-800">
          <button onClick={handleLogout} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-red-500/10 hover:border-red-500/20 border border-transparent w-full transition-all group ${!sidebarOpen ? 'justify-center' : ''}`} title="Abmelden">
            <LogOut size={18} className="group-hover:text-red-400" />
            {sidebarOpen && <span className="text-sm font-medium">Abmelden</span>}
          </button>
        </div>
        <div className="p-4 border-t border-slate-800">
          <div className={`${sidebarOpen ? 'text-xs' : ''} flex items-center gap-2 text-slate-400`}><div className="w-2 h-2 bg-blue-500 rounded-full"></div>{sidebarOpen && "System Online"}</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">

        {currentView === 'history' && (
          <div className="flex-1 flex flex-col bg-gray-950 overflow-hidden animate-in fade-in duration-300">
            <div className="bg-slate-900 border-b border-slate-800 px-8 py-6">
              <h2 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-3"><Database className="text-blue-500" /> Projekt-Datenbank</h2>
              <p className="text-slate-400 text-sm mt-1">Lokal gespeicherte Ergebnisse aus früheren Sitzungen.</p>
            </div>
            <div className="flex-1 p-8 overflow-y-auto">
              <div className="max-w-6xl mx-auto">
                {historyItems.length === 0 ? (
                  <div className="text-center text-slate-600 py-20 border border-dashed border-slate-800 rounded-xl">
                    <Database size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Noch keine Einträge vorhanden.</p>
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase text-xs">
                        <tr>
                          <th className="px-6 py-4">Typ</th>
                          <th className="px-6 py-4">Bezeichnung / Datei</th>
                          <th className="px-6 py-4">Erstellt am</th>
                          <th className="px-6 py-4 text-right">Aktionen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {historyItems.map(item => (
                          <tr key={item.id} className="hover:bg-slate-800/50 transition">
                            <td className="px-6 py-4">
                              {item.type === 'activity_list' ?
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-medium"><List size={12} /> Tätigkeitsliste</span> :
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-medium"><Tags size={12} /> RAG-Klasse</span>
                              }
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-white font-medium">{item.title}</div>
                              {item.meta.fileName && <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><FileText size={10} /> {item.meta.fileName}</div>}
                            </td>
                            <td className="px-6 py-4 text-slate-400 flex items-center gap-2">
                              <Calendar size={14} /> {new Date(item.date).toLocaleString('de-DE')}
                            </td>
                            <td className="px-6 py-4 text-right space-x-2">
                              <button onClick={() => loadHistoryItem(item)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition shadow-sm font-medium">Öffnen</button>
                              <button onClick={() => deleteHistoryItem(item.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded transition"><Trash2 size={16} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {currentView === 'modeller' && (
          <>
            <div className="bg-slate-900 border-b border-slate-800 px-8 py-6"><h2 className="text-2xl font-semibold text-white tracking-tight">Automatisierte Prozessmodellierung</h2><p className="text-slate-400 text-sm mt-1">Generierung von BPMN 2.0 Modellen aus Rechtstexten</p></div>
            <div className="border-b border-slate-800 bg-slate-900/50">
              <div className="px-8 flex gap-12 py-3">
                <TabButton label="Initiale Tätigkeitsliste" active={activeTab === 'activities'} onClick={() => setActiveTab('activities')} icon={<List size={16} />} />
                <TabButton label="FIM-Klassifizierung" active={activeTab === 'rag'} onClick={() => setActiveTab('rag')} icon={<Tags size={16} />} />
                <TabButton label="Modell-Generierung" active={activeTab === 'generation'} onClick={() => setActiveTab('generation')} icon={<Play size={16} />} />
                <TabButton label="Musterprozesse" active={activeTab === 'patterns'} onClick={() => setActiveTab('patterns')} icon={<Database size={16} />} />
                <TabButton label="Dokumentenablage" active={activeTab === 'archive'} onClick={() => setActiveTab('archive')} icon={<FileText size={16} />} />
                <TabButton label="Qualitätssicherung" active={activeTab === 'quality'} onClick={() => setActiveTab('quality')} icon={<CheckCircle size={16} />} />
              </div>
            </div>

            <main className="flex-1 overflow-y-auto p-8 bg-gray-950">

{activeTab === 'activities' && (
  <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 h-[850px]">
    
    {/* LINKER CONTAINER: Eingabe (1/3 Breite) */}
    <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl h-full flex flex-col overflow-y-auto">
      <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2"><List size={20} className="text-blue-400" /> Extraktion starten</h3>
      <div className="space-y-6">
        <div><label className="block text-xs font-medium text-slate-400 uppercase mb-2">Name der Leistung *</label><input type="text" value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="z.B. Todesbescheinigung prüfen" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none transition-colors" /></div>
        <div><label className="block text-xs font-medium text-slate-400 uppercase mb-2">Anmerkungen</label><textarea value={userNotes} onChange={(e) => setUserNotes(e.target.value)} placeholder="Kontext für die KI..." rows={4} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none resize-none transition-colors" /></div>
        <div><label className="block text-xs font-medium text-slate-400 uppercase mb-2">Referenz-Musterprozess</label><select value={selectedPatternId} onChange={(e) => setSelectedPatternId(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none">{<option value="">Kein Muster ausgewählt</option>}{musterList.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}</select></div>
        <div><div className="flex justify-between items-end mb-2"><label className="block text-xs font-medium text-slate-400 uppercase">Dokumente</label><span className="text-xs text-slate-500">{actFiles.length} Datei(en)</span></div><div className="bg-slate-950 border border-slate-700 rounded-lg overflow-hidden">{actFiles.map((file, index) => (<div key={index} className="flex items-center justify-between p-3 border-b border-slate-800 bg-slate-900/50"><div className="flex items-center gap-2 truncate max-w-[85%]"><FileIcon fileName={file.name} size={16} className="text-blue-400 flex-shrink-0" /><span className="truncate text-slate-300 text-sm">{file.name}</span></div><button onClick={() => removeActFile(index)} className="text-slate-500 hover:text-red-400"><X size={14} /></button></div>))}<div className="relative p-4 text-center hover:bg-slate-800 transition cursor-pointer border-t border-slate-800 border-dashed"><input type="file" accept=".pdf,.json,.md,.txt" multiple onChange={handleActFileSelect} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" /><div className="flex items-center justify-center gap-2 text-slate-500 text-sm"><Plus size={16} /> Dateien hinzufügen</div></div></div></div>
        <button onClick={handleExtractActivities} disabled={isExtracting || actFiles.length === 0 || !serviceName} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-900/20">{isExtracting ? <Clock size={20} className="animate-spin" /> : <Play size={20} />} Tätigkeiten extrahieren</button>
      </div>
    </div>

    {/* RECHTER CONTAINER: Experten-Editor (2/3 Breite) */}
    <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-xl h-full flex flex-col overflow-hidden">
      <div className="p-6 border-b border-slate-800 bg-slate-900 rounded-t-xl flex justify-between items-center shrink-0">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Edit2 size={20} className="text-slate-400" /> Prozess-Editor</h3>
        <div className="flex gap-2">
          <button onClick={addActivity} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"><Plus size={14} /> Zeile hinzufügen</button>
          <button onClick={handleDownloadJSON} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"><Download size={14} /> JSON Export</button>
          <button onClick={handleFinalizeActivities} disabled={isFinalizing} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-500 rounded-lg shadow-lg shadow-green-900/20 transition-all">
            {isFinalizing ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />} Finalisieren
          </button>
        </div>
      </div>

      <div className="flex-1 bg-slate-950 p-6 overflow-auto rounded-b-xl">
        {extractedActivities && extractedActivities.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-slate-700">
            <table className="w-full border-collapse text-slate-300">
              <thead className="bg-slate-900 sticky top-0 z-10 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                <tr>
                  <th className="p-3 text-center border-b border-slate-800 w-16 text-blue-500">Nr</th>
                  <th className="p-3 text-left border-b border-slate-800 w-44">Typ</th>
                  <th className="p-3 text-left border-b border-slate-800">Bezeichnung</th>
                  <th className="p-3 text-left border-b border-slate-800 w-1/4">Grundlage</th>
                  <th className="p-3 text-center border-b border-slate-800 w-12"></th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {extractedActivities.map((item, index) => (
                  <tr 
                    key={index} draggable 
                    onDragStart={() => setDraggedIndex(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      const updated = [...extractedActivities];
                      const itemToMove = updated.splice(draggedIndex, 1)[0];
                      updated.splice(index, 0, itemToMove);
                      setExtractedActivities(resequence(updated));
                      setDraggedIndex(null);
                    }}
                    className={`border-b border-slate-800/50 hover:bg-slate-900/60 transition-all cursor-grab active:cursor-grabbing ${draggedIndex === index ? 'opacity-30 bg-blue-500/10' : ''}`}
                  >
                    <td className="p-3 text-center align-middle font-bold text-xs text-blue-400 select-none">
                      <div className="flex items-center justify-center gap-2"><Menu size={12} className="text-slate-700" /> {item.nr}</div>
                    </td>
                    <td className="p-3 align-top">
                      <select value={item.typ} onChange={(e) => updateActivityField(index, 'typ', e.target.value)}
                        className={`border rounded text-[10px] p-1.5 w-full font-bold outline-none transition-colors cursor-pointer ${item.typ === 'Prozessklasse' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
                        <option value="Prozessklasse">PROZESSKLASSE</option>
                        <option value="Aktivitätengruppe">AKTIVITÄTENGRUPPE</option>
                      </select>
                    </td>
                    <td className="p-2 align-top">
                      <textarea value={item.bezeichnung} onChange={(e) => updateActivityField(index, 'bezeichnung', e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-1 focus:ring-blue-500/30 rounded px-2 py-1 text-slate-200 resize-none text-sm leading-relaxed overflow-hidden"
                        rows={Math.max(1, Math.ceil(item.bezeichnung.length / 38) + (item.bezeichnung.split('\n').length - 1))}
                      />
                    </td>
                    <td className="p-2 align-top">
                      <textarea value={item.handlungsgrundlage} onChange={(e) => updateActivityField(index, 'handlungsgrundlage', e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-1 focus:ring-blue-500/30 rounded px-2 py-1 text-slate-500 italic text-xs resize-none overflow-hidden"
                        rows={Math.max(1, Math.ceil(item.handlungsgrundlage.length / 28) + (item.handlungsgrundlage.split('\n').length - 1))}
                      />
                    </td>
                    <td className="p-2 text-center align-top"><button onClick={() => deleteActivity(index)} className="p-2 text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-40 py-20"><Edit2 size={64} className="mb-4" /><p>Liste leer.</p></div>
        )}
      </div>
    </div>
  </div>
)}

              {activeTab === 'rag' && (
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 h-[750px]">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl h-full flex flex-col">
                    <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2"><Tags size={20} className="text-blue-400" /> FIM-Klassifizierung</h3>
                    <div className="space-y-6">
                      <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg"><p className="text-blue-200 text-sm leading-relaxed">Dieser Assistent ordnet Prozessschritten automatisch die offizielle <strong>FIM-Referenzaktivitätengruppe (RAG)</strong> zu. Laden Sie einfach eine Tätigkeitsliste oder Prozessbeschreibung hoch.</p></div>
                      <div><label className="block text-xs font-medium text-slate-400 uppercase mb-2">Dokument (PDF, JSON, MD, TXT)</label><div className="border border-dashed border-slate-700 rounded-lg p-8 text-center hover:bg-slate-800 transition relative group"><input type="file" accept=".pdf,.json,.md,.txt" onChange={(e) => setRagFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />{ragFile ? (<div className="flex flex-col items-center justify-center gap-2 text-blue-400 font-medium text-sm"><FileIcon fileName={ragFile.name} size={32} className="mb-1" />{ragFile.name}<span className="text-xs text-slate-500 font-normal">Klicken zum Ändern</span></div>) : (<div className="flex flex-col items-center gap-2 text-slate-500 group-hover:text-slate-300 transition-colors"><Upload size={32} className="opacity-50" /><span className="text-sm">Datei ablegen oder klicken</span></div>)}</div></div>
                      <button onClick={handleClassifyRag} disabled={isClassifying || !ragFile} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20 mt-4">{isClassifying ? <Clock size={20} className="animate-spin" /> : <Tags size={20} />}{isClassifying ? 'KI klassifiziert Aktivitäten...' : 'RAG-Typen bestimmen'}</button>
                    </div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-xl h-full flex flex-col">
                    <div className="p-6 border-b border-slate-800 bg-slate-900 rounded-t-xl shrink-0"><h3 className="text-lg font-semibold text-white flex items-center gap-2"><CheckCircle size={20} className="text-green-400" /> Klassifizierte Liste</h3></div>
                    <div className="flex-1 bg-slate-950 p-6 overflow-auto rounded-b-xl">{ragResults && ragResults.length > 0 ? (<div className="space-y-3">{ragResults.map((item, idx) => (<div key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-lg hover:border-slate-700 transition"><div className="flex justify-between items-start mb-2"><span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-blue-500/10 text-blue-300 border border-blue-500/20"><span className="w-4 h-4 bg-blue-500/20 rounded-full flex items-center justify-center text-[10px]">{item.rag_id}</span>{item.rag_name}</span></div><p className="text-white text-sm mb-2 leading-relaxed">{item.orig_text}</p>{item.reason && (<p className="text-slate-500 text-xs italic border-l-2 border-slate-700 pl-2">KI-Begründung: {item.reason}</p>)}</div>))}</div>) : (<div className="h-full flex flex-col items-center justify-center text-slate-600">{isClassifying ? (<div className="text-center"><Clock size={48} className="mx-auto mb-4 text-blue-500 animate-spin" /><p className="text-slate-400 animate-pulse">Analysiere nach FIM-Standard...</p></div>) : (<div className="text-center opacity-40"><Tags size={64} className="mx-auto mb-4" /><p>Noch keine Klassifizierung.</p></div>)}</div>)}</div>
                  </div>
                </div>
              )}

              {activeTab === 'patterns' && (
  <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
    
    {/* OBERER BEREICH: Upload (Zentriert und kompakter) */}
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">FIM Musterprozess hochladen</h2>
          <p className="text-slate-400 text-sm mt-1">XProzess-XML für die KI-Referenzbibliothek hinzufügen</p>
        </div>
        <div className="p-3 bg-blue-500/10 rounded-xl">
          <Database size={24} className="text-blue-500" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Name des Musters</label>
          <input 
            type="text" 
            value={patternName} 
            onChange={(e) => setPatternName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-slate-700" 
            placeholder="z.B. Standard-Anzeigeverfahren" 
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">XProzess Daten (XML / JSON)</label>
          <div className="relative border-2 border-dashed border-slate-800 rounded-xl px-4 py-2.5 text-center hover:bg-slate-800/50 hover:border-slate-700 transition-all cursor-pointer group">
            <input 
              type="file" 
              accept=".xml,.json" 
              onChange={(e) => setXProcessFile(e.target.files[0])} 
              className="absolute inset-0 opacity-0 z-10 cursor-pointer" 
            />
            <div className="flex items-center justify-center gap-3">
              <FileCode size={20} className={xProcessFile ? "text-blue-400" : "text-slate-600"} />
              <span className="text-xs font-medium text-slate-500 truncate max-w-[180px]">
                {xProcessFile ? xProcessFile.name : "Datei auswählen"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <button 
        onClick={handleUploadPattern}
        disabled={isUploadingPattern || !patternName || !xProcessFile}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:grayscale shadow-lg shadow-blue-900/20"
      >
        {isUploadingPattern ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
        {isUploadingPattern ? 'Muster wird gespeichert...' : 'Musterprozess-Paket speichern'}
      </button>
    </div>

    {/* UNTERER BEREICH: Liste der Muster (Volle Breite) */}
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
      <div className="px-8 py-5 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <List size={18} className="text-slate-500" />
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Hinterlegte Musterprozesse</h3>
        </div>
        <span className="text-[10px] font-bold bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20">
          {musterList.length} Referenzmodelle
        </span>
      </div>
      
      <div className="divide-y divide-slate-800/50">
        {musterList.length > 0 ? (
          musterList.map(m => (
            <div key={m.id} className="p-5 flex items-center justify-between group hover:bg-slate-800/30 transition-all duration-200">
              <div className="flex items-center gap-5 flex-1 min-w-0">
                <div className="w-12 h-12 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center text-blue-500 shadow-inner group-hover:border-blue-500/30 transition-colors">
                  <FileCode size={24}/>
                </div>
                
                {editingId === m.id ? (
                  <div className="flex gap-3 w-full max-w-xl">
                    <input 
                      value={newName} 
                      onChange={e => setNewName(e.target.value)}
                      className="bg-slate-950 border border-blue-500 rounded-xl px-4 py-2 text-sm flex-1 text-white focus:outline-none ring-2 ring-blue-500/10"
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <button onClick={() => handleRename(m.id)} className="text-green-500 hover:bg-green-500/10 p-2 rounded-lg transition-colors"><Check size={20}/></button>
                      <button onClick={() => setEditingId(null)} className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg transition-colors"><X size={20}/></button>
                    </div>
                  </div>
                ) : (
                  <div className="truncate">
                    <h4 className="text-slate-200 font-bold text-base truncate group-hover:text-white transition-colors">{m.title}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">XProzess</span>
                      <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                      <span className="text-[10px] text-slate-600 font-medium italic">ID: {m.id}</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                {!editingId && (
                  <>
                    <button 
                      onClick={() => { setEditingId(m.id); setNewName(m.title); }}
                      className="p-2.5 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all"
                      title="Name bearbeiten"
                    >
                      <Edit2 size={18}/>
                    </button>
                    <button 
                      onClick={() => deleteMuster(m.id)} 
                      className="p-2.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                      title="Aus Datenbank löschen"
                    >
                      <Trash2 size={18}/>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-600 bg-slate-950/20">
            <Database size={48} className="mb-4 opacity-10" />
            <p className="text-sm font-medium italic opacity-50">Keine Musterprozesse vorhanden.</p>
          </div>
        )}
      </div>
    </div>
  </div>
)}
              {activeTab === 'generation' && (
                <div className="space-y-8 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8"><div className="lg:col-span-1 space-y-6"><div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl"><h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Settings size={20} className="text-blue-400" /> Einstellungen</h3><div className="space-y-5"><div><label className="block text-xs font-medium text-slate-400 uppercase mb-2">Prozessname</label><input type="text" value={genTitle} onChange={(e) => setGenTitle(e.target.value)} placeholder="z.B. Antrag auf Baugenehmigung" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none" /></div><div><div className="flex justify-between items-end mb-2"><label className="block text-xs font-medium text-slate-400 uppercase">Quelltexte (PDF, JSON)</label><span className="text-xs text-slate-500">{genFiles.length} Datei(en)</span></div><div className="bg-slate-950 border border-slate-700 rounded-lg overflow-hidden">{genFiles.map((file, index) => (<div key={index} className="flex items-center justify-between p-2 border-b border-slate-800 bg-slate-900/50 text-xs"><div className="flex items-center gap-2 truncate max-w-[85%]"><FileIcon fileName={file.name} size={12} className="text-blue-400 flex-shrink-0" /><span className="truncate text-slate-300" title={file.name}>{file.name}</span></div><button onClick={() => removeGenFile(index)} className="text-slate-500 hover:text-red-400"><X size={12} /></button></div>))}<div className="relative p-3 text-center hover:bg-slate-800 transition cursor-pointer border-t border-slate-800 border-dashed"><input type="file" accept=".pdf,.json,.md,.txt" multiple onChange={handleGenFileSelect} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" /><div className="flex items-center justify-center gap-2 text-slate-500 text-xs"><Plus size={14} /> Dateien hinzufügen</div></div></div></div><div><label className="block text-xs font-medium text-slate-400 uppercase mb-2">Kontext / Hinweise</label><div className="relative"><MessageSquare size={14} className="absolute top-3 left-3 text-slate-600" /><textarea value={genNotes} onChange={(e) => setGenNotes(e.target.value)} placeholder="Z.B. Fokus auf Fristen..." className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-white text-xs focus:border-blue-500 focus:outline-none min-h-[80px]" /></div></div><button onClick={handleGenerate} disabled={isGenerating || !genTitle || genFiles.length === 0} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20">{isGenerating ? <Clock size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />}{isGenerating ? 'KI arbeitet...' : 'Modell generieren'}</button></div></div>{generationError && (<div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg text-xs flex items-start gap-3"><AlertCircle size={16} className="flex-shrink-0 mt-0.5" /><div>{generationError}</div></div>)}</div><div className="lg:col-span-2 flex flex-col h-[700px]"><div className="bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-xl flex-1 flex flex-col"><div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 rounded-t-xl"><h3 className="text-lg font-semibold text-white flex items-center gap-2"><FileJson size={20} className="text-green-400" /> Generiertes Modell</h3>{generatedXml && (<div className="flex gap-2"><button className="text-xs flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded text-slate-300 transition border border-slate-700"><Maximize2 size={14} /> Fullscreen</button><a href={`data:application/xml;charset=utf-8,${encodeURIComponent(generatedXml)}`} download={`${genTitle}.bpmn`} className="text-xs flex items-center gap-1 bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded text-white transition shadow-md"><Download size={14} /> Download BPMN</a></div>)}</div><div className="flex-1 bg-slate-950 relative overflow-hidden flex items-center justify-center rounded-b-lg">{isGenerating ? (<div className="text-center max-w-xs"><div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-6"></div><h4 className="text-white font-medium mb-2">Generierung läuft...</h4><p className="text-slate-500 text-xs leading-relaxed">Die KI analysiert die {genFiles.length} Dokumente, sucht nach ähnlichen Referenzprozessen in der Datenbank und erstellt das BPMN-Modell.</p></div>) : generatedXml ? (<div className="w-full h-full bg-white animate-in fade-in duration-500"><BpmnVisu xml={generatedXml} /></div>) : (<div className="text-slate-600 text-sm text-center px-8 opacity-50"><FileJson size={64} className="mx-auto mb-4 text-slate-700" /><p>Hier erscheint das generierte Prozessmodell.</p></div>)}</div></div>{generatedModels.length > 0 && (<div className="mt-6"><h4 className="text-sm font-medium text-slate-400 uppercase mb-3">Verlauf dieser Sitzung</h4><div className="space-y-2">{generatedModels.map(model => (<div key={model.id} className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex justify-between items-center hover:bg-slate-800 transition cursor-pointer" onClick={() => setGeneratedXml(null)}><div className="flex items-center gap-3"><CheckCircle size={16} className="text-green-500" /><div><div className="text-white text-sm font-medium">{model.name}</div><div className="text-slate-500 text-xs">{model.source} • {model.createdAt}</div></div></div><button className="p-2 text-slate-500 hover:text-white"><Download size={16} /></button></div>))}</div></div>)}</div></div>
              )}
              
              {activeTab === 'archive' && (
                <div className="max-w-6xl mx-auto space-y-8"><div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl"><div className="flex items-center justify-between mb-6"><div><h2 className="text-lg font-semibold text-white">Neues Trainings-Paket</h2><p className="text-slate-400 text-sm mt-1">Verknüpfen Sie Gesetzestexte mit einem Referenzmodell.</p></div><span className="px-3 py-1 bg-blue-500/10 text-blue-400 text-xs font-medium rounded-full border border-blue-500/20">RAG Ingestion</span></div><div className="mb-6"><label className="block text-xs font-medium text-slate-400 uppercase mb-2">Titel des Pakets</label><input type="text" value={packageTitle} onChange={(e) => setPackageTitle(e.target.value)} className="w-full bg-slate-950/50 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" placeholder="z.B. Baugenehmigungsverfahren (LBO M-V)" /></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-8"><div><div className="flex justify-between items-end mb-2"><label className="text-xs font-medium text-slate-400 uppercase">1. Gesetzestexte (Quellen)</label><span className="text-xs text-slate-500">{uploadPdfs.length} Dateien</span></div><div className="bg-slate-950 rounded-lg border border-slate-700 overflow-hidden">{uploadPdfs.map(file => (<div key={file.id} className="p-3 border-b border-slate-800 flex items-center gap-3 hover:bg-slate-900 transition"><FileIcon fileName={file.customName} size={16} className="text-blue-400 flex-shrink-0" /><div className="flex-1 min-w-0"><input type="text" value={file.customName} onChange={(e) => updatePdfName(file.id, e.target.value)} className="bg-transparent border-none text-sm text-white w-full focus:ring-0 p-0" /></div><button onClick={() => removePdf(file.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded"><X size={14} /></button></div>))}<div className="relative p-4 hover:bg-slate-900 transition group cursor-pointer text-center"><input type="file" accept=".pdf,.json,.md,.txt" multiple onChange={handlePdfSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" /><div className="flex items-center justify-center gap-2 text-slate-500 group-hover:text-blue-400"><Upload size={16} /> <span className="text-sm">Dateien hinzufügen...</span></div></div></div></div><div><label className="block text-xs font-medium text-slate-400 uppercase mb-2">2. Referenz-Modell (Ziel)</label><div className={`border-2 border-dashed rounded-lg h-[150px] flex flex-col items-center justify-center relative transition-all ${uploadBpmn ? 'border-green-500/30 bg-green-500/5' : 'border-slate-700 hover:border-slate-600'}`}><input type="file" accept=".bpmn,.xml" onChange={(e) => setUploadBpmn(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />{uploadBpmn ? (<div className="text-center z-20 pointer-events-none"><div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2"><CheckCircle size={20} className="text-green-400" /></div><p className="text-green-400 font-medium text-sm max-w-[200px] truncate">{uploadBpmn.name}</p></div>) : (<div className="text-center pointer-events-none"><FileJson className="mx-auto text-slate-600 mb-2" size={20} /><p className="text-slate-400 text-sm">BPMN auswählen</p></div>)}</div>{uploadBpmn && <button onClick={() => setUploadBpmn(null)} className="text-xs text-red-400 hover:text-red-300 underline w-full text-right">Entfernen</button>}</div></div><div className="mt-8 pt-6 border-t border-slate-800 flex justify-end"><button onClick={handleUpload} disabled={isUploading} className="bg-blue-600 hover:bg-blue-500 text-white py-2.5 px-6 rounded-lg font-medium transition flex items-center gap-2 shadow-lg disabled:opacity-50">{isUploading ? <Clock size={18} className="animate-spin" /> : <Download size={18} className="rotate-180" />}{isUploading ? 'Speichere...' : 'Paket hochladen'}</button></div></div><div className="space-y-4"><div className="flex justify-between items-center mb-2"><h3 className="text-lg font-semibold text-white flex items-center gap-3">Datenbank Inhalt <button onClick={fetchDocuments} className="text-slate-500 hover:text-white"><RefreshCw size={16} /></button></h3><div className="relative group"><input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Suche..." className="bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-blue-500 focus:outline-none w-64" /><Search size={16} className="absolute left-3 top-2.5 text-slate-500" /></div></div>{isLoadingData ? <div className="text-center py-12 text-slate-500"><Clock className="animate-spin mx-auto mb-2" /> Lade Daten...</div> : (<div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"><table className="w-full text-sm text-left"><thead className="bg-slate-950 text-xs uppercase font-semibold text-slate-500 border-b border-slate-800"><tr><th className="px-6 py-4">Paket</th><th className="px-6 py-4">Modell</th><th className="px-6 py-4">Datum</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Aktionen</th></tr></thead><tbody className="divide-y divide-slate-800">{filteredDocuments.map(doc => (<tr key={doc.id} className="hover:bg-slate-800/30 transition group"><td className="px-6 py-4"><div className="font-medium text-white">{doc.title}</div><div className="text-xs text-slate-500 mt-0.5">{doc.fileCount} Quelldatei(en)</div></td><td className="px-6 py-4"><div className="flex items-center gap-2 text-slate-300 font-mono text-xs bg-slate-800 px-2 py-1 rounded w-fit border border-slate-700"><FileJson size={12} className="text-green-400" /> XML</div></td><td className="px-6 py-4 text-slate-400">{doc.createdAt}</td><td className="px-6 py-4"><span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20"><CheckCircle size={12} /> Indiziert</span></td><td className="px-6 py-4 text-right flex justify-end gap-2"><button onClick={() => setPreviewItem({ title: doc.title, content: doc.raw_text, type: 'text' })} className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded"><FileText size={18} /></button><button onClick={() => setPreviewItem({ title: 'BPMN XML', content: doc.xml_content, type: 'xml' })} className="p-2 text-slate-400 hover:text-green-400 hover:bg-slate-800 rounded"><FileJson size={18} /></button><button onClick={() => handleDeletePair(doc.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded"><Trash2 size={18} /></button></td></tr>))}</tbody></table>{filteredDocuments.length === 0 && <div className="p-8 text-center text-slate-600 italic">Keine Daten gefunden.</div>}</div>)}</div></div>
              )}
              {activeTab === 'quality' && (
                <div className="space-y-6 max-w-4xl">{unratedModels.length > 0 && (<div><h3 className="text-lg font-semibold text-white mb-4">Zu bewertende Modelle ({unratedModels.length})</h3><div className="space-y-4">{unratedModels.map((model) => (<RatingCard key={model.id} model={model} onRate={(rating, feedback) => handleRateModel(model.id, rating, feedback)} />))}</div></div>)}{ratedModels.length > 0 && (<div><h3 className="text-lg font-semibold text-white mb-4">Bewertete Modelle ({ratedModels.length})</h3><div className="space-y-3">{ratedModels.map((model) => (<div key={model.id} className="bg-slate-800 border border-slate-700 rounded-lg p-4"><div className="flex items-start justify-between"><div><p className="text-white font-medium">{model.name}</p><p className="text-slate-400 text-sm">Bewertung: {'★'.repeat(model.rating)}</p>{model.feedback && <p className="text-slate-300 text-sm mt-2">Feedback: {model.feedback}</p>}</div><CheckCircle size={20} className="text-green-500 flex-shrink-0" /></div></div>))}</div></div>)}</div>
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
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${active ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
    >
      {icon}
      {open && <span className="text-sm font-medium">{label}</span>}
    </div>
  );
}

function TabButton({ label, active, onClick, icon }) { return <button onClick={onClick} className={`pb-3 px-2 text-sm font-medium border-b-2 transition flex items-center gap-2 ${active ? 'text-white border-blue-500' : 'text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-700'}`}>{icon}<span>{label}</span></button> }
function RatingCard({ model, onRate }) {
  const [rating, setRating] = useState(0); const [feedback, setFeedback] = useState('');
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
      <div><p className="text-white font-medium">{model.name}</p><p className="text-slate-400 text-sm">Quelle: {model.source} • {model.createdAt}</p></div>
      <div><label className="text-sm font-medium text-slate-300 block mb-3">Bewertung</label><div className="flex gap-2">{[1, 2, 3, 4, 5].map((star) => (<button key={star} onClick={() => setRating(star)} className={`text-2xl transition ${rating >= star ? 'text-yellow-400' : 'text-slate-600'}`}>★</button>))}</div></div>
      <div><label className="text-sm font-medium text-slate-300 block mb-2">Feedback</label><textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Feedback..." className="w-full bg-slate-700 text-white rounded border border-slate-600 p-3 text-sm focus:outline-none focus:border-blue-500" rows={3} /></div>
      <button onClick={() => { onRate(rating, feedback); setRating(0); setFeedback(''); }} disabled={rating === 0} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white py-2 rounded font-medium transition">Bewertung speichern</button>
    </div>
  );
}
