import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowLeftRight, HeartHandshake } from 'lucide-react';
import { nodeTypes, NODE_W, NODE_H, SPOUSE_GAP, LEVEL_GAP, type PersonNodeData } from './tree/FamilyGraph';
import { findRelationship, type Relationship } from '../utils/kinship';
import { fullName } from '../utils/helpers';
import type { Person } from '../types';

const COL_GAP = 140; // gap between the two descent columns

function personNode(p: Person, x: number, y: number, isHead: boolean): Node {
  return {
    id: p.id,
    type: 'person',
    position: { x, y },
    data: { person: p, isHead } satisfies PersonNodeData,
  };
}

function descentEdge(fromId: string, toId: string): Edge {
  return {
    id: `rel-${fromId}-${toId}`,
    source: fromId,
    target: toId,
    type: 'smoothstep',
    style: { stroke: '#4a8a69', strokeWidth: 2 },
  };
}

function coupleEdge(leftId: string, rightId: string): Edge {
  return {
    id: `rel-couple-${leftId}-${rightId}`,
    source: leftId,
    target: rightId,
    sourceHandle: 'spouse-out',
    targetHandle: 'spouse-in',
    type: 'straight',
    style: { stroke: '#d97706', strokeWidth: 2, strokeDasharray: '5 3' },
    label: '♥',
    labelStyle: { fill: '#d97706', fontSize: 12 },
    labelBgStyle: { fill: '#fef3c7' },
  };
}

/**
 * Inverted-V layout: shared ancestor(s) on top, one descent column per side.
 * Married-in people (kind 'marriage') attach beside their spouse with a ♥.
 */
function buildPathGraph(rel: Relationship, a: Person, b: Person) {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const row = NODE_H + LEVEL_GAP;
  const focus = new Set([a.id, b.id]);
  const pos = new Map<string, { x: number; y: number }>();

  const put = (p: Person, x: number, y: number) => {
    pos.set(p.id, { x, y });
    nodes.push(personNode(p, x, y, focus.has(p.id)));
  };

  if (rel.kind === 'spouse') {
    put(a, 0, 0);
    put(b, NODE_W + SPOUSE_GAP, 0);
    edges.push(coupleEdge(a.id, b.id));
    return { nodes, edges, rows: 1 };
  }

  if (rel.ancestors.length === 0) return null;

  let rows: number;
  if (rel.chainA.length === 0 || rel.chainB.length === 0) {
    // Direct line: a single vertical chain from the ancestor down.
    const chain = [rel.ancestors[0], ...(rel.chainA.length ? rel.chainA : rel.chainB)];
    chain.forEach((p, i) => {
      put(p, 0, i * row);
      if (i > 0) edges.push(descentEdge(chain[i - 1].id, p.id));
    });
    rows = chain.length;
  } else {
    const leftX = 0;
    const rightX = NODE_W + COL_GAP;
    const centerX = (leftX + rightX + NODE_W) / 2;

    // Shared ancestor(s) on row 0.
    if (rel.ancestors.length === 2) {
      const w = NODE_W * 2 + SPOUSE_GAP;
      const x0 = centerX - w / 2;
      put(rel.ancestors[0], x0, 0);
      put(rel.ancestors[1], x0 + NODE_W + SPOUSE_GAP, 0);
      edges.push(coupleEdge(rel.ancestors[0].id, rel.ancestors[1].id));
    } else {
      put(rel.ancestors[0], centerX - NODE_W / 2, 0);
    }

    // Descent edges fan out from the first ancestor only — one line per column.
    const ancId = rel.ancestors[0].id;
    ([
      { chain: rel.chainA, x: leftX },
      { chain: rel.chainB, x: rightX },
    ]).forEach(({ chain, x }) => {
      chain.forEach((p, i) => {
        put(p, x, (i + 1) * row);
        edges.push(descentEdge(i === 0 ? ancId : chain[i - 1].id, p.id));
      });
    });
    rows = Math.max(rel.chainA.length, rel.chainB.length) + 1;
  }

  // Married-in bridges: ♥ beside the blood endpoint of their side.
  const attach = (bridge: Person | null | undefined, chain: Person[], side: 'left' | 'right') => {
    if (!bridge) return;
    const endpoint = chain.length ? chain[chain.length - 1] : rel.ancestors[0];
    const at = pos.get(endpoint.id);
    if (!at) return;
    const x = side === 'left' ? at.x - NODE_W - SPOUSE_GAP : at.x + NODE_W + SPOUSE_GAP;
    put(bridge, x, at.y);
    edges.push(side === 'left' ? coupleEdge(bridge.id, endpoint.id) : coupleEdge(endpoint.id, bridge.id));
  };
  attach(rel.bridgeA, rel.chainA, 'left');
  attach(rel.bridgeB, rel.chainB, 'right');

  return { nodes, edges, rows };
}

export default function RelationshipFinder({
  persons,
  initialAId,
  initialBId,
}: {
  persons: Person[];
  initialAId?: string | null;
  initialBId?: string | null;
}) {
  const navigate = useNavigate();
  const [aId, setAId] = useState(initialAId ?? '');
  const [bId, setBId] = useState(initialBId ?? '');

  // Follow profile navigation: keep B in sync with the page being viewed.
  useEffect(() => { if (initialBId) setBId(initialBId); }, [initialBId]);
  useEffect(() => { if (initialAId) setAId(prev => prev || initialAId); }, [initialAId]);

  const sorted = useMemo(
    () => [...persons].sort((x, y) => fullName(x).localeCompare(fullName(y))),
    [persons],
  );
  const a = persons.find(p => p.id === aId) ?? null;
  const b = persons.find(p => p.id === bId) ?? null;

  const rel = useMemo(
    () => (a && b ? findRelationship(a, b, persons) : null),
    [a, b, persons],
  );

  const graph = useMemo(
    () => (rel && a && b && (rel.kind === 'blood' || rel.kind === 'spouse' || rel.kind === 'marriage')
      ? buildPathGraph(rel, a, b)
      : null),
    [rel, a, b],
  );

  const height = graph ? Math.min(540, Math.max(240, graph.rows * (NODE_H + LEVEL_GAP) + 30)) : 0;

  return (
    <section className="card mb-6 overflow-hidden">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gold-100 text-gold-700">
          <HeartHandshake className="h-4 w-4" />
        </span>
        <div>
          <h2 className="font-serif text-lg font-semibold text-gray-900">How are we related?</h2>
          <p className="mt-0.5 text-xs leading-5 text-gray-500">
            Pick any two family members to trace the connection between them.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          value={aId}
          onChange={e => setAId(e.target.value)}
          className="h-10 min-w-0 flex-1 rounded-lg border border-burgundy-900/10 bg-gray-50 px-3 text-sm text-gray-900 outline-none transition focus:border-gold-500 focus:bg-white focus:ring-4 focus:ring-gold-500/20"
        >
          <option value="">Choose a person…</option>
          {sorted.map(p => <option key={p.id} value={p.id}>{fullName(p)}</option>)}
        </select>

        <button
          type="button"
          onClick={() => { setAId(bId); setBId(aId); }}
          title="Swap"
          className="mx-auto flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-gold-400 hover:text-gold-700 sm:mx-0"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </button>

        <select
          value={bId}
          onChange={e => setBId(e.target.value)}
          className="h-10 min-w-0 flex-1 rounded-lg border border-burgundy-900/10 bg-gray-50 px-3 text-sm text-gray-900 outline-none transition focus:border-gold-500 focus:bg-white focus:ring-4 focus:ring-gold-500/20"
        >
          <option value="">Choose a person…</option>
          {sorted.map(p => <option key={p.id} value={p.id}>{fullName(p)}</option>)}
        </select>
      </div>

      {rel && (
        <div className="mt-4">
          <div
            className={`rounded-lg border px-4 py-3 ${
              rel.kind === 'none' ? 'border-gray-200 bg-gray-50'
              : rel.kind === 'self' ? 'border-gray-200 bg-gray-50'
              : 'border-gold-200 bg-gold-50/70'
            }`}
          >
            <p className="font-serif text-xl font-bold text-gray-900">{rel.label}</p>
            <p className="mt-1 text-sm leading-6 text-gray-600">{rel.sentence}</p>
          </div>

          {graph && (
            <div
              className="mt-3 overflow-hidden rounded-lg border border-burgundy-100"
              style={{ width: '100%', height, background: '#fdfaf4' }}
            >
              <ReactFlow
                key={`${aId}-${bId}`}
                nodes={graph.nodes}
                edges={graph.edges}
                nodeTypes={nodeTypes}
                onNodeClick={(_, node) => { if (node.type === 'person') navigate(`/person/${node.id}`); }}
                nodesDraggable={false}
                nodesConnectable={false}
                fitView
                fitViewOptions={{ padding: 0.15 }}
                minZoom={0.2}
                maxZoom={2}
                proOptions={{ hideAttribution: true }}
              >
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#d1fae5" />
                <Controls />
              </ReactFlow>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
