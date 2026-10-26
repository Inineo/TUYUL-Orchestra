import React, { useState, useEffect } from 'react';
import { useOfficeStore } from '../../stores/useOfficeStore';
import { Agent, AgentDepartment, AgentRole } from '../../types/office';
import { fetchAvailableModels, RouterModel } from '../../lib/aiClient';
import {
  Cpu,
  Bot,
  Sparkles,
  Check,
  RotateCcw,
  Sliders,
  Layers,
  Code2,
  FileText,
  Search,
  ExternalLink,
  Shield,
  Zap,
  RefreshCw,
  UserCheck,
  X,
  ChevronDown,
} from 'lucide-react';

// Preset Model dasar (Fallback bila 9Router belum online)
const PRESET_MODELS = [
  { id: 'Daily', provider: '9Router Alias', tier: 'Fast & Smart General', badge: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
  { id: 'Architect', provider: '9Router Alias', tier: 'High Reasoning & Architecture', badge: 'bg-purple-950 text-purple-300 border-purple-800' },
  { id: 'Coding_Specialist', provider: '9Router Alias', tier: 'Code Generation & Refactor', badge: 'bg-blue-950 text-blue-300 border-blue-800' },
  { id: 'Reviewer', provider: '9Router Alias', tier: 'Code Review & QA Validation', badge: 'bg-amber-950 text-amber-300 border-amber-800' },
  { id: 'Fast', provider: '9Router Alias', tier: 'Ultra-low Latency Quick Tasks', badge: 'bg-cyan-950 text-cyan-300 border-cyan-800' },
  { id: 'Reasoning', provider: '9Router Alias', tier: 'Deep Reasoning & Logic Proofs', badge: 'bg-violet-950 text-violet-300 border-violet-800' },
  { id: 'gemini/gemini-3.7-flash', provider: 'Google', tier: 'Gemini 3.7 Flash', badge: 'bg-blue-950 text-blue-300 border-blue-800' },
  { id: 'gemini/gemini-3.8-flash', provider: 'Google', tier: 'Gemini 3.8 Flash', badge: 'bg-blue-950 text-blue-300 border-blue-800' },
  { id: 'ag/claude-sonnet-5-5', provider: 'Anthropic', tier: 'Claude Sonnet 5.5', badge: 'bg-amber-950 text-amber-300 border-amber-800' },
  { id: 'cx/gpt-6.1-sol', provider: 'OpenAI', tier: 'GPT 6.1 Sol (Frontier)', badge: 'bg-emerald-950 text-emerald-300 border-emerald-800' },
  { id: 'kr/deepseek-3.2-agentic', provider: 'DeepSeek', tier: 'DeepSeek 3.2 Agentic', badge: 'bg-purple-950 text-purple-300 border-purple-800' },
  { id: 'ollama/gpt-oss:120b', provider: 'Ollama Local', tier: 'GPT-OSS 120B Local GPU', badge: 'bg-zinc-800 text-zinc-200 border-zinc-700' },
];

export const ROLE_OPTIONS: { id: AgentRole; label: string; department: AgentDepartment }[] = [
  { id: 'product_manager', label: 'Product Manager (PM)', department: 'orchestra' },
  { id: 'researcher', label: 'Research Specialist & Knowledge Scout', department: 'orchestra' },
  { id: 'frontend', label: 'Front End & UI/UX Engineer', department: 'developer' },
  { id: 'backend', label: 'Back End & API Engineer', department: 'developer' },
  { id: 'qa', label: 'QA Automation & Security Scanner', department: 'writer' },
  { id: 'intern', label: 'Git Safety & Docs Intern', department: 'writer' },
  { id: 'reviewer', label: 'Code Reviewer & Quality Auditor', department: 'writer' },
];

export const AgentSettingsTab: React.FC = () => {
  const { agents, updateAgent } = useOfficeStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<AgentDepartment | 'all'>('all');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [customModelInputs, setCustomModelInputs] = useState<Record<string, string>>({});
  const [availableModels, setAvailableModels] = useState<RouterModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [activeModelPickerAgentId, setActiveModelPickerAgentId] = useState<string | null>(null);
  const [modelSearchQuery, setModelSearchQuery] = useState('');

  // Fetch all 9Router models on load
  const loadModels = async () => {
    setLoadingModels(true);
    const models = await fetchAvailableModels();
    if (models.length > 0) {
      setAvailableModels(models);
    }
    setLoadingModels(false);
  };

  useEffect(() => {
    loadModels();
  }, []);

  const showSavedNotice = (agentName: string) => {
    setSavedNotice(`Pengaturan untuk "${agentName}" berhasil disimpan!`);
    setTimeout(() => {
      setSavedNotice(null);
    }, 2800);
  };

  const handleNameChange = (agentId: string, newName: string) => {
    updateAgent(agentId, { name: newName });
    const target = agents.find((a) => a.id === agentId);
    if (target) showSavedNotice(newName || target.name);
  };

  const handleTitleChange = (agentId: string, newTitle: string) => {
    updateAgent(agentId, { title: newTitle });
    const target = agents.find((a) => a.id === agentId);
    if (target) showSavedNotice(target.name);
  };

  const handleRoleChange = (agentId: string, newRole: AgentRole) => {
    const roleMeta = ROLE_OPTIONS.find((r) => r.id === newRole);
    updateAgent(agentId, {
      role: newRole,
      department: roleMeta?.department || 'developer',
      title: roleMeta?.label.split(' (')[0] || newRole,
    });
    const target = agents.find((a) => a.id === agentId);
    if (target) showSavedNotice(`${target.name} diubah menjadi role ${roleMeta?.label || newRole}`);
  };

  const handleModelChange = (agentId: string, newModel: string) => {
    updateAgent(agentId, { model: newModel });
    const target = agents.find((a) => a.id === agentId);
    if (target) showSavedNotice(target.name);
  };

  // Quick Preset Actions
  const applyAllModelPreset = (modelId: string, label: string) => {
    agents.forEach((ag) => {
      updateAgent(ag.id, { model: modelId });
    });
    setSavedNotice(`Semua agen berhasil disetel ke ${label}!`);
    setTimeout(() => setSavedNotice(null), 3000);
  };

  const resetAllToDefaults = () => {
    agents.forEach((ag) => {
      let defaultModel = 'Daily';
      if (ag.role === 'product_manager' || ag.department === 'orchestra') defaultModel = 'Architect';
      else if (ag.role === 'backend') defaultModel = 'Coding_Specialist';
      else if (ag.role === 'frontend') defaultModel = 'Daily';
      else if (ag.role === 'intern') defaultModel = 'Fast';
      else if (ag.role === 'qa') defaultModel = 'Daily';
      else if (ag.role === 'reviewer') defaultModel = 'Reviewer';
      else if (ag.role === 'researcher') defaultModel = 'Architect';

      updateAgent(ag.id, { model: defaultModel });
    });
    setSavedNotice('Semua model API berhasil dikembalikan ke preset optimal 9Router!');
    setTimeout(() => setSavedNotice(null), 3000);
  };

  const filteredAgents = agents.filter((agent) => {
    const matchesDept = selectedDept === 'all' || agent.department === selectedDept;
    const matchesSearch =
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesSearch;
  });

  return (
    <div className="min-h-full w-full bg-zinc-950 p-6 md:p-8 text-zinc-100 font-mono text-xs selection:bg-zinc-800">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200 shrink-0">
              <Cpu className="w-4 h-4 text-zinc-300" />
            </div>
            <div>
              <h1 className="font-semibold text-xs tracking-wide text-zinc-100 uppercase">
                Konfigurasi Model & Agen AI
              </h1>
              <p className="mt-0.5 font-mono text-[11px] text-zinc-400">
                Ganti nama avatar dan sesuaikan API model AI (LLM) untuk masing-masing agen dalam sistem virtual workspace.
              </p>
            </div>
          </div>

          {/* Refresh 9Router Models */}
          <div className="flex items-center gap-2">
            <button
              onClick={loadModels}
              disabled={loadingModels}
              className="h-8 rounded-md bg-zinc-900 border border-zinc-700 px-2.5 font-mono text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Ambil ulang daftar model langsung dari 9Router"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingModels ? 'animate-spin' : ''}`} />
              <span>{availableModels.length > 0 ? `${availableModels.length} Model Aktif` : 'Sinkron 9Router'}</span>
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {savedNotice && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs font-mono animate-in fade-in slide-in-from-top-2">
            <Check className="h-4 w-4 text-zinc-100 shrink-0" />
            <span>{savedNotice}</span>
          </div>
        )}

        {/* Filters & Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
          {/* Department Filter Segmented Control */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 rounded-xl border border-zinc-700 bg-zinc-900 p-1 text-xs">
            <button
              onClick={() => setSelectedDept('all')}
              className={`h-8 rounded-lg px-3 font-mono text-[11px] font-medium transition cursor-pointer flex items-center justify-center ${
                selectedDept === 'all'
                  ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                  : 'bg-zinc-950 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
              }`}
            >
              Semua ({agents.length})
            </button>
            <button
              onClick={() => setSelectedDept('orchestra')}
              className={`h-8 rounded-lg px-3 font-mono text-[11px] font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                selectedDept === 'orchestra'
                  ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                  : 'bg-zinc-950 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Orchestra ({agents.filter((a) => a.department === 'orchestra').length})
            </button>
            <button
              onClick={() => setSelectedDept('developer')}
              className={`h-8 rounded-lg px-3 font-mono text-[11px] font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                selectedDept === 'developer'
                  ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                  : 'bg-zinc-950 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
              }`}
            >
              <Code2 className="h-3.5 w-3.5" />
              Developer ({agents.filter((a) => a.department === 'developer').length})
            </button>
            <button
              onClick={() => setSelectedDept('writer')}
              className={`h-8 rounded-lg px-3 font-mono text-[11px] font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                selectedDept === 'writer'
                  ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                  : 'bg-zinc-950 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Writer ({agents.filter((a) => a.department === 'writer').length})
            </button>
          </div>

          {/* Search box */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau model AI..."
              className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 pl-8 pr-3 font-mono text-xs text-zinc-100 placeholder:text-zinc-600 transition focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
          </div>
        </div>

        {/* Grid of Agent Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAgents.map((agent) => {
            const isOrchestra = agent.department === 'orchestra';
            const currentPreset = PRESET_MODELS.find(
              (m) => m.id.toLowerCase() === agent.model.toLowerCase()
            );
            const isCustom = !currentPreset;

            return (
              <div
                key={agent.id}
                className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 transition relative overflow-hidden hover:border-zinc-700 hover:bg-zinc-900/70 font-mono text-xs shadow-sm"
              >
                {/* Accent top pill */}
                {isOrchestra && (
                  <div className="absolute top-0 right-0 px-2 py-0.5 rounded-bl-lg bg-zinc-100 text-zinc-950 font-mono text-[9px] font-medium uppercase tracking-wider">
                    Orchestra Maestro
                  </div>
                )}

                <div className="space-y-3.5">
                  {/* Avatar & Department Row */}
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 text-zinc-300 font-bold text-sm shadow-sm">
                      {isOrchestra ? (
                        <Layers className="h-4 w-4" />
                      ) : agent.department === 'developer' ? (
                        <Code2 className="h-4 w-4" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">
                          {agent.department.toUpperCase()} POD
                        </span>
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${
                            agent.status === 'idle'
                              ? 'bg-zinc-500'
                              : agent.status === 'blocked'
                              ? 'bg-amber-400 animate-pulse'
                              : 'bg-emerald-400 animate-ping'
                          }`}
                        />
                      </div>
                      <p className="text-[11px] text-zinc-500 truncate">
                        ID: <span className="font-mono text-zinc-400">{agent.id}</span>
                      </p>
                    </div>
                  </div>

                  {/* Field 1: Nama Agen */}
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                      Nama AI
                    </label>
                    <input
                      type="text"
                      defaultValue={agent.name}
                      onBlur={(e) => {
                        const val = e.target.value.trim();
                        if (val && val !== agent.name) {
                          handleNameChange(agent.id, val);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                      className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 font-mono text-xs text-zinc-100 placeholder:text-zinc-600 transition focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                      placeholder="Masukkan nama AI..."
                    />
                  </div>

                  {/* Field 2: Role / Peran Tim */}
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                      Role Tim
                    </label>
                    <select
                      value={agent.role}
                      onChange={(e) => handleRoleChange(agent.id, e.target.value as AgentRole)}
                      className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 font-mono text-xs text-zinc-300 transition focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                    >
                      <option value="product_manager">Product Manager (PM)</option>
                      <option value="researcher">AI Research Specialist (Obsidian & Docs)</option>
                      <option value="frontend">Front End & UI/UX Engineer</option>
                      <option value="backend">Back End & API Engineer</option>
                      <option value="qa">QA Automation & Security Scanner</option>
                      <option value="intern">Software Engineer Intern (Git & PR)</option>
                      <option value="reviewer">Code Reviewer & Quality Auditor</option>
                    </select>
                  </div>

                  {/* Field 3: Jabatan / Spesialisasi Custom Text */}
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                      Jabatan / Spesialisasi
                    </label>
                    <input
                      type="text"
                      defaultValue={agent.title}
                      onBlur={(e) => {
                        const val = e.target.value.trim();
                        if (val && val !== agent.title) {
                          handleTitleChange(agent.id, val);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                      className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 font-mono text-xs text-zinc-100 placeholder:text-zinc-600 transition focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                      placeholder="Masukkan jabatan..."
                    />
                  </div>

                  {/* Field 4: API Model AI */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                        API Model AI
                      </label>
                      <span className="text-[10px] font-mono text-zinc-500 truncate max-w-[130px]">
                        {agent.model}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveModelPickerAgentId(agent.id);
                        setModelSearchQuery('');
                      }}
                      className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 font-mono text-xs text-zinc-200 transition hover:bg-zinc-800 hover:border-zinc-500 flex items-center justify-between cursor-pointer group"
                    >
                      <span className="truncate font-medium">{agent.model}</span>
                      <div className="flex items-center gap-1.5 text-zinc-400 group-hover:text-zinc-200 shrink-0">
                        <Search className="h-3 w-3" />
                        <span className="text-[10px] uppercase font-mono tracking-wider">PILIH</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Footer Metrics & Current Activity */}
                <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-500">Tokens:</span>
                    <span className="text-zinc-300">{(agent.metrics.tokensGenerated / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-500">Akurasi:</span>
                    <span className="text-zinc-200 font-medium">{agent.metrics.accuracyScore}%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-500">Selesai:</span>
                    <span className="text-zinc-300">{agent.metrics.tasksCompleted}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredAgents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
            <Bot className="h-10 w-10 text-zinc-400 mb-3" />
            <h3 className="text-sm font-semibold text-zinc-200">Tidak ada agen ditemukan</h3>
            <p className="text-xs text-zinc-400 max-w-sm mt-1">
              Coba sesuaikan kata kunci pencarian atau ubah filter departemen di atas.
            </p>
          </div>
        )}

        {/* Informational Guidance Card */}
        <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 text-xs text-zinc-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-zinc-300 shrink-0" />
            <span>
              Perubahan nama dan model API tersinkronisasi secara real-time ke visual 3D, papan Kanban, dan log tugas.
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400 shrink-0">
            <span>TOTAL: {agents.length} AGENTS ACTIVE</span>
          </div>
        </div>
      </div>

      {/* --- OPSI A: SEARCHABLE MODEL PICKER MODAL (SPOTLIGHT PALETTE) --- */}
      {activeModelPickerAgentId && (() => {
        const targetAgent = agents.find((a) => a.id === activeModelPickerAgentId);
        if (!targetAgent) return null;

        // Kumpulkan semua model (smart router aliases + 9router models)
        const smartAliases = [
          { id: 'Daily', provider: '9Router Alias', desc: 'Fast & Smart General (Daily Coding/Tasks)' },
          { id: 'Architect', provider: '9Router Alias', desc: 'High Reasoning & Architecture Specs' },
          { id: 'Coding_Specialist', provider: '9Router Alias', desc: 'Deep Code Generation & Refactor' },
          { id: 'Reviewer', provider: '9Router Alias', desc: 'Code Review & QA Boundary Audits' },
          { id: 'Fast', provider: '9Router Alias', desc: 'Ultra-low Latency Quick Operations' },
          { id: 'Reasoning', provider: '9Router Alias', desc: 'Deep Math & Logic Proof Reasoning' },
          { id: 'Deep_Reviewer', provider: '9Router Alias', desc: 'Heavy Exhaustive Security Audits' },
          { id: 'Opus', provider: '9Router Alias', desc: 'High Context Synthesis' },
        ];

        // Format router models
        const allDynamicModels = availableModels.length > 0
          ? availableModels.map((m) => ({
              id: m.id,
              provider: m.owned_by ? m.owned_by.toUpperCase() : '9ROUTER',
              desc: `Gateway Model ID: ${m.id}`,
            }))
          : PRESET_MODELS.map((p) => ({
              id: p.id,
              provider: p.provider.toUpperCase(),
              desc: p.tier,
            }));

        const unifiedModels = [
          ...smartAliases,
          ...allDynamicModels.filter((m) => !smartAliases.some((s) => s.id.toLowerCase() === m.id.toLowerCase())),
        ];

        // Filter berdasarkan pencarian keyword
        const query = modelSearchQuery.trim().toLowerCase();
        const filteredList = unifiedModels.filter((m) =>
          m.id.toLowerCase().includes(query) ||
          m.provider.toLowerCase().includes(query) ||
          m.desc.toLowerCase().includes(query)
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 font-mono">
            <div className="bg-zinc-950 border border-zinc-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col font-mono text-xs max-h-[85vh]">
              {/* Header */}
              <div className="px-5 py-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200 shrink-0">
                    <Search className="w-4 h-4 text-zinc-300" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-xs tracking-wide text-zinc-100 uppercase">
                      Pilih Model AI — {targetAgent.name}
                    </h2>
                    <p className="mt-0.5 font-mono text-[11px] text-zinc-400">
                      Model aktif saat ini: <span className="text-emerald-400 font-semibold">{targetAgent.model}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveModelPickerAgentId(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-900 text-zinc-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Bar Input */}
              <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    autoFocus
                    value={modelSearchQuery}
                    onChange={(e) => setModelSearchQuery(e.target.value)}
                    placeholder="Cari model misal: claude, gemini, deepseek, gpt-4o, flash, qwen..."
                    className="h-10 w-full rounded-xl border border-zinc-700 bg-zinc-950 pl-9 pr-4 font-mono text-xs text-zinc-100 placeholder:text-zinc-600 transition focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                  />
                  {modelSearchQuery && (
                    <button
                      onClick={() => setModelSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2 text-[10px] text-zinc-400 font-mono">
                  <span>Ditemukan: <span className="text-zinc-200">{filteredList.length}</span> opsi</span>
                  <span>{availableModels.length > 0 ? `${availableModels.length} Model Terkoneksi 9Router` : 'Fallback Mode'}</span>
                </div>
              </div>

              {/* List of Models */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5 max-h-[420px]">
                {/* Fallback opsi jika query tidak ada di list: izinkan user menggunakan custom input */}
                {query && !filteredList.some((m) => m.id.toLowerCase() === query) && (
                  <button
                    onClick={() => {
                      handleModelChange(targetAgent.id, modelSearchQuery.trim());
                      setActiveModelPickerAgentId(null);
                    }}
                    className="w-full p-3 rounded-xl border border-dashed border-emerald-700/60 bg-emerald-950/20 hover:bg-emerald-950/40 text-left transition flex items-center justify-between cursor-pointer group"
                  >
                    <div>
                      <div className="text-xs font-semibold text-emerald-400 flex items-center gap-2">
                        <span>Gunakan Custom Model String: "{modelSearchQuery.trim()}"</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">Terapkan nama model custom ini langsung ke {targetAgent.name}</p>
                    </div>
                    <span className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono">
                      APPLY
                    </span>
                  </button>
                )}

                {filteredList.map((m) => {
                  const isCurrent = targetAgent.model.toLowerCase() === m.id.toLowerCase();
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        handleModelChange(targetAgent.id, m.id);
                        setActiveModelPickerAgentId(null);
                      }}
                      className={`w-full p-2.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer group ${
                        isCurrent
                          ? 'bg-zinc-100 text-zinc-950 border-zinc-200 shadow-sm'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-200 hover:bg-zinc-900 hover:border-zinc-700'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold text-xs truncate ${isCurrent ? 'text-zinc-950' : 'text-zinc-100'}`}>
                            {m.id}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider shrink-0 ${
                              isCurrent
                                ? 'bg-zinc-300 text-zinc-900 font-bold'
                                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                            }`}
                          >
                            {m.provider}
                          </span>
                        </div>
                        <p className={`text-[10px] mt-0.5 truncate ${isCurrent ? 'text-zinc-700' : 'text-zinc-400'}`}>
                          {m.desc}
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center">
                        {isCurrent ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-800">
                            <Check className="w-3.5 h-3.5" /> AKTIF
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300 font-mono">
                            PILIH →
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}

                {filteredList.length === 0 && !query && (
                  <div className="py-12 text-center text-zinc-500">
                    Tidak ada model tersedia.
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
