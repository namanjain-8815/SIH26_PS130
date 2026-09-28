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
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { CheckCircle2, Clock, AlertCircle, Circle, Play, Zap } from 'lucide-react';
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

// Custom approval node
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
      className="bg-white rounded-xl shadow-card border-2 px-4 py-3 min-w-[180px] max-w-[220px]"
      style={{ borderColor: border, backgroundColor: bg }}
    >
      <div className="flex items-center gap-2 mb-1">
        <StatusIcon className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />
        <p className="text-xs font-bold text-gray-900 leading-tight truncate">{data.label}</p>
      </div>
      <p className="text-[10px] text-gray-500 truncate mb-2">{data.authority}</p>

      <div className="flex items-center gap-1 flex-wrap">
        {data.can_start_now && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-medium bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full">
            <Play className="w-2.5 h-2.5" /> Ready
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
    </div>
  );
}

const nodeTypes = { approvalNode: ApprovalNode };

// Layered layout: place nodes in rows based on prerequisite depth
function computeLayout(
  nodes: Node[],
  edges: Edge[]
): Node[] {
  // BFS to assign depth layers
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

  // Position
  const LAYER_GAP_X = 280;
  const NODE_GAP_Y = 130;

  return nodes.map((n) => {
    const depth = depthMap.get(n.id) ?? 0;
    const layer = layers.get(depth) ?? [n.id];
    const idx = layer.indexOf(n.id);
    const totalH = (layer.length - 1) * NODE_GAP_Y;
    return {
      ...n,
      position: {
        x: depth * LAYER_GAP_X + 50,
        y: idx * NODE_GAP_Y - totalH / 2 + 300,
      },
    };
  });
}

export default function DependencyGraphPage({ params }: { params?: { id?: string } }) {
  const effectiveProjectId = params?.id || DEMO_PROJECT_ID;
  const qc = useQueryClient();
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
    if (!data) return;
    const rawEdges: Edge[] = data.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: e.animated,
      label: e.label,
      type: 'smoothstep',
      style: { stroke: e.animated ? '#16a34a' : '#d1d5db', strokeWidth: 2 },
      labelStyle: { fontSize: 10, fill: '#6b7280' },
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
  if (error) return <div className="p-6"><ErrorState message={(error as Error).message} onRetry={() => refetch()} /></div>;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Permissions & Approvals Dependency Map</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Visualise the statutory prerequisite order in which permissions and clearances must be obtained. Green animated arrows indicate active parallel paths.
            </p>
          </div>
          <button
            onClick={() => startEligible.mutate()}
            disabled={startEligible.isPending}
            className="btn-primary text-xs py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
          >
            <Zap className={`w-3.5 h-3.5 ${startEligible.isPending ? 'animate-spin' : ''}`} />
            {startEligible.isPending ? 'Orchestrating...' : 'Start Eligible Clearances'}
          </button>
        </div>

        {data && (
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {[
              { label: 'Total', val: data.summary.total, color: 'bg-gray-100 text-gray-700' },
              { label: 'Completed', val: data.summary.completed, color: 'bg-green-100 text-green-700' },
              { label: 'Can Start Now', val: data.summary.can_start_now, color: 'bg-primary-100 text-primary-700' },
              { label: 'Blocked', val: data.summary.blocked, color: 'bg-red-100 text-red-700' },
            ].map(({ label, val, color }) => (
              <div key={label} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${color}`}>
                {val} {label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-5 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-4 text-xs text-gray-500">
        {Object.entries(STATUS_COLOR).map(([status, color]) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border-2 flex-shrink-0" style={{ borderColor: color }} />
            {status.replace('_', ' ')}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="w-6 h-0.5 bg-primary-500" /> Required first
        </span>
      </div>

      {/* Flow canvas */}
      <div className="flex-1" style={{ minHeight: 500 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          attributionPosition="bottom-right"
        >
          <Background color="#e5e7eb" gap={24} />
          <Controls />
          <MiniMap
            nodeColor={(n) => STATUS_COLOR[(n.data as { status: string }).status] ?? '#9ca3af'}
            style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}
          />
        </ReactFlow>
      </div>

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
