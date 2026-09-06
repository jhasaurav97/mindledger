import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { User } from 'firebase/auth';
import {
  Network,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  Edit3,
  Archive,
  Trash2,
  ExternalLink,
  Info,
  ShieldCheck,
  Target,
  Flame,
  HelpCircle,
  Compass,
  Zap,
  Trophy,
  Repeat,
  X,
  Plus,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Check,
  MapPin,
} from 'lucide-react';
import type {
  InteractionEntry,
  MemoryNode,
  MemoryRelationship,
  MemoryNodeType,
  MemoryRelationshipType,
  MemoryNodeStatus,
  ExtractMemoryGraphResponse,
} from '../types';
import {
  saveMemoryGraphBatch,
  saveMemoryNode,
  updateMemoryNodeStatus,
  deleteMemoryNode,
  subscribeToUserMemoryGraph,
} from '../lib/firebase';

interface MemoryGraphViewProps {
  user: User | null;
  entries: InteractionEntry[];
  onSelectEntry: (entry: InteractionEntry) => void;
  onNewEntry: () => void;
}

// Visual theme configurations for different memory types
export const MEMORY_TYPE_CONFIG: Record<
  MemoryNodeType,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    bg: string;
    border: string;
    text: string;
    accent: string;
    badgeBg: string;
    badgeText: string;
    glow: string;
  }
> = {
  Goal: {
    label: 'Goal',
    icon: Target,
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    text: 'text-emerald-900',
    accent: '#059669',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800',
    glow: 'rgba(16, 185, 129, 0.25)',
  },
  Theme: {
    label: 'Theme',
    icon: Compass,
    bg: 'bg-purple-50',
    border: 'border-purple-300',
    text: 'text-purple-900',
    accent: '#7c3aed',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-800',
    glow: 'rgba(124, 58, 237, 0.25)',
  },
  Challenge: {
    label: 'Challenge',
    icon: AlertCircle,
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    text: 'text-amber-900',
    accent: '#d97706',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    glow: 'rgba(217, 119, 6, 0.25)',
  },
  Decision: {
    label: 'Decision',
    icon: HelpCircle,
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-900',
    accent: '#2563eb',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800',
    glow: 'rgba(37, 99, 235, 0.25)',
  },
  Action: {
    label: 'Action',
    icon: Zap,
    bg: 'bg-teal-50',
    border: 'border-teal-300',
    text: 'text-teal-900',
    accent: '#0d9488',
    badgeBg: 'bg-teal-100',
    badgeText: 'text-teal-800',
    glow: 'rgba(13, 148, 136, 0.25)',
  },
  Win: {
    label: 'Win',
    icon: Trophy,
    bg: 'bg-amber-50',
    border: 'border-yellow-400',
    text: 'text-amber-950',
    accent: '#b45309',
    badgeBg: 'bg-yellow-100',
    badgeText: 'text-amber-900',
    glow: 'rgba(234, 179, 8, 0.25)',
  },
  Habit: {
    label: 'Habit',
    icon: Repeat,
    bg: 'bg-rose-50',
    border: 'border-rose-300',
    text: 'text-rose-900',
    accent: '#e11d48',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-800',
    glow: 'rgba(225, 29, 72, 0.25)',
  },
};

const ALL_TYPES: MemoryNodeType[] = ['Goal', 'Theme', 'Challenge', 'Decision', 'Action', 'Win', 'Habit'];

export const MemoryGraphView: React.FC<MemoryGraphViewProps> = ({
  user,
  entries,
  onSelectEntry,
  onNewEntry,
}) => {
  // Graph Data State
  const [nodes, setNodes] = useState<MemoryNode[]>([]);
  const [relationships, setRelationships] = useState<MemoryRelationship[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Extraction State
  const [extracting, setExtracting] = useState(false);
  const [extractStep, setExtractStep] = useState<string>('');
  const [extractProgress, setExtractProgress] = useState(0);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractSuccessMsg, setExtractSuccessMsg] = useState<string | null>(null);

  // View & Filter State
  const [viewMode, setViewMode] = useState<'graph' | 'timeline'>('graph');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Node & Detail Panel
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNode, setEditingNode] = useState<MemoryNode | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState<MemoryNodeStatus>('active');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Canvas Viewport (Pan & Zoom)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const canvasRef = useRef<SVGSVGElement | null>(null);

  // 1. Subscribe to real-time memory graph from Firestore
  useEffect(() => {
    if (!user) {
      setNodes([]);
      setRelationships([]);
      setLoadingInitial(false);
      return;
    }

    setLoadingInitial(true);
    const unsubscribe = subscribeToUserMemoryGraph(
      user.uid,
      (data) => {
        setNodes(data.nodes);
        setRelationships(data.relationships);
        setLoadingInitial(false);
      },
      (err) => {
        console.error('Error in memory graph subscription:', err);
        setLoadingInitial(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // 2. Compute filtered nodes & layout
  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      if (selectedTypeFilter !== 'all' && node.type !== selectedTypeFilter) {
        return false;
      }
      if (selectedStatusFilter !== 'all' && node.status !== selectedStatusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = node.title.toLowerCase().includes(q);
        const matchDesc = node.description.toLowerCase().includes(q);
        const matchType = node.type.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchType) return false;
      }
      return true;
    });
  }, [nodes, selectedTypeFilter, selectedStatusFilter, searchQuery]);

  const activeNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  const filteredRelationships = useMemo(() => {
    return relationships.filter(
      (rel) => activeNodeIds.has(rel.sourceNodeId) && activeNodeIds.has(rel.targetNodeId)
    );
  }, [relationships, activeNodeIds]);

  // Selected node object
  const selectedNode = useMemo(() => {
    return nodes.find((n) => n.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  // Connected relationships for selected node
  const selectedNodeRelationships = useMemo(() => {
    if (!selectedNodeId) return [];
    return relationships.filter(
      (rel) => rel.sourceNodeId === selectedNodeId || rel.targetNodeId === selectedNodeId
    );
  }, [relationships, selectedNodeId]);

  // Connected nodes map for visual highlighting
  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const set = new Set<string>([selectedNodeId]);
    selectedNodeRelationships.forEach((rel) => {
      set.add(rel.sourceNodeId);
      set.add(rel.targetNodeId);
    });
    return set;
  }, [selectedNodeId, selectedNodeRelationships]);

  // 3. Initialize or update layout positions
  useEffect(() => {
    if (nodes.length === 0) return;

    setNodePositions((prev) => {
      const updated = { ...prev };
      const width = 800;
      const height = 550;
      const centerX = width / 2;
      const centerY = height / 2;

      // Group nodes by type for organic clustering
      const types = ALL_TYPES;
      const typeAngles: Record<string, number> = {};
      types.forEach((t, i) => {
        typeAngles[t] = (i / types.length) * 2 * Math.PI;
      });

      nodes.forEach((node, index) => {
        if (!updated[node.id]) {
          const baseAngle = typeAngles[node.type] || (index / nodes.length) * 2 * Math.PI;
          const radius = 160 + (index % 3) * 60 + Math.random() * 40;
          const jitterAngle = baseAngle + ((index % 4) - 1.5) * 0.35;

          updated[node.id] = {
            x: centerX + Math.cos(jitterAngle) * radius,
            y: centerY + Math.sin(jitterAngle) * radius,
          };
        }
      });

      return updated;
    });
  }, [nodes]);

  // 4. Memory Graph Extraction Trigger
  const handleExtractGraph = async () => {
    if (!user) return;
    if (entries.length === 0) {
      setExtractError('You do not have any saved journal entries yet. Write a reflection first in Reflection Canvas.');
      return;
    }

    setExtracting(true);
    setExtractError(null);
    setExtractSuccessMsg(null);
    setExtractProgress(15);
    setExtractStep('Connecting to authenticated isolation store...');

    try {
      const idToken = await user.getIdToken(true);
      setExtractProgress(35);
      setExtractStep('Analyzing authentic reflections with Gemini 3.6 Flash...');

      const response = await fetch('/api/memory-graph/extract', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entries,
          cachedEntries: entries,
        }),
      });

      setExtractProgress(70);
      setExtractStep('Validating evidence grounding & relationship consistency...');

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with status ${response.status}`);
      }

      const result: ExtractMemoryGraphResponse = await response.json();
      setExtractProgress(90);
      setExtractStep('Persisting structured memory graph under your user profile...');

      // Batch save into Firestore
      await saveMemoryGraphBatch(user.uid, result.nodes, result.relationships);

      setExtractProgress(100);
      setExtractSuccessMsg(
        `Memory Graph updated! Discovered ${result.extractedCount} verified memory nodes and ${result.relationshipsCount} semantic relationships.`
      );

      setTimeout(() => {
        setExtractSuccessMsg(null);
      }, 6000);
    } catch (err: any) {
      console.error('Error extracting memory graph:', err);
      setExtractError(err?.message || 'Failed to extract memory graph. Please try again.');
    } finally {
      setExtracting(false);
      setExtractStep('');
      setExtractProgress(0);
    }
  };

  // Node editing handlers
  const handleStartEdit = (node: MemoryNode) => {
    setEditingNode(node);
    setEditTitle(node.title);
    setEditDesc(node.description);
    setEditStatus(node.status);
  };

  const handleSaveEdit = async () => {
    if (!user || !editingNode) return;
    if (!editTitle.trim()) return;

    setIsSavingEdit(true);
    try {
      const updatedNode: MemoryNode = {
        ...editingNode,
        title: editTitle.trim(),
        description: editDesc.trim(),
        status: editStatus,
        updatedAt: new Date().toISOString(),
      };

      await saveMemoryNode(user.uid, updatedNode);
      setEditingNode(null);
    } catch (err) {
      console.error('Error saving node edit:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleToggleArchive = async (node: MemoryNode) => {
    if (!user) return;
    const newStatus: MemoryNodeStatus = node.status === 'archived' ? 'active' : 'archived';
    try {
      await updateMemoryNodeStatus(user.uid, node.id, newStatus);
    } catch (err) {
      console.error('Error updating node status:', err);
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!user) return;
    try {
      await deleteMemoryNode(user.uid, nodeId, relationships);
      setDeleteConfirmId(null);
      if (selectedNodeId === nodeId) {
        setSelectedNodeId(null);
      }
    } catch (err) {
      console.error('Error deleting node:', err);
    }
  };

  // Canvas Drag & Pan Handlers
  const handleMouseDownCanvas = (e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as HTMLElement).tagName === 'svg' || (e.target as HTMLElement).id === 'graph-bg') {
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    } else if (draggingNodeId) {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const rawX = (e.clientX - rect.left - pan.x) / zoom;
      const rawY = (e.clientY - rect.top - pan.y) / zoom;

      setNodePositions((prev) => ({
        ...prev,
        [draggingNodeId]: { x: Math.max(40, Math.min(1160, rawX)), y: Math.max(40, Math.min(760, rawY)) },
      }));
    }
  };

  const handleMouseUpCanvas = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner / Header */}
      <div className="bg-white dark:bg-[#131b2e] rounded-2xl p-6 border border-slate-200 dark:border-slate-800/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-700 dark:text-indigo-300">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Personal Memory Graph</h1>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                  Evidence-Grounded
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Visualizing how your goals, decisions, themes, challenges, and wins evolve across reflections.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* View toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium">
            <button
              id="view-mode-graph-btn"
              onClick={() => setViewMode('graph')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'graph' ? 'bg-white dark:bg-[#131b2e] text-slate-900 dark:text-slate-100 shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Interactive Graph</span>
            </button>
            <button
              id="view-mode-timeline-btn"
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'timeline' ? 'bg-white dark:bg-[#131b2e] text-slate-900 dark:text-slate-100 shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Evolution Timeline</span>
            </button>
          </div>

          <button
            id="extract-memory-graph-btn"
            onClick={handleExtractGraph}
            disabled={extracting || entries.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed shadow-xs transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${extracting ? 'animate-spin' : ''}`} />
            <span>{extracting ? 'Synthesizing Graph...' : nodes.length > 0 ? 'Refresh Memory Graph' : 'Build Memory Graph'}</span>
          </button>
        </div>
      </div>

      {/* Extraction In-Progress Progress Bar */}
      {extracting && (
        <div className="bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 rounded-xl p-4 space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between text-xs font-semibold text-indigo-900 dark:text-indigo-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              <span>{extractStep}</span>
            </div>
            <span>{extractProgress}%</span>
          </div>
          <div className="w-full bg-indigo-200 dark:bg-indigo-900 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${extractProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Success / Error Alerts */}
      {extractSuccessMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 text-sm rounded-xl p-4 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{extractSuccessMsg}</span>
          </div>
          <button onClick={() => setExtractSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900 dark:hover:text-emerald-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {extractError && (
        <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200 text-sm rounded-xl p-4 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{extractError}</span>
          </div>
          <button onClick={() => setExtractError(null)} className="text-rose-700 hover:text-rose-900 dark:hover:text-rose-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Dashboard Body */}
      {loadingInitial ? (
        <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800/90 p-16 flex flex-col items-center justify-center text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Loading your personal memory graph...</p>
        </div>
      ) : nodes.length === 0 ? (
        // Empty State
        <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800/90 p-12 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto">
            <Network className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">No Memory Graph Synthesized Yet</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {entries.length === 0
                ? "You haven't recorded any journal reflections yet. Begin a reflective session to start building your evidence-grounded memory graph."
                : `You have ${entries.length} authentic journal reflection${entries.length > 1 ? 's' : ''} ready. MindLedger can extract your recurring Goals, Themes, Challenges, Decisions, and Wins into an interactive memory graph.`}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3">
            {entries.length === 0 ? (
              <button
                id="empty-state-new-entry-btn"
                onClick={onNewEntry}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Write First Reflection</span>
              </button>
            ) : (
              <button
                id="empty-state-build-graph-btn"
                onClick={handleExtractGraph}
                disabled={extracting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Build Memory Graph from Reflections</span>
              </button>
            )}
          </div>

          {/* Supported Types Explainer */}
          <div className="pt-8 border-t border-slate-100 dark:border-slate-800 max-w-2xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            {ALL_TYPES.map((type) => {
              const cfg = MEMORY_TYPE_CONFIG[type];
              const IconComp = cfg.icon;
              return (
                <div key={type} className={`p-3 rounded-xl border ${cfg.border} ${cfg.bg} dark:bg-slate-800/80 dark:border-slate-700 space-y-1`}>
                  <div className="flex items-center gap-1.5">
                    <IconComp className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{cfg.label}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    {type === 'Goal' && 'Aspirations & milestones'}
                    {type === 'Theme' && 'Core life motifs & mindsets'}
                    {type === 'Challenge' && 'Blockers & obstacles'}
                    {type === 'Decision' && 'Resolved crossroads'}
                    {type === 'Action' && 'Next practical steps'}
                    {type === 'Win' && 'Breakthroughs & victories'}
                    {type === 'Habit' && 'Continuous routines'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // Populated Memory Graph Layout
        <div className="space-y-6">
          {/* Filter & Search Bar */}
          <div className="bg-white dark:bg-[#131b2e] p-4 rounded-2xl border border-slate-200 dark:border-slate-800/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Type filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <button
                id="filter-type-all"
                onClick={() => setSelectedTypeFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedTypeFilter === 'all'
                    ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                All Nodes ({nodes.length})
              </button>

              {ALL_TYPES.map((type) => {
                const count = nodes.filter((n) => n.type === type).length;
                if (count === 0) return null;
                const cfg = MEMORY_TYPE_CONFIG[type];
                const IconComp = cfg.icon;
                const isSelected = selectedTypeFilter === type;

                return (
                  <button
                    key={type}
                    id={`filter-type-${type.toLowerCase()}`}
                    onClick={() => setSelectedTypeFilter(isSelected ? 'all' : type)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border cursor-pointer ${
                      isSelected
                        ? `${cfg.bg} dark:bg-indigo-950/60 ${cfg.border} dark:border-indigo-700/80 ${cfg.text} dark:text-indigo-300 ring-2 ring-indigo-500/20 shadow-xs`
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <IconComp className="w-3.5 h-3.5" />
                    <span>{cfg.label}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/5 dark:bg-white/10 font-bold">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="search-memory-graph-input"
                type="text"
                placeholder="Search memory titles & themes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Main Content Area: Graph Canvas or Timeline View */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left/Center Visual Canvas */}
            <div className={`space-y-4 ${selectedNode ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
              {viewMode === 'graph' ? (
                <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800/90 shadow-xs overflow-hidden relative">
                  {/* Canvas Controls Header */}
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                    <button
                      onClick={() => setZoom((z) => Math.min(2.0, z + 0.2))}
                      title="Zoom In"
                      className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
                      title="Zoom Out"
                      className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <button
                      onClick={resetView}
                      title="Reset View"
                      className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Canvas Legend */}
                  <div className="absolute bottom-3 left-3 z-10 hidden sm:flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 shadow-xs">
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                    <span>Click a node to inspect evidence • Drag nodes to customize layout</span>
                  </div>

                  {/* Interactive SVG Network */}
                  <svg
                    ref={canvasRef}
                    id="memory-graph-canvas"
                    className="w-full h-[580px] cursor-grab active:cursor-grabbing select-none bg-radial from-slate-50 to-white dark:from-[#0d1424] dark:to-[#131b2e]"
                    onMouseDown={handleMouseDownCanvas}
                    onMouseMove={handleMouseMoveCanvas}
                    onMouseUp={handleMouseUpCanvas}
                  >
                    <rect id="graph-bg" width="100%" height="100%" fill="transparent" />

                    <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                      {/* 1. Relationship Links */}
                      {filteredRelationships.map((rel) => {
                        const sourcePos = nodePositions[rel.sourceNodeId];
                        const targetPos = nodePositions[rel.targetNodeId];
                        if (!sourcePos || !targetPos) return null;

                        const isHighlighted =
                          selectedNodeId &&
                          (rel.sourceNodeId === selectedNodeId || rel.targetNodeId === selectedNodeId);

                        // Midpoint for relationship label
                        const midX = (sourcePos.x + targetPos.x) / 2;
                        const midY = (sourcePos.y + targetPos.y) / 2;

                        return (
                          <g key={rel.id} className="transition-opacity duration-300">
                            <line
                              x1={sourcePos.x}
                              y1={sourcePos.y}
                              x2={targetPos.x}
                              y2={targetPos.y}
                              stroke={isHighlighted ? '#6366f1' : '#94a3b8'}
                              strokeWidth={isHighlighted ? 2.5 : 1.5}
                              strokeDasharray={rel.relationshipType === 'blocks' ? '4 3' : undefined}
                              opacity={selectedNodeId ? (isHighlighted ? 1 : 0.25) : 0.8}
                            />
                            {/* Relationship Label Pill */}
                            <g transform={`translate(${midX}, ${midY})`}>
                              <rect
                                x="-32"
                                y="-10"
                                width="64"
                                height="20"
                                rx="10"
                                fill="#ffffff"
                                stroke={isHighlighted ? '#818cf8' : '#e2e8f0'}
                                strokeWidth="1"
                                className="shadow-2xs"
                              />
                              <text
                                textAnchor="middle"
                                y="3"
                                fill={isHighlighted ? '#4338ca' : '#64748b'}
                                fontSize="9"
                                fontWeight="600"
                              >
                                {rel.relationshipType.replace('_', ' ')}
                              </text>
                            </g>
                          </g>
                        );
                      })}

                      {/* 2. Memory Nodes */}
                      {filteredNodes.map((node) => {
                        const pos = nodePositions[node.id] || { x: 400, y: 300 };
                        const cfg = MEMORY_TYPE_CONFIG[node.type];
                        const isSelected = selectedNodeId === node.id;
                        const isConnected = connectedNodeIds.has(node.id);
                        const isDimmed = selectedNodeId && !isConnected;

                        return (
                          <g
                            key={node.id}
                            id={`graph-node-${node.id}`}
                            transform={`translate(${pos.x}, ${pos.y})`}
                            className="cursor-pointer transition-all duration-200"
                            opacity={isDimmed ? 0.35 : 1}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setDraggingNodeId(node.id);
                            }}
                            onClick={() => {
                              setSelectedNodeId(node.id === selectedNodeId ? null : node.id);
                            }}
                          >
                            {/* Outer Glow Halo if selected */}
                            {isSelected && (
                              <circle r="44" fill={cfg.glow} className="animate-pulse" />
                            )}

                            {/* Node Body Card */}
                            <circle
                              r="32"
                              fill={isSelected ? '#1e293b' : '#ffffff'}
                              stroke={isSelected ? cfg.accent : '#cbd5e1'}
                              strokeWidth={isSelected ? 3 : 2}
                              className="drop-shadow-xs transition-colors"
                            />

                            {/* Type Icon */}
                            <g transform="translate(-10, -16)">
                              <cfg.icon
                                className={`w-5 h-5 ${
                                  isSelected ? 'text-white' : cfg.text
                                }`}
                              />
                            </g>

                            {/* Type Tag text inside node */}
                            <text
                              textAnchor="middle"
                              y="10"
                              fill={isSelected ? '#94a3b8' : '#64748b'}
                              fontSize="8"
                              fontWeight="700"
                              letterSpacing="0.5"
                            >
                              {node.type.toUpperCase()}
                            </text>

                            {/* Node Title Below */}
                            <g transform="translate(0, 46)">
                              <rect
                                x="-60"
                                y="-8"
                                width="120"
                                height="22"
                                rx="6"
                                fill={isSelected ? '#0f172a' : '#ffffff'}
                                stroke={isSelected ? '#334155' : '#e2e8f0'}
                                strokeWidth="1"
                                className="shadow-2xs"
                              />
                              <text
                                textAnchor="middle"
                                y="7"
                                fill={isSelected ? '#ffffff' : '#1e293b'}
                                fontSize="10"
                                fontWeight="600"
                              >
                                {node.title.length > 18 ? `${node.title.slice(0, 16)}...` : node.title}
                              </text>
                            </g>
                          </g>
                        );
                      })}
                    </g>
                  </svg>
                </div>
              ) : (
                // Timeline Evolution View (Accessible & Mobile-friendly)
                <div className="space-y-4">
                  <div className="bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800/90 p-6 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Chronological Evolution of Memories</h2>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{filteredNodes.length} memories tracked</span>
                    </div>

                    <div className="space-y-3">
                      {filteredNodes.map((node) => {
                        const cfg = MEMORY_TYPE_CONFIG[node.type];
                        const IconComp = cfg.icon;
                        const isSelected = selectedNodeId === node.id;

                        return (
                          <div
                            key={node.id}
                            id={`timeline-node-${node.id}`}
                            onClick={() => setSelectedNodeId(node.id === selectedNodeId ? null : node.id)}
                            className={`p-4 rounded-xl border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50/50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700/80 ring-2 ring-indigo-500/20 shadow-xs'
                                : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg border ${cfg.border} ${cfg.bg} dark:bg-slate-800 dark:border-slate-700 text-slate-800 dark:text-slate-200`}>
                                  <IconComp className="w-4 h-4" />
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{node.title}</span>
                                    <span className={`text-[11px] font-bold px-2 py-0.2 rounded-full ${cfg.badgeBg} ${cfg.badgeText}`}>
                                      {node.type}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{node.description}</p>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-[11px] font-medium text-slate-400 block">
                                  {new Date(node.createdAt).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                                <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                                  {node.sourceEntryIds.length} source reflection{node.sourceEntryIds.length > 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Slide-over / Detail Inspector Panel */}
            {selectedNode && (
              <div
                id="memory-node-detail-panel"
                className="lg:col-span-4 bg-white dark:bg-[#131b2e] rounded-2xl border border-slate-200 dark:border-slate-800/90 p-6 shadow-xs space-y-6 animate-fadeIn sticky top-20"
              >
                {/* Panel Header */}
                <div className="flex items-start justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          MEMORY_TYPE_CONFIG[selectedNode.type].badgeBg
                        } ${MEMORY_TYPE_CONFIG[selectedNode.type].badgeText}`}
                      >
                        {selectedNode.type}
                      </span>
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800/60">
                        {Math.round(selectedNode.confidence * 100)}% Confidence
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedNode.title}</h3>
                  </div>

                  <button
                    onClick={() => setSelectedNodeId(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Edit Form or View Details */}
                {editingNode && editingNode.id === selectedNode.id ? (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Memory Title</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Description</label>
                      <textarea
                        rows={3}
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Status</label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as MemoryNodeStatus)}
                        className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100"
                      >
                        <option value="active">Active</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={handleSaveEdit}
                        disabled={isSavingEdit || !editTitle.trim()}
                        className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 cursor-pointer"
                      >
                        {isSavingEdit ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => setEditingNode(null)}
                        className="py-1.5 px-3 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Description */}
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Semantic Synthesis</h4>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{selectedNode.description}</p>
                    </div>

                    {/* Why is this in my Memory Graph? */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700/80 space-y-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Why is this in my Memory Graph?</h4>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-semibold text-indigo-800 dark:text-indigo-300 bg-indigo-100/80 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                          Evidence-backed memory
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Extracted from {selectedNode.sourceEntryIds.length} authentic reflection
                          {selectedNode.sourceEntryIds.length > 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Supporting Reflections List */}
                      <div className="space-y-2 pt-1">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                          Supporting Reflections
                        </span>
                        {selectedNode.sourceEntryIds.map((sourceId) => {
                          const matchedEntry = entries.find((e) => e.id === sourceId);
                          if (!matchedEntry) return null;

                          return (
                            <div
                              key={sourceId}
                              className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
                            >
                              <div className="space-y-0.5 min-w-0">
                                <span className="font-semibold text-slate-900 dark:text-slate-100 truncate block">
                                  {matchedEntry.title}
                                </span>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                  <span>
                                    {new Date(matchedEntry.createdAt).toLocaleDateString(undefined, {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </span>
                                  {matchedEntry.location && (
                                    <span
                                      className="inline-flex items-center gap-0.5 text-indigo-600 dark:text-indigo-400 font-medium truncate max-w-[130px]"
                                      title={`Reflected at ${matchedEntry.location.placeName}`}
                                    >
                                      <MapPin className="w-2.5 h-2.5 shrink-0" />
                                      <span className="truncate">{matchedEntry.location.placeName}</span>
                                    </span>
                                  )}
                                </div>
                              </div>

                              <button
                                id={`open-source-reflection-${sourceId}`}
                                onClick={() => onSelectEntry(matchedEntry)}
                                className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                                title="Open reflection in canvas"
                              >
                                <span>Open</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Connected Relationships */}
                    {selectedNodeRelationships.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Connected Memories ({selectedNodeRelationships.length})
                        </h4>
                        <div className="space-y-1.5">
                          {selectedNodeRelationships.map((rel) => {
                            const otherNodeId =
                              rel.sourceNodeId === selectedNode.id ? rel.targetNodeId : rel.sourceNodeId;
                            const otherNode = nodes.find((n) => n.id === otherNodeId);
                            if (!otherNode) return null;
                            const cfg = MEMORY_TYPE_CONFIG[otherNode.type];

                            return (
                              <button
                                key={rel.id}
                                onClick={() => setSelectedNodeId(otherNode.id)}
                                className="w-full text-left p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors flex items-center justify-between text-xs cursor-pointer"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-sm bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                                    {rel.relationshipType.replace('_', ' ')}
                                  </span>
                                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{otherNode.title}</span>
                                </div>
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${cfg.badgeBg} ${cfg.badgeText}`}>
                                  {otherNode.type}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Actions: Edit, Archive, Delete */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        id="edit-memory-node-btn"
                        onClick={() => handleStartEdit(selectedNode)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        id="archive-memory-node-btn"
                        onClick={() => handleToggleArchive(selectedNode)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>{selectedNode.status === 'archived' ? 'Unarchive' : 'Archive'}</span>
                      </button>

                      {deleteConfirmId === selectedNode.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDeleteNode(selectedNode.id)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors cursor-pointer"
                          >
                            Confirm Delete
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1.5 rounded-lg text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          id="delete-memory-node-btn"
                          onClick={() => setDeleteConfirmId(selectedNode.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Security and Privacy Grounding Footer */}
      <div className="bg-slate-50 dark:bg-[#131b2e] rounded-xl p-4 border border-slate-200 dark:border-slate-800/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>User-Controlled Memory</strong>: Graph nodes are synthesized exclusively from your private reflections and stored under your authenticated Firestore partition. You can edit, archive, or remove derived memories at any time.
          </span>
        </div>
      </div>
    </div>
  );
};
