'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/lib/api';
import { ErrorState, CardSkeleton } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useCallback, useState, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Circle,
  Play,
  Zap,
  Network,
  ListTree,
  Building2,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { ParallelOrchestrationModal } from '@/components/orchestration/ParallelOrchestrationModal';
import type { ParallelOrchestrationResult } from '@/types/api';

const DEMO_PROJECT_ID = 'proj-abc-foods-001';

// Status → color for minimap and node border
const STATUS_COLOR: Record<string, string> = {
  COMPLETED: '#16a34a',
  IN_PROGRESS: '#d97706',
  BLOCKED: '#dc2626',
  NOT_STARTED: '#9ca3af',
};

const STATUS_BG: Record<string, string> = {
  COMPLETED: '#f0fdf4',
  IN_PROGRESS: '#fffbeb',
  BLOCKED: '#fef2f2',
  NOT_STARTED: '#f9fafb',
};

// Custom approval node with valid ReactFlow Handles
function ApprovalNode({ data }: { data: {
  label: string; authority: string; status: string; category: string;
  can_start_now: boolean; open_queries: number; sla_status: string | null;
} }) {
  const border = STATUS_COLOR[data.status] ?? '#9ca3af';
  const bg = STATUS_BG[data.status] ?? '#f9fafb';

  const StatusIcon = {
    COMPLETED: CheckCircle2,
    IN_PROGRESS: Clock,
    BLOCKED: AlertCircle,
    NOT_STARTED: Circle,
  }[data.status] ?? Circle;

  const iconColor = {
    COMPLETED: 'text-green-500',
    IN_PROGRESS: 'text-amber-500',
    BLOCKED: 'text-red-500',
    NOT_STARTED: 'text-gray-400',
  }[data.status] ?? 'text-gray-400';

  return (
    <div
      className="bg-white rounded-xl shadow-md border-2 px-4 py-3 min-w-[200px] max-w-[240px] relative transition-transform hover:scale-102"
      style={{ borderColor: border, backgroundColor: bg }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-gray-500 !border-2 !border-white !-left-1.5"
      />
      <div className="flex items-center gap-2 mb-1">
        <StatusIcon className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />
        <p className="text-xs font-bold text-gray-900 leading-tight truncate">{data.label}</p>
      </div>
      <p className="text-[10px] text-gray-500 truncate mb-2">{data.authority}</p>

      <div className="flex items-center gap-1 flex-wrap">
        {data.can_start_now && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full border border-primary-200">
            <Play className="w-2.5 h-2.5 fill-current" /> Ready
          </span>
        )}
        {data.open_queries > 0 && (
          <span className="text-[10px] font-medium bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">
            {data.open_queries} query
          </span>
        )}
        {data.sla_status === 'AT_RISK' && (
          <span className="text-[10px] font-medium bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">SLA risk</span>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-primary-600 !border-2 !border-white !-right-1.5"
      />
    </div>
  );
}

const nodeTypes = { approvalNode: ApprovalNode };

// Layered layout: place nodes in rows based on prerequisite depth
function computeLayout(
  nodes: Node[],
  edges: Edge[]
): Node[] {
  const depthMap = new Map<string, number>();
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>(); // source → targets

  nodes.forEach((n) => { inDegree.set(n.id, 0); adj.set(n.id, []); });
  edges.forEach((e) => {
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    adj.get(e.source)?.push(e.target);
  });

  const queue = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0).map((n) => n.id);
  queue.forEach((id) => depthMap.set(id, 0));

  while (queue.length > 0) {
    const id = queue.shift()!;
    const depth = depthMap.get(id) ?? 0;
    (adj.get(id) ?? []).forEach((child) => {
      const newDepth = depth + 1;
      if (!depthMap.has(child) || depthMap.get(child)! < newDepth) {
        depthMap.set(child, newDepth);
      }
      queue.push(child);
    });
  }

  // Group by depth
  const layers = new Map<number, string[]>();
  depthMap.forEach((depth, id) => {
    if (!layers.has(depth)) layers.set(depth, []);
    layers.get(depth)!.push(id);
  });

  const LAYER_GAP_X = 290;
  const NODE_GAP_Y = 120;

  return nodes.map((n) => {
    const depth = depthMap.get(n.id) ?? 0;
    const layer = layers.get(depth) ?? [n.id];
    const idx = layer.indexOf(n.id);
    const totalH = (layer.length - 1) * NODE_GAP_Y;
    return {
      ...n,
      position: {
        x: depth * LAYER_GAP_X + 60,
        y: idx * NODE_GAP_Y - totalH / 2 + 250,
      },
    };
  });
}

export default function DependencyGraphView({ params }: { params?: { id?: string } }) {
  const effectiveProjectId = params?.id || DEMO_PROJECT_ID;
  const qc = useQueryClient();
  const [viewMode, setViewMode] = useState<'network' | 'matrix'>('network');
  const [orchestrationResult, setOrchestrationResult] = useState<ParallelOrchestrationResult | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dependency-graph', effectiveProjectId],
    queryFn: () => projectsApi.getDependencyGraph(effectiveProjectId),
  });

  const startEligible = useMutation({
    mutationFn: () => projectsApi.startEligibleApplications(effectiveProjectId),
    onSuccess: (res) => {
      setOrchestrationResult(res);
      qc.invalidateQueries({ queryKey: ['dependency-graph', effectiveProjectId] });
      qc.invalidateQueries({ queryKey: ['control-centre', effectiveProjectId] });
      qc.invalidateQueries({ queryKey: ['project-approvals'] });
    },
  });

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback((c: Connection) => setEdges((eds) => addEdge(c, eds)), [setEdges]);

  useEffect(() => {
    if (!data || !data.nodes || data.nodes.length === 0) return;
    const rawEdges: Edge[] = (data.edges || []).map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: e.animated,
      label: e.label,
      type: 'smoothstep',
      style: { stroke: e.animated ? '#16a34a' : '#9ca3af', strokeWidth: 2 },
      labelStyle: { fontSize: 10, fill: '#6b7280', fontWeight: 600 },
    }));
    const laidOut = computeLayout(data.nodes as Node[], rawEdges);
    setNodes(laidOut);
    setEdges(rawEdges);
  }, [data, setNodes, setEdges]);

  if (isLoading) return (
    <div className="p-6 space-y-4">
      <div className="h-6 w-48 skeleton rounded" />
      <div className="h-[500px] skeleton rounded-xl" />
    </div>
  );

  if (error) return (
    <div className="p-6">
      <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
    </div>
  );

  const nodeList = (data?.nodes || []) as Array<{
    id: string;
    data: {
      label: string;
      authority: string;
      status: string;
      category: string;
      can_start_now: boolean;
      open_queries: number;
      sla_status: string | null;
    };
  }>;

  const parallelReadyNodes = nodeList.filter((n) => n.data.can_start_now && n.data.status !== 'COMPLETED');
  const inProgressNodes = nodeList.filter((n) => n.data.status === 'IN_PROGRESS');
  const blockedNodes = nodeList.filter((n) => n.data.status === 'BLOCKED');
  const completedNodes = nodeList.filter((n) => n.data.status === 'COMPLETED');

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-xs">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-100 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900">Permissions & Approvals Dependency Map</h1>
              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                PARALLEL ENGINE
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Visualise the statutory prerequisite order in which permissions and clearances must be obtained. Green animated arrows indicate active parallel paths.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('network')}
                className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
                  viewMode === 'network'
                    ? 'bg-white text-gray-900 shadow-2xs font-semibold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Network className="w-3.5 h-3.5 text-primary-600" />
                <span>Interactive Network</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('matrix')}
                className={`px-3 py-1.5 rounded-md font-medium flex items-center gap-1.5 transition-colors ${
                  viewMode === 'matrix'
                    ? 'bg-white text-gray-900 shadow-2xs font-semibold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <ListTree className="w-3.5 h-3.5 text-purple-600" />
                <span>Parallel Tracks Matrix</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => startEligible.mutate()}
              disabled={startEligible.isPending}
              className="btn-primary text-xs py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
            >
              <Zap className={`w-3.5 h-3.5 ${startEligible.isPending ? 'animate-spin' : ''}`} />
              <span>{startEligible.isPending ? 'Orchestrating...' : 'Start Parallel Clearances'}</span>
            </button>
          </div>
        </div>

        {data && (
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {[
              { label: 'Total Tracked', val: data.summary.total, color: 'bg-gray-100 text-gray-700' },
              { label: 'Completed', val: data.summary.completed, color: 'bg-green-100 text-green-700' },
              { label: 'Can Proceed in Parallel', val: data.summary.can_start_now, color: 'bg-emerald-100 text-emerald-800 font-bold' },
              { label: 'Prerequisite Blocked', val: data.summary.blocked, color: 'bg-red-100 text-red-700' },
            ].map(({ label, val, color }) => (
              <div key={label} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${color}`}>
                {val} {label}
              </div>
            ))}
          </div>
        )}
      </div>

      {viewMode === 'network' ? (
        <>
          {/* Legend */}
          <div className="px-5 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-4 text-xs text-gray-500 flex-wrap">
            {Object.entries(STATUS_COLOR).map(([status, color]) => (
              <span key={status} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border-2 flex-shrink-0" style={{ borderColor: color }} />
                <span>{status.replace(/_/g, ' ')}</span>
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="w-6 h-0.5 bg-emerald-500" />
              <span>Active Parallel Edge</span>
            </span>
          </div>

          {/* Flow canvas with explicit height */}
          <div className="w-full h-[620px] min-h-[560px] relative bg-gray-50/40">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.25 }}
              attributionPosition="bottom-right"
            >
              <Background color="#cbd5e1" gap={24} />
              <Controls />
              <MiniMap
                nodeColor={(n) => STATUS_COLOR[(n.data as { status: string }).status] ?? '#9ca3af'}
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              />
            </ReactFlow>
          </div>
        </>
      ) : (
        /* Parallel Tracks Matrix View */
        <div className="p-6 space-y-6 bg-gray-50/30 overflow-y-auto">
          {/* Ready to proceed in parallel */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-sm font-bold text-gray-900">
                  Ready to Start in Parallel ({parallelReadyNodes.length})
                </h2>
              </div>
              <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200">
                Prerequisites Satisfied
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {parallelReadyNodes.map((n) => (
                <div key={n.id} className="card p-4 border border-emerald-200/80 bg-emerald-50/20 hover:shadow-sm transition-all flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded uppercase">
                        Parallel Eligible
                      </span>
                      <StatusBadge status={n.data.status} size="sm" />
                    </div>
                    <p className="text-sm font-bold text-gray-900 leading-snug">{n.data.label}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-gray-400" />
                      {n.data.authority}
                    </p>
                  </div>
                  <div className="pt-3 mt-3 border-t border-emerald-100 flex items-center justify-between">
                    <span className="text-[11px] text-emerald-700 font-medium">✓ No blocking dependencies</span>
                    <Link
                      href={`/app/approvals`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* In Progress Clearances */}
          {inProgressNodes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h2 className="text-sm font-bold text-gray-900">
                  Currently Under Departmental Scrutiny ({inProgressNodes.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {inProgressNodes.map((n) => (
                  <div key={n.id} className="card p-4 border border-amber-200/80 bg-amber-50/10">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                        Active Review
                      </span>
                      <StatusBadge status={n.data.status} size="sm" />
                    </div>
                    <p className="text-sm font-bold text-gray-900 leading-snug">{n.data.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{n.data.authority}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Blocked by Prerequisites */}
          {blockedNodes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <h2 className="text-sm font-bold text-gray-900">
                  Prerequisite Dependent ({blockedNodes.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {blockedNodes.map((n) => (
                  <div key={n.id} className="card p-4 border border-gray-200 bg-gray-50/50 opacity-90">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold text-red-800 bg-red-100 px-2 py-0.5 rounded">
                        Sequential Wait
                      </span>
                      <StatusBadge status={n.data.status} size="sm" />
                    </div>
                    <p className="text-sm font-bold text-gray-900 leading-snug">{n.data.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{n.data.authority}</p>
                    <p className="text-[11px] text-red-600 mt-2 font-medium">Awaiting statutory prerequisite approval</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Clearances */}
          {completedNodes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <h2 className="text-sm font-bold text-gray-900">
                  Statutory Permissions Obtained ({completedNodes.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {completedNodes.map((n) => (
                  <div key={n.id} className="card p-4 border border-green-200 bg-green-50/20">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold text-green-800 bg-green-100 px-2 py-0.5 rounded">
                        Sanctioned
                      </span>
                      <StatusBadge status={n.data.status} size="sm" />
                    </div>
                    <p className="text-sm font-bold text-gray-900 leading-snug">{n.data.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{n.data.authority}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Parallel Orchestration Modal */}
      <ParallelOrchestrationModal
        isOpen={!!orchestrationResult}
        onClose={() => setOrchestrationResult(null)}
        result={orchestrationResult}
        projectName="Project Dependency Graph"
      />
    </div>
  );
}
