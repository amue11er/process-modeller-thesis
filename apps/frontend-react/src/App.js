import React, { useState } from 'react';
import { Upload, FileText, Zap, Star, Settings, HelpCircle, Menu, X, Download, Trash2, CheckCircle, Clock } from 'lucide-react';

export default function ProcessModeller() {
  const [activeTab, setActiveTab] = useState('documents');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [documents, setDocuments] = useState([
    { id: 1, name: 'BAfÖG_Gesetzestext_2024.pdf', size: '2.4 MB', date: '19.11.2025 14:30', status: 'ready' },
    { id: 2, name: 'Verwaltungsakt_Antrag.pdf', size: '1.1 MB', date: '19.11.2025 14:32', status: 'ready' }
  ]);
  const [models, setModels] = useState([
    { id: 1, name: 'BPMN-BAfÖG_2024', source: 'BAfÖG_Gesetzestext_2024.pdf', date: '19.11.2025 14:35', quality: '85%', status: 'complete' },
    { id: 2, name: 'BPMN-Verwaltungsakt', source: 'Verwaltungsakt_Antrag.pdf', date: '19.11.2025 14:40', quality: '78%', status: 'complete' }
  ]);
  const [ratings, setRatings] = useState([
    { id: 1, modelId: 1, rating: 4, feedback: 'Gutes Modell, aber einige Prozessschritte fehlen' }
  ]);
  const [generating, setGenerating] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocuments([...documents, {
        id: documents.length + 1,
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        date: new Date().toLocaleString('de-DE'),
        status: 'ready'
      }]);
      setUploadedFile(file);
    }
  };

  const handleGenerateBPMN = (docId) => {
    setGenerating(true);
    setTimeout(() => {
      setModels([...models, {
        id: models.length + 1,
        name: `BPMN-Generated-${Date.now()}`,
        source: documents.find(d => d.id === docId)?.name || 'Unknown',
        date: new Date().toLocaleString('de-DE'),
        quality: `${Math.floor(Math.random() * 20 + 75)}%`,
        status: 'complete'
      }]);
      setGenerating(false);
    }, 3000);
  };

  const handleDeleteDoc = (docId) => {
    setDocuments(documents.filter(d => d.id !== docId));
  };

  const handleDeleteModel = (modelId) => {
    setModels(models.filter(m => m.id !== modelId));
  };

  const handleRateModel = (modelId, rating, feedback) => {
    const existingRating = ratings.find(r => r.modelId === modelId);
    if (existingRating) {
      setRatings(ratings.map(r => r.modelId === modelId ? { ...r, rating, feedback } : r));
    } else {
      setRatings([...ratings, { id: ratings.length + 1, modelId, rating, feedback }]);
    }
  };

  const unratedModels = models.filter(m => !ratings.find(r => r.modelId === m.id));
  const ratedModels = models.filter(m => ratings.find(r => r.modelId === m.id));

  return (
    <div className="flex h-screen bg-gray-950">
      {/* SIDEBAR */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700 transition-all duration-300 flex flex-col`}>
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          {sidebarOpen && <h1 className="text-lg font-bold text-white">Process Modeler</h1>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400 hover:text-white">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavItem icon={<FileText size={20} />} label="Dokumentation" open={sidebarOpen} />
          <NavItem icon={<Settings size={20} />} label="Einstellungen" open={sidebarOpen} />
          <NavItem icon={<HelpCircle size={20} />} label="Hilfe" open={sidebarOpen} />
        </nav>

        <div className="p-4 border-t border-slate-700">
          {sidebarOpen ? (
            <div className="text-xs text-slate-400">
              <p className="font-semibold text-slate-300 mb-2">Status</p>
              <div className="flex items-center gap-2 text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                Backend Connected
              </div>
            </div>
          ) : (
            <div className="w-2 h-2 bg-green-400 rounded-full mx-auto"></div>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOP BAR */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 px-8 py-6">
          <h2 className="text-3xl font-bold text-white mb-2">Automatisierte Prozessmodellierung</h2>
          <p className="text-slate-400">Generierung von BPMN 2.0 Modellen aus Rechtstexten der öffentlichen Verwaltung.</p>
        </div>

        {/* TABS */}
        <div className="border-b border-slate-700 bg-slate-900/50">
          <div className="px-8 flex gap-8">
            <TabButton
              label="📁 Dokumentenablage"
              active={activeTab === 'documents'}
              onClick={() => setActiveTab('documents')}
            />
            <TabButton
              label="⚙️ Modell-Generierung"
              active={activeTab === 'generation'}
              onClick={() => setActiveTab('generation')}
            />
            <TabButton
              label="⭐ Qualitätssicherung"
              active={activeTab === 'quality'}
              onClick={() => setActiveTab('quality')}
            />
          </div>
        </div>

        {/* TAB CONTENT */}
        <div className="flex-1 overflow-auto p-8">
          {/* DOKUMENTENABLAGE */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-8 text-white">
                <h3 className="text-xl font-semibold mb-2">Gesetzestexte importieren</h3>
                <p className="text-blue-100 mb-6">Laden Sie hier die Quelldateien (PDF) für die Prozessanalyse hoch.</p>
                <label className="inline-block">
                  <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
                  <div className="cursor-pointer bg-white text-blue-600 px-6 py-3 rounded font-semibold hover:bg-blue-50 transition">
                    Dateien auswählen
                  </div>
                </label>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-4">Verfügbare Dokumente</h3>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-slate-300 font-semibold">Dateiname</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-semibold">Größe</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-semibold">Importdatum</th>
                      <th className="text-left py-3 px-4 text-slate-300 font-semibold">Aktion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id} className="border-b border-slate-700 hover:bg-slate-800/50 transition">
                        <td className="py-4 px-4 text-slate-200 flex items-center gap-2">
                          <FileText size={16} className="text-blue-400" />
                          {doc.name}
                        </td>
                        <td className="py-4 px-4 text-slate-400">{doc.size}</td>
                        <td className="py-4 px-4 text-slate-400">{doc.date}</td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="text-red-400 hover:text-red-300 transition"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MODELL-GENERIERUNG */}
          {activeTab === 'generation' && (
            <div className="space-y-6">
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-4">BPMN-Generierung starten</h3>
                <p className="text-slate-300 mb-6">Wählen Sie ein Dokument und generieren Sie automatisch ein BPMN-Modell:</p>
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between bg-slate-700/50 p-4 rounded border border-slate-600 hover:border-blue-500 transition">
                      <span className="text-slate-200">{doc.name}</span>
                      <button
                        onClick={() => handleGenerateBPMN(doc.id)}
                        disabled={generating}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded font-semibold transition"
                      >
                        {generating ? '⏳ Generiere...' : '🚀 Generieren'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-4">Generierungsprozess</h3>
                {generating && (
                  <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 space-y-4">
                    <div className="space-y-3">
                      <ProcessStep icon="📄" label="Extrahiere Text aus PDF..." active />
                      <ProcessStep icon="🔍" label="Analysiere Gesetzestext..." />
                      <ProcessStep icon="🎯" label="Identifiziere Prozessschritte..." />
                      <ProcessStep icon="🔨" label="Generiere BPMN-Modell..." />
                      <ProcessStep icon="✅" label="Validiere BPMN-Struktur..." />
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-500 to-blue-400 h-full w-1/3 animate-pulse"></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* QUALITÄTSSICHERUNG */}
          {activeTab === 'quality' && (
            <div className="space-y-6">
              {unratedModels.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">⭐ Noch zu bewertende Modelle</h3>
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
                  <h3 className="text-xl font-bold text-white mb-4">✅ Bereits bewertete Modelle</h3>
                  <div className="space-y-4">
                    {ratedModels.map((model) => {
                      const rating = ratings.find(r => r.modelId === model.id);
                      return (
                        <div key={model.id} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-white">{model.name}</h4>
                              <p className="text-sm text-slate-400">Bewertung: {'⭐'.repeat(rating?.rating || 0)}</p>
                              <p className="text-sm text-slate-400">Feedback: {rating?.feedback}</p>
                            </div>
                            <CheckCircle size={24} className="text-green-400" />
                          </div>
                        </div>
                      );
                    })}
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
    <div className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded cursor-pointer transition">
      {icon}
      {open && <span className="text-sm font-medium">{label}</span>}
    </div>
  );
}

function TabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`py-4 px-2 font-semibold text-sm border-b-2 transition ${
        active
          ? 'text-blue-400 border-blue-400'
          : 'text-slate-400 border-transparent hover:text-slate-300'
      }`}
    >
      {label}
    </button>
  );
}

function ProcessStep({ icon, label, active }) {
  return (
    <div className={`flex items-center gap-3 p-2 ${active ? 'text-blue-400' : 'text-slate-500'}`}>
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
      {active && <div className="ml-auto animate-spin">⏳</div>}
    </div>
  );
}

function RatingCard({ model, onRate }) {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  return (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 space-y-4">
      <div>
        <h4 className="font-semibold text-white text-lg">{model.name}</h4>
        <p className="text-sm text-slate-400">Quelle: {model.source}</p>
        <p className="text-sm text-slate-400">Quality Score: {model.quality}</p>
      </div>

      <div>
        <label className="text-sm font-semibold text-slate-300 block mb-3">Bewertung</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className={`text-2xl transition ${rating >= star ? 'text-yellow-400' : 'text-slate-600'}`}
            >
              ⭐
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-semibold text-slate-300 block mb-2">Feedback</label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Geben Sie Feedback zum generierten BPMN-Modell..."
          className="w-full bg-slate-700 text-white rounded border border-slate-600 p-3 text-sm focus:outline-none focus:border-blue-500"
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
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 rounded font-semibold transition"
      >
        ✅ Bewertung speichern
      </button>
    </div>
  );
}
