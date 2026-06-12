import { useCallback, useMemo } from 'react';
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
import { nodeTypes, NODE_W, NODE_H, LEVEL_GAP, type PersonNodeData } from './FamilyGraph';
import type { Person } from '../../types';

const COL_GAP = 48; // horizontal gap between the father and mother subtrees

// ── Pedigree: the person plus every recorded ancestor, all the way up ─────
interface PedNode {
  person: Person;
  father: PedNode | null;
  mother: PedNode | null;
  depth:  number; // 0 = the focus person, grows upward
}

function buildPedigree(
  person: Person,
  byId:   Map<string, Person>,
  trail:  Set<string>,
  depth:  number,
): PedNode {
  const nextTrail = new Set(trail).add(person.id);
  const f = person.fatherId ? byId.get(person.fatherId) ?? null : null;
  const m = person.motherId ? byId.get(person.motherId) ?? null : null;
  return {
    person,
    depth,
    father: f && !nextTrail.has(f.id) ? buildPedigree(f, byId, nextTrail, depth + 1) : null,
    mother: m && !nextTrail.has(m.id) ? buildPedigree(m, byId, nextTrail, depth + 1) : null,
  };
}

function maxDepth(n: PedNode): number {
  return Math.max(
    n.depth,
    n.father ? maxDepth(n.father) : n.depth,
    n.mother ? maxDepth(n.mother) : n.depth,
  );
}

function subtreeW(n: PedNode): number {
  const parents = [n.father, n.mother].filter((p): p is PedNode => p !== null);
  if (parents.length === 0) return NODE_W;
  const w = parents.reduce((sum, p) => sum + subtreeW(p), 0) + COL_GAP * (parents.length - 1);
  return Math.max(NODE_W, w);
}

function placeNode(
  n:       PedNode,
  xLeft:   number,
  top:     number,
  focusId: string,
  nodes:   Node[],
  edges:   Edge[],
) {
  const w = subtreeW(n);
  const x = xLeft + (w - NODE_W) / 2;
  const y = (top - n.depth) * (NODE_H + LEVEL_GAP);

  nodes.push({
    id:       n.person.id,
    type:     'person',
    position: { x, y },
    data:     { person: n.person, isHead: n.person.id === focusId } satisfies PersonNodeData,
  });

  const parents = [n.father, n.mother].filter((p): p is PedNode => p !== null);
  const pw = parents.reduce((sum, p) => sum + subtreeW(p), 0) + COL_GAP * (parents.length - 1);
  let cx = xLeft + (w - pw) / 2;

  parents.forEach(parent => {
    edges.push({
      id:     `line-${parent.person.id}-${n.person.id}`,
      source: parent.person.id,
      target: n.person.id,
      type:   'smoothstep',
      style:  { stroke: '#4a8a69', strokeWidth: 2 },
    });
    placeNode(parent, cx, top, focusId, nodes, edges);
    cx += subtreeW(parent) + COL_GAP;
  });

  if (n.father && n.mother) {
    edges.push({
      id:           `couple-${n.father.person.id}-${n.mother.person.id}`,
      source:       n.father.person.id,
      target:       n.mother.person.id,
      sourceHandle: 'spouse-out',
      targetHandle: 'spouse-in',
      type:         'straight',
      style:        { stroke: '#d97706', strokeWidth: 2, strokeDasharray: '5 3' },
      label:        '♥',
      labelStyle:   { fill: '#d97706', fontSize: 12 },
      labelBgStyle: { fill: '#fef3c7' },
    });
  }
}

// ── Component ─────────────────────────────────────────────────────────────
export default function LineageTree({ person, persons }: { person: Person; persons: Person[] }) {
  const navigate = useNavigate();

  const { nodes, edges, rows } = useMemo(() => {
    const byId = new Map(persons.map(p => [p.id, p]));
    const root = buildPedigree(person, byId, new Set(), 0);
    const top  = maxDepth(root);
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    placeNode(root, 0, top, person.id, nodes, edges);
    return { nodes, edges, rows: top + 1 };
  }, [person, persons]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === 'person' && node.id !== person.id) navigate(`/person/${node.id}`);
    },
    [navigate, person.id],
  );

  // Nothing to draw when no ancestors are recorded.
  if (nodes.length <= 1) return null;

  const height = Math.min(560, Math.max(280, rows * (NODE_H + LEVEL_GAP)));

  return (
    <div
      className="overflow-hidden rounded-lg border border-burgundy-100"
      style={{ width: '100%', height, background: '#fdfaf4' }}
    >
      <ReactFlow
        key={person.id}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
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
  );
}
