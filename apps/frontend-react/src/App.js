import React, { useState } from 'react';
import { Upload, FileText, Settings, HelpCircle, Menu, X, Download, Trash2, CheckCircle, Clock, AlertCircle, Eye } from 'lucide-react';

export default function ProcessModeller() {
  const [activeTab, setActiveTab] = useState('generation');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [backendStatus, setBackendStatus] = useState('connected');

  // GENERATION TAB STATE
  const [generationFile, setGenerationFile] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generatedModels, setGeneratedModels] = useState([]);

  // DOKUMENTENABLAGE TAB STATE
  const [documentPairs, setDocumentPairs] = useState([
    {
      id: 1,
      pdfName: 'BAfÖG_Gesetzestext_2024.pdf',
      bpmnName: 'BPMN_BAfÖG_2024.bpmn',
      pdfSize: '2.4 MB',
      bpmnSize: '145 KB',
      createdAt: '19.11.2025 14:35',
      uploadedToVectorDB: true,
      vectorDBDate: '19.11.2025 15:00'
    },
    {
      id: 2,
      pdfName: 'Verwaltungsakt_Antrag.pdf',
      bpmnName: 'BPMN_Verwaltungsakt.bpmn',
      pdfSize: '1.1 MB',
      bpmnSize: '98 KB',
      createdAt: '19.11.2025 14:40',
      uploadedToVectorDB: true,
      vectorDBDate: '19.11.2025 15:05'
    }
  ]);

  // QUALITÄTSSICHERUNG TAB STATE
  const [allModels, setAllModels] = useState([
    {
      id: 1,
      name: 'BPMN_BAfÖG_2024',
      source: 'BAfÖG_Gesetzestext_2024.pdf',
      createdAt: '19.11.2025 14:35',
      status: 'completed',
      rating: 4,
      feedback: 'Gutes Modell, alle Hauptschritte erfasst'
    },
    {
      id: 2,
      name: 'BPMN_Verwaltungsakt',
      source: 'Verwaltungsakt_Antrag.pdf',
      createdAt: '19.11.2025 14:40',
      status: 'completed',
      rating: null,
      feedback: null
    }
  ]);

  const [selectedModelPreview, setSelectedModelPreview] = useState(null);

  // HANDLERS
  const handleGenerationFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setGenerationFile(file);
    }
  };

  const handleGenerateBPMN = () => {
    if (!generationFile) return;
    
    setGenerating(true);
    setTimeout(() => {
      const newModel = {
        id: generatedModels.length + 1,
        name: `BPMN_${generationFile.name.replace('.pdf', '')}_${new Date().getTime()}`,
        source: generationFile.name,
        createdAt: new Date().toLocaleString('de-DE'),
        status: 'completed',
        rating: null,
        feedback: null
      };
      
      setGeneratedModels([...generatedModels, newModel]);
      setAllModels([...allModels, newModel]);
      setGenerating(false);
      setGenerationFile(null);
    }, 3000);
  };

  const handleAddPairToArchive = (model) => {
    const newPair = {
      id: documentPairs.length + 1,
      pdfName: model.source,
      bpmnName: `${model.name}.bpmn`,
      pdfSize: '2.4 MB',
      bpmnSize: '145 KB',
      createdAt: model.createdAt,
      uploadedToVectorDB: false,
      vectorDBDate: null
    };
    
    setDocumentPairs([...documentPairs, newPair]);
  };

  const handleUploadPairToVectorDB = (pairId) => {
    setDocumentPairs(documentPairs.map(pair =>
      pair.id === pairId
        ? { ...pair, uploadedToVectorDB: true, vectorDBDate: new Date().toLocaleString('de-DE') }
        : pair
    ));
  };

  const handleRateModel = (modelId, rating, feedback) => {
    setAllModels(allModels.map(model =>
      model.id === modelId
        ? { ...model, rating, feedback }
        : model
    ));
  };

  const handleDeletePair = (pairId) => {
    setDocumentPairs(documentPairs.filter(p => p.id !== pairId));
  };

  const handleDeleteModel = (modelId) => {
    setGeneratedModels(generatedModels.filter(m => m.id !== modelId));
    setAllModels(allModels.filter(m => m.id !== modelId));
  };

  const ratedModels = allModels.filter(m => m.rating !== null);
  const unratedModels = allModels.filter(m => m.rating === null);

  return (
    <div className="flex h-screen bg-gray-950">
      {/* SIDEBAR */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          {sidebarOpen && <h1 className="text-sm font-bold text-white tracking-tight">PROCESS MODELLER</h1>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-500 hover:text-slate-300 p-1">
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <NavItem icon={<FileText size={18} />} label="Dokumentation" open={sidebarOpen} />
          <NavItem icon={<Settings size={18} />} label="Einstellungen" open={sidebarOpen} />
          <NavItem icon={<HelpCircle size={18} />} label="Hilfe" open={sidebarOpen} />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className={`${sidebarOpen ? 'text-xs' : ''} flex items-center gap-2`}>
            <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
            {sidebarOpen && <span className="text-slate-400 text-xs">Backend Connected</span>}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="bg-slate-900 border-b border-slate-800 px-8 py-6">
          <h2 className="text-2xl font-semibold text-white tracking-tight">Automatisierte Prozessmodellierung</h2>
          <p className="text-slate-400 text-sm mt-1">Generierung von BPMN 2.0 Modellen aus Rechtstexten</p>
        </div>

        {/* TABS */}
        <div className="border-b border-slate-800 bg-slate-900/50">
          <div className="px-8 flex gap-8">
            <TabButton
              label="Modell-Generierung"
              active={activeTab === 'generation'}
              onClick={() => setActiveTab('generation')}
            />
            <TabButton
              label="Dokumentenablage"
              active={activeTab === 'archive'}
              onClick={() => setActiveTab('archive')}
            />
            <TabButton
              label="Qualitätssicherung"
              active={activeTab === 'quality'}
              onClick={() => setActiveTab('quality')}
            />
          </div>
        </div>

        {/* TAB CONTENT */}
        <div className="flex-1 overflow-auto p-8">
          {/* MODELL-GENERIERUNG */}
          {activeTab === 'generation' && (
            <div className="space-y-6 max-w-4xl">
              <div className="bg-blue-600/10 border border-blue-500/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-2">BPMN-Modell generieren</h3>
                <p className="text-slate-300 text-sm mb-6">Laden Sie einen Gesetzestext hoch. Das System generiert daraus automatisch ein BPMN-Modell.</p>
                
                <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center hover:border-slate-600 transition cursor-pointer bg-slate-800/30">
                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleGenerationFileUpload}
                      className="hidden"
                    />
                    <div className="space-y-2">
                      <Upload size={32} className="mx-auto text-slate-500" />
                      <div>
                        <p className="text-white font-medium">{generationFile?.name || 'PDF-Datei auswählen'}</p>
                        <p className="text-slate-400 text-sm">oder hierher ziehen</p>
                      </div>
                    </div>
                  </label>
                </div>

                {generationFile && (
                  <div className="mt-6">
                    <button
                      onClick={handleGenerateBPMN}
                      disabled={generating}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white py-2 rounded font-medium transition"
                    >
                      {generating ? 'Generiere...' : 'BPMN generieren'}
                    </button>
                  </div>
                )}
              </div>

              {generating && (
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
                  <h4 className="font-medium text-white">Generierungsprozess läuft...</h4>
                  <div className="space-y-3">
                    <ProcessStep label="Extrahiere Text aus PDF" active />
                    <ProcessStep label="Analysiere Gesetzestext" />
                    <ProcessStep label="Identifiziere Prozessschritte" />
                    <ProcessStep label="Generiere BPMN-Modell" />
                    <ProcessStep label="Validiere Struktur" />
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-1 overflow-hidden">
                    <div className="bg-blue-500 h-full w-1/3 animate-pulse"></div>
                  </div>
                </div>
              )}

              {generatedModels.length > 0 && (
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                  <h4 className="font-medium text-white mb-4">Neu generierte Modelle ({generatedModels.length})</h4>
                  <div className="space-y-3">
                    {generatedModels.map((model) => (
                      <div key={model.id} className="flex items-center justify-between bg-slate-700/50 p-4 rounded border border-slate-600">
                        <div>
                          <p className="text-white font-medium">{model.name}</p>
                          <p className="text-slate-400 text-sm">Quelle: {model.source}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="p-2 hover:bg-slate-600 rounded transition text-slate-400 hover:text-white">
                            <Download size={18} />
                          </button>
                          <button
                            onClick={() => handleAddPairToArchive(model)}
                            className="px-3 py-1 bg-green-600/20 text-green-400 text-sm rounded hover:bg-green-600/30 transition"
                          >
                            In Archiv
                          </button>
                          <button
                            onClick={() => handleDeleteModel(model.id)}
                            className="p-2 hover:bg-slate-600 rounded transition text-slate-400 hover:text-red-400"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DOKUMENTENABLAGE */}
          {activeTab === 'archive' && (
            <div className="space-y-6 max-w-5xl">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Trainingsdaten-Archive</h3>
                <p className="text-slate-400 text-sm mb-6">Paare von Gesetzestexten und daraus generierten BPMN-Modellen. Diese werden in die Vektordatenbank hochgeladen für bessere zukünftige Generierungen.</p>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Gesetzestext</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">BPMN-Modell</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Erstellt</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Vector DB Status</th>
                        <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documentPairs.map((pair) => (
                        <tr key={pair.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition">
                          <td className="py-4 px-4">
                            <div className="text-sm">
                              <p className="text-white">{pair.pdfName}</p>
                              <p className="text-slate-400 text-xs">{pair.pdfSize}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm">
                              <p className="text-white">{pair.bpmnName}</p>
                              <p className="text-slate-400 text-xs">{pair.bpmnSize}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-slate-400 text-sm">{pair.createdAt}</td>
                          <td className="py-4 px-4">
                            {pair.uploadedToVectorDB ? (
                              <div className="flex items-center gap-2">
                                <CheckCircle size={16} className="text-green-500" />
                                <span className="text-green-400 text-sm">{pair.vectorDBDate}</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleUploadPairToVectorDB(pair.id)}
                                className="px-3 py-1 bg-blue-600/20 text-blue-400 text-sm rounded hover:bg-blue-600/30 transition"
                              >
                                Upload
                              </button>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <button
                              onClick={() => handleDeletePair(pair.id)}
                              className="p-2 hover:bg-slate-700 rounded transition text-slate-400 hover:text-red-400"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* QUALITÄTSSICHERUNG */}
          {activeTab === 'quality' && (
            <div className="space-y-6 max-w-4xl">
              {unratedModels.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Zu bewertende Modelle ({unratedModels.length})</h3>
                  <div className="space-y-4">
                    {unratedModels.map((model) => (
                      <RatingCard
                        key={model.id}
                        model={model}
                        onRate={(rating, feedback) => handleRateModel(model.id, rating, feedback)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {ratedModels.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Bewertete Modelle ({ratedModels.length})</h3>
                  <div className="space-y-3">
                    {ratedModels.map((model) => (
                      <div key={model.id} className="bg-slate-800 border border-slate-700 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-white font-medium">{model.name}</p>
                            <p className="text-slate-400 text-sm">Quelle: {model.source}</p>
                            <p className="text-slate-400 text-sm">Bewertung: {'★'.repeat(model.rating)}{'☆'.repeat(5 - model.rating)}</p>
                            {model.feedback && <p className="text-slate-300 text-sm mt-2">Feedback: {model.feedback}</p>}
                          </div>
                          <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon, label, open }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition text-sm">
      {icon}
      {open && <span>{label}</span>}
    </div>
  );
}

function TabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`py-4 px-1 text-sm font-medium border-b-2 transition whitespace-nowrap ${
        active
          ? 'text-white border-blue-500'
          : 'text-slate-400 border-transparent hover:text-slate-300'
      }`}
    >
      {label}
    </button>
  );
}

function ProcessStep({ label, active }) {
  return (
    <div className={`flex items-center gap-3 text-sm ${active ? 'text-blue-400' : 'text-slate-500'}`}>
      <div className={`w-2 h-2 rounded-full ${active ? 'bg-blue-400' : 'bg-slate-600'}`}></div>
      <span>{label}</span>
    </div>
  );
}

function RatingCard({ model, onRate }) {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
      <div>
        <p className="text-white font-medium">{model.name}</p>
        <p className="text-slate-400 text-sm">Quelle: {model.source} • {model.createdAt}</p>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-300 block mb-3">Bewertung</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className={`text-2xl transition ${rating >= star ? 'text-yellow-400' : 'text-slate-600'}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-300 block mb-2">Feedback</label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Feedback zum generierten Modell..."
          className="w-full bg-slate-700 text-white rounded border border-slate-600 p-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          rows={3}
        />
      </div>

      <button
        onClick={() => {
          onRate(rating, feedback);
          setRating(0);
          setFeedback('');
        }}
        disabled={rating === 0}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white py-2 rounded font-medium transition"
      >
        Bewertung speichern
      </button>
    </div>
  );
}
