import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUrl } from 'aws-amplify/storage';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeTypes,
  Position,
  Handle,
  BackgroundVariant,
} from '@xyflow/react';
import { ArrowUpRight, ChevronRight, ChevronUp, GitBranch, Search, Users, X } from 'lucide-react';
import '@xyflow/react/dist/style.css';
import { GENERATION_LABELS, GENERATION_ORDER, type Gender, type Generation, type Person } from '../../types';

// ── Dimensions ────────────────────────────────────────────────────────────
export const NODE_W = 172;
export const NODE_H = 84;
export const SPOUSE_GAP = 56;   // horizontal gap inside a couple
const SIB_GAP = 40;             // gap between sibling subtrees
const TREE_GAP = 90;            // gap between disconnected family trees
export const LEVEL_GAP = 110;   // vertical gap between generations

// ── Colors ────────────────────────────────────────────────────────────────
const GENDER_BORDER: Record<Gender, string> = {
  MALE:   '#0284c7',
  FEMALE: '#e11d48',
  OTHER:  '#64748b',
};

const GENDER_BG: Record<Gender, string> = {
  MALE:   '#f0f9ff',
  FEMALE: '#fff1f2',
  OTHER:  '#f8fafc',
};

const GEN_BADGE: Record<Generation, string> = {
  GREAT_GRANDPARENT: '#7c3aed',
  GRANDPARENT:       '#0284c7',
  PARENT:            '#059669',
  CURRENT:           '#d97706',
  CHILD:             '#e11d48',
};

const DESCENT_EDGE = { stroke: '#4a8a69', strokeWidth: 2 };
const HEAD_RING = '0 0 0 3px rgba(201, 162, 39, 0.45)';

// ── Photo loading (cached signed URLs) ────────────────────────────────────
const photoUrlCache = new Map<string, string>();

function usePhotoUrl(photoKey?: string | null) {
  const [url, setUrl] = useState<string | null>(
    photoKey ? photoUrlCache.get(photoKey) ?? null : null,
  );
  useEffect(() => {
    let cancelled = false;
    if (!photoKey) { setUrl(null); return; }
    const cached = photoUrlCache.get(photoKey);
    if (cached) { setUrl(cached); return; }
    getUrl({ path: photoKey })
      .then(r => {
        const u = r.url.toString();
        photoUrlCache.set(photoKey, u);
        if (!cancelled) setUrl(u);
      })
      .catch(() => { if (!cancelled) setUrl(null); });
    return () => { cancelled = true; };
  }, [photoKey]);
  return url;
}

function Avatar({ person, size = 36 }: { person: Person; size?: number }) {
  const photoUrl = usePhotoUrl(person.photoKey);
  const ini = `${(person.firstName || '?')[0] ?? ''}${(person.lastName || '')[0] ?? ''}`.toUpperCase();
  return (
    <span
      title={`${person.firstName} ${person.lastName}`}
      className="flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white ring-2 ring-white"
      style={{ width: size, height: size, background: GENDER_BORDER[person.gender], fontSize: size * 0.34 }}
    >
      {photoUrl
        ? <img src={photoUrl} alt={`${person.firstName} ${person.lastName}`} className="h-full w-full object-cover" />
        : ini}
    </span>
  );
}

// ── Helpers shared by layout + family grouping ────────────────────────────
function birthTime(p: Person) {
  if (!p.birthDate) return Infinity;
  const t = new Date(p.birthDate).getTime();
  return Number.isNaN(t) ? Infinity : t;
}

export function makeLookups(persons: Person[]) {
  const byId = new Map(persons.map(p => [p.id, p]));
  const has = (id?: string | null): id is string => !!id && byId.has(id);
  const spouseOf = (p: Person): Person | null => {
    if (has(p.spouseId)) return byId.get(p.spouseId!)!;
    const back = persons.find(q => q.spouseId === p.id);
    return back ?? null;
  };
  // A couple is a spouse link OR two people who share a child:
  // if someone is the child of a father and mother, those two are a family.
  const partnerOf = (p: Person): Person | null => {
    const s = spouseOf(p);
    if (s) return s;
    const child = persons.find(c =>
      has(c.fatherId) && has(c.motherId) && (c.fatherId === p.id || c.motherId === p.id));
    if (!child) return null;
    return byId.get(child.fatherId === p.id ? child.motherId! : child.fatherId!) ?? null;
  };
  // ALL family partners — explicit spouse links in either direction plus every
  // co-parent of a shared child.
  const partnersOf = (p: Person): Person[] => {
    const ids: string[] = [];
    const seen = new Set<string>([p.id]);
    const push = (id?: string | null) => {
      if (has(id) && !seen.has(id)) { seen.add(id); ids.push(id); }
    };
    push(p.spouseId);
    persons.forEach(q => {
      if (q.spouseId === p.id) push(q.id);
    });
    persons.forEach(c => {
      if (c.fatherId === p.id) push(c.motherId);
      else if (c.motherId === p.id) push(c.fatherId);
    });
    return ids.map(id => byId.get(id)!);
  };
  return { byId, has, spouseOf, partnerOf, partnersOf };
}

// ── Family units ──────────────────────────────────────────────────────────
export interface FamilyUnit {
  id:        string;
  parentIds: string[];   // 1–2 heads of the family
  childIds:  string[];
  memberIds: string[];   // exact parents + children in this family
  label:     string;
  generation: Generation;
}

export function buildFamilies(persons: Person[]): FamilyUnit[] {
  const { byId, has } = makeLookups(persons);

  // A child's exact recorded parents define the family. Never infer a missing
  // parent from spouseId: one person can head several different families.
  const byParents = new Map<string, { parentIds: Set<string>; childIds: string[] }>();
  persons.forEach(c => {
    const ps = [c.fatherId, c.motherId].filter(has) as string[];
    if (!ps.length) return;
    const set = new Set(ps);
    const key = [...set].sort().join('|');
    const u = byParents.get(key) ?? { parentIds: set, childIds: [] };
    u.childIds.push(c.id);
    byParents.set(key, u);
  });

  const sortKids = (ids: string[]) =>
    [...new Set(ids)].sort((a, b) => {
      const pa = byId.get(a)!, pb = byId.get(b)!;
      return birthTime(pa) - birthTime(pb) || (pa.firstName || '').localeCompare(pb.firstName || '');
    });

  // An explicit spouse connection is also a family, even when the couple has
  // no recorded children. It stays separate from single-parent child groups.
  const covered = new Set(byParents.keys());
  persons.forEach(p => {
    if (!has(p.spouseId)) return;
    const parentIds = new Set([p.id, p.spouseId!]);
    const key = [...parentIds].sort().join('|');
    if (covered.has(key)) return;
    covered.add(key);
    byParents.set(key, { parentIds, childIds: [] });
  });

  const units: FamilyUnit[] = [...byParents.values()].map(m => {
    const parentIds = [...m.parentIds].sort((a, b) => {
      const ga = byId.get(a)!.gender, gb = byId.get(b)!.gender;
      if (ga !== gb) return ga === 'MALE' ? -1 : gb === 'MALE' ? 1 : 0;
      return a.localeCompare(b);
    });
    const childIds = sortKids(m.childIds);
    const heads = parentIds.map(id => byId.get(id)!);
    const label = heads.length === 2
      ? `${heads[0].firstName} & ${heads[1].firstName} ${heads[0].lastName}`
      : `${heads[0].firstName} ${heads[0].lastName}`;
    const generation = heads
      .map(h => h.generation)
      .sort((a, b) => GENERATION_ORDER.indexOf(a) - GENERATION_ORDER.indexOf(b))[0];
    return {
      id: parentIds.join('|'),
      parentIds,
      childIds,
      memberIds: [...parentIds, ...childIds],
      label,
      generation,
    };
  });

  return units.sort((a, b) =>
    GENERATION_ORDER.indexOf(a.generation) - GENERATION_ORDER.indexOf(b.generation) ||
    a.label.localeCompare(b.label));
}

// ── Genealogy layout ──────────────────────────────────────────────────────
// Classic family-tree layout per SPECS.md:
//   husband ───♥─── wife
//                │
//        child1  child2  child3 ───♥─── spouse
//                                │
//                            grandchild …

export interface LayoutResult {
  pos: Map<string, { x: number; y: number }>;
  couples: Array<{ left: string; right: string }>;
  unions: Array<{
    id: string; x: number; y: number;
    childIds: string[];
    /** non-empty = a below-the-row marriage junction; lines are drawn from each parent down to it */
    parentIds: string[];
  }>;
}

const UNION_DROP = 20; // how far below the row a multi-marriage junction sits

export function layoutFamily(persons: Person[]): LayoutResult {
  const { has, partnersOf } = makeLookups(persons);

  const byBirth = (a: Person, b: Person) =>
    birthTime(a) - birthTime(b) || (a.firstName || '').localeCompare(b.firstName || '');

  // p's children grouped by the other parent (null = other parent unknown).
  const childGroups = (p: Person, partnerIds: Set<string>) => {
    const groups = new Map<string | null, Person[]>();
    persons
      .filter(c => c.fatherId === p.id || c.motherId === p.id)
      .sort(byBirth)
      .forEach(c => {
        const otherRaw = c.fatherId === p.id ? c.motherId : c.fatherId;
        const key = has(otherRaw) && partnerIds.has(otherRaw) ? otherRaw : null;
        const arr = groups.get(key) ?? [];
        arr.push(c);
        groups.set(key, arr);
      });
    return groups;
  };

  interface Segment { person: Person; kids: Person[] }

  // The block anchored on p: p plus every partner, each with their children.
  const blockOf = (p: Person): Segment[] => {
    const partners = partnersOf(p);
    const groups = childGroups(p, new Set(partners.map(w => w.id)));
    const segments: Segment[] = [{ person: p, kids: groups.get(null) ?? [] }];
    partners.forEach(w => segments.push({ person: w, kids: groups.get(w.id) ?? [] }));
    return segments;
  };

  const widthMemo = new Map<string, number>();
  function subW(p: Person, trail: Set<string>): number {
    if (widthMemo.has(p.id)) return widthMemo.get(p.id)!;
    if (trail.has(p.id)) return NODE_W; // cycle guard
    const segments = blockOf(p);
    segments.forEach(s => trail.add(s.person.id));
    let w = 0;
    segments.forEach((s, i) => {
      const kids = s.kids.filter(k => !trail.has(k.id));
      const kw = kids.length
        ? kids.reduce((sum, k) => sum + subW(k, trail), 0) + SIB_GAP * (kids.length - 1)
        : 0;
      w += Math.max(NODE_W, kw) + (i > 0 ? SPOUSE_GAP : 0);
    });
    segments.forEach(s => widthMemo.set(s.person.id, w));
    return w;
  }

  const pos = new Map<string, { x: number; y: number }>();
  const couples: Array<{ left: string; right: string }> = [];
  const unions: LayoutResult['unions'] = [];
  const placed = new Set<string>();

  function placeKidsRow(kids: Person[], xLeft: number, availW: number, depth: number) {
    const kw = kids.reduce((s, k) => s + subW(k, new Set()), 0) + SIB_GAP * (kids.length - 1);
    let cx = xLeft + (availW - kw) / 2;
    kids.forEach(k => {
      const kwid = subW(k, new Set());
      place(k, cx, depth + 1);
      cx += kwid + SIB_GAP;
    });
  }

  function place(p: Person, xLeft: number, depth: number) {
    if (placed.has(p.id)) return;
    const segments = blockOf(p)
      .map(s => ({ ...s, kids: s.kids.filter(k => !placed.has(k.id)) }))
      .filter(s => s.person.id === p.id || !placed.has(s.person.id));
    const w = subW(p, new Set());
    const y = depth * (NODE_H + LEVEL_GAP);

    // ── Classic couple: one partner and every child shared between them ──
    if (segments.length === 2 && segments[0].kids.length === 0) {
      let a = segments[0].person, b = segments[1].person;
      if (a.gender === 'FEMALE' && b.gender === 'MALE') { const t = a; a = b; b = t; }
      const blockW = NODE_W * 2 + SPOUSE_GAP;
      const bx = xLeft + (w - blockW) / 2;
      pos.set(a.id, { x: bx, y });
      pos.set(b.id, { x: bx + NODE_W + SPOUSE_GAP, y });
      placed.add(a.id); placed.add(b.id);
      couples.push({ left: a.id, right: b.id });
      const kids = segments[1].kids;
      if (kids.length) {
        unions.push({
          id: `u-${p.id}`,
          x: bx + NODE_W + SPOUSE_GAP / 2,
          y: y + NODE_H / 2,
          childIds: kids.map(k => k.id),
          parentIds: [],
        });
        placeKidsRow(kids, xLeft, w, depth);
      }
      return;
    }

    // ── Single person (children's other parent unknown / not in tree) ──
    if (segments.length === 1) {
      const bx = xLeft + (w - NODE_W) / 2;
      pos.set(p.id, { x: bx, y });
      placed.add(p.id);
      const kids = segments[0].kids;
      if (kids.length) {
        unions.push({
          id: `u-${p.id}`,
          x: bx + NODE_W / 2,
          y: y + NODE_H,
          childIds: kids.map(k => k.id),
          parentIds: [],
        });
        placeKidsRow(kids, xLeft, w, depth);
      }
      return;
    }

    // ── Multiple marriages: anchor first, each partner above their own
    //    children, with a junction joining anchor + partner below the row ──
    const segWs = segments.map(s => {
      const kw = s.kids.length
        ? s.kids.reduce((sum, k) => sum + subW(k, new Set()), 0) + SIB_GAP * (s.kids.length - 1)
        : 0;
      return Math.max(NODE_W, kw);
    });
    const total = segWs.reduce((a, b) => a + b, 0) + SPOUSE_GAP * (segments.length - 1);
    let cursor = xLeft + Math.max(0, (w - total) / 2);

    segments.forEach((s, i) => {
      const segW = segWs[i];
      const nx = cursor + (segW - NODE_W) / 2;
      pos.set(s.person.id, { x: nx, y });
      placed.add(s.person.id);

      const isAnchor = s.person.id === p.id;
      if (!isAnchor) {
        unions.push({
          id: `u-${p.id}-${s.person.id}`,
          x: nx + NODE_W / 2,
          y: y + NODE_H + UNION_DROP,
          childIds: s.kids.map(k => k.id),
          parentIds: [p.id, s.person.id],
        });
      } else if (s.kids.length) {
        unions.push({
          id: `u-${p.id}-solo`,
          x: nx + NODE_W / 2,
          y: y + NODE_H + UNION_DROP,
          childIds: s.kids.map(k => k.id),
          parentIds: [p.id],
        });
      }
      if (s.kids.length) placeKidsRow(s.kids, cursor, segW, depth);
      cursor += segW + SPOUSE_GAP;
    });
  }

  const roots = persons
    .filter(p => !has(p.fatherId) && !has(p.motherId))
    .sort((a, b) =>
      GENERATION_ORDER.indexOf(a.generation) - GENERATION_ORDER.indexOf(b.generation) ||
      birthTime(a) - birthTime(b));

  let rootX = 0;
  for (const r of roots) {
    if (placed.has(r.id)) continue;
    const depth = Math.max(0, GENERATION_ORDER.indexOf(r.generation));
    const w = subW(r, new Set());
    place(r, rootX, depth);
    rootX += w + TREE_GAP;
  }
  for (const p of persons) {
    if (!placed.has(p.id)) {
      place(p, rootX, Math.max(0, GENERATION_ORDER.indexOf(p.generation)));
      rootX += subW(p, new Set()) + TREE_GAP;
    }
  }

  return { pos, couples, unions };
}

// ── Custom person node ────────────────────────────────────────────────────
type PersonNodeData = {
  person: Person;
  /** true when this person heads the family currently on screen */
  isHead?: boolean;
  /** family this person heads (set when it differs from the visible family) */
  ownFamily?: { id: string; size: number } | null;
  onOpenFamily?: (familyId: string) => void;
};

function PersonNode({ data }: { data: PersonNodeData }) {
  const { person, isHead, ownFamily, onOpenFamily } = data;
  const borderColor = GENDER_BORDER[person.gender];
  const badgeColor  = GEN_BADGE[person.generation];
  const years = (() => {
    const by = person.birthDate ? new Date(person.birthDate).getFullYear() : null;
    const dy = person.deathDate ? new Date(person.deathDate).getFullYear() : null;
    if (by && dy) return `${by}–${dy}`;
    if (by) return String(by);
    return null;
  })();

  return (
    <div
      style={{
        width: NODE_W,
        height: NODE_H,
        background: '#ffffff',
        border: `1.5px solid ${isHead ? '#c9a227' : '#e5e7eb'}`,
        borderTop: `3px solid ${borderColor}`,
        borderRadius: 12,
        boxShadow: isHead
          ? `${HEAD_RING}, 0 4px 16px rgba(0,0,0,0.12)`
          : '0 2px 10px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 12px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      <Handle type="target" position={Position.Top}    style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right}  id="spouse-out" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left}   id="spouse-in"  style={{ opacity: 0 }} />

      <Avatar person={person} size={38} />

      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#111827', whiteSpace: 'normal', overflowWrap: 'anywhere', lineHeight: 1.15, letterSpacing: '-0.01em' }}>
          {person.firstName}
          {person.isDeceased && <span style={{ marginLeft: 4, fontSize: 10, color: '#9ca3af' }}>ر</span>}
        </p>
        <p style={{ margin: '1px 0 0', fontSize: 10.5, color: '#6b7280', whiteSpace: 'normal', overflowWrap: 'anywhere', lineHeight: 1.1 }}>
          {person.lastName}
        </p>
        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 8, fontWeight: 700, color: badgeColor, background: `${badgeColor}15`, borderRadius: 4, padding: '1px 5px', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
            {GENERATION_LABELS[person.generation]}
          </span>
          {years && (
            <span style={{ fontSize: 9, color: '#9ca3af' }}>{years}</span>
          )}
        </div>
      </div>

      {ownFamily && onOpenFamily && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onOpenFamily(ownFamily.id); }}
          title="Open this person's family"
          style={{
            position: 'absolute',
            bottom: -14,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            whiteSpace: 'nowrap',
            fontSize: 9,
            fontWeight: 700,
            color: '#fff',
            background: '#7c2d3e',
            border: '1.5px solid #5e1f2e',
            borderRadius: 999,
            padding: '2px 9px',
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(124,45,62,0.35)',
            zIndex: 10,
          }}
        >
          {ownFamily.size} members <ArrowUpRight style={{ width: 9, height: 9 }} />
        </button>
      )}
    </div>
  );
}

// ── Invisible union (couple junction) node ────────────────────────────────
function UnionNode() {
  return (
    <div style={{ width: 2, height: 2, opacity: 0 }}>
      <Handle type="target" position={Position.Top}    style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

const nodeTypes: NodeTypes = { person: PersonNode, union: UnionNode };

// ── Build React Flow nodes + edges ────────────────────────────────────────
function buildGraph(
  persons: Person[],
  headOf: Map<string, FamilyUnit[]>,
  currentFamily: FamilyUnit | null,
  onOpenFamily: (id: string) => void,
): { nodes: Node[]; edges: Edge[] } {
  const { pos, couples, unions } = layoutFamily(persons);

  const nodes: Node[] = persons.map(p => {
    // a person may head several families (multiple marriages) — point the
    // chip at the first one that isn't the family currently on screen
    const fam = (headOf.get(p.id) ?? []).find(f => f.id !== currentFamily?.id && f.childIds.length > 0);
    return {
      id:       p.id,
      type:     'person',
      position: pos.get(p.id) ?? { x: 0, y: 0 },
      data:     {
        person: p,
        isHead: currentFamily?.parentIds.includes(p.id) ?? false,
        ownFamily: fam ? { id: fam.id, size: fam.memberIds.length } : null,
        onOpenFamily,
      } satisfies PersonNodeData,
    };
  });

  const edges: Edge[] = [];

  couples.forEach(({ left, right }) => {
    edges.push({
      id:           `spouse-${left}-${right}`,
      source:       left,
      target:       right,
      sourceHandle: 'spouse-out',
      targetHandle: 'spouse-in',
      type:         'straight',
      style:        { stroke: '#d97706', strokeWidth: 2, strokeDasharray: '5 3' },
      label:        '♥',
      labelStyle:   { fill: '#d97706', fontSize: 12 },
      labelBgStyle: { fill: '#fef3c7' },
    });
  });

  unions.forEach(u => {
    nodes.push({
      id:        u.id,
      type:      'union',
      position:  { x: u.x - 1, y: u.y - 1 },
      data:      {},
      selectable: false,
      draggable:  false,
    });
    // marriage junction: lines from each parent converge below the row
    u.parentIds.forEach(pid => {
      edges.push({
        id:     `join-${u.id}-${pid}`,
        source: pid,
        target: u.id,
        type:   'smoothstep',
        style:  { stroke: '#d97706', strokeWidth: 2 },
      });
    });
    u.childIds.forEach(cid => {
      edges.push({
        id:     `desc-${u.id}-${cid}`,
        source: u.id,
        target: cid,
        type:   'smoothstep',
        style:  DESCENT_EDGE,
      });
    });
  });

  return { nodes, edges };
}

// ── Flow canvas (remounted per family so fitView always re-fits) ──────────
function FamilyFlow({
  persons,
  headOf,
  currentFamily,
  onOpenFamily,
  showMiniMap,
}: {
  persons: Person[];
  headOf: Map<string, FamilyUnit[]>;
  currentFamily: FamilyUnit | null;
  onOpenFamily: (id: string) => void;
  showMiniMap: boolean;
}) {
  const navigate = useNavigate();
  const graph = useMemo(
    () => buildGraph(persons, headOf, currentFamily, onOpenFamily),
    [persons, headOf, currentFamily, onOpenFamily],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === 'person') navigate(`/person/${node.id}`);
    },
    [navigate],
  );

  return (
    <ReactFlow
      nodes={graph.nodes}
      edges={graph.edges}
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
      {showMiniMap && (
        <MiniMap
          nodeColor={n => {
            if (n.type !== 'person') return 'transparent';
            const p = (n.data as PersonNodeData).person;
            return GENDER_BG[p.gender];
          }}
          nodeStrokeColor={n => {
            if (n.type !== 'person') return 'transparent';
            const p = (n.data as PersonNodeData).person;
            return GENDER_BORDER[p.gender];
          }}
          maskColor="rgba(255,255,255,0.6)"
        />
      )}
    </ReactFlow>
  );
}

// ── Overview: family cards ────────────────────────────────────────────────
function FamilyCard({ unit, byId, onOpen }: {
  unit: FamilyUnit;
  byId: Map<string, Person>;
  onOpen: (id: string) => void;
}) {
  const heads    = unit.parentIds.map(id => byId.get(id)!).filter(Boolean);
  const children = unit.childIds.map(id => byId.get(id)!).filter(Boolean);
  const shownKids = children.slice(0, 4);
  const extraKids = children.length - shownKids.length;
  const genColor  = GEN_BADGE[unit.generation];

  const nameOf = (p: Person) => `${p.firstName} ${p.middleName ?? ''} ${p.lastName}`.replace(/\s+/g, ' ').trim();
  const husband = heads.find(h => h.gender === 'MALE') ?? null;
  const wife = heads.find(h => h.gender === 'FEMALE') ?? null;
  const topHead = husband ?? heads[0] ?? null;
  const bottomHead = heads.length > 1
    ? (wife && wife.id !== topHead?.id ? wife : heads.find(h => h.id !== topHead?.id) ?? null)
    : null;
  const topRole = heads.length > 1
    ? (husband && wife ? (topHead?.id === husband.id ? 'Husband' : 'Wife') : 'Partner')
    : 'Parent';
  const bottomRole = heads.length > 1
    ? (husband && wife ? (bottomHead?.id === wife.id ? 'Wife' : 'Partner') : 'Partner')
    : 'Parent';

  return (
    <button
      type="button"
      onClick={() => onOpen(unit.id)}
      className="group flex flex-col rounded-xl border border-gray-100 bg-white text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-gold-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)] overflow-hidden"
    >
      {/* coloured generation stripe */}
      <div style={{ height: 4, background: genColor, borderRadius: '10px 10px 0 0', flexShrink: 0 }} />

      <div className="flex flex-col gap-3 p-4">
        {/* husband/wife card */}
        <div className="overflow-hidden rounded-xl border border-gold-200 bg-gold-50/60">
          <div className="flex items-center justify-between border-b border-gold-200/80 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gold-700">Family pair</p>
            <span className="text-[11px] text-gray-500">
              {unit.parentIds.length === 2 ? 'Couple' : 'Single parent'} · {unit.memberIds.length} members
            </span>
          </div>

          {topHead && (
            <div className="flex items-start gap-3 px-3 py-3">
              <Avatar person={topHead} size={42} />
              <div className="min-w-0 flex-1">
                <p className="font-serif text-[15px] font-bold leading-snug text-gray-950 whitespace-normal break-words">{nameOf(topHead)}</p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">{topRole}</p>
              </div>
              <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white text-gray-400 transition group-hover:bg-burgundy-800 group-hover:text-white">
                <GitBranch className="h-3.5 w-3.5" />
              </span>
            </div>
          )}

          {bottomHead && (
            <>
              <div className="mx-3 border-t border-gold-200/70" />
              <div className="flex items-start gap-3 px-3 py-3">
                <Avatar person={bottomHead} size={42} />
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-[15px] font-bold leading-snug text-gray-950 whitespace-normal break-words">{nameOf(bottomHead)}</p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">{bottomRole}</p>
                </div>
              </div>
            </>
          )}

          <div className="px-3 pb-2">
            <span
              style={{ fontSize: 9, fontWeight: 700, color: genColor, background: `${genColor}15`, borderRadius: 4, padding: '1px 6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}
            >
              {GENERATION_LABELS[unit.generation]}
            </span>
          </div>
        </div>

        {/* children preview */}
        <div className="border-t border-gray-100 pt-3">
          {children.length > 0 ? (
            <div className="flex items-center gap-2">
              <div className="flex flex-shrink-0 -space-x-2">
                {shownKids.map(k => <Avatar key={k.id} person={k} size={24} />)}
                {extraKids > 0 && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[9px] font-bold text-gray-500 ring-2 ring-white">
                    +{extraKids}
                  </span>
                )}
              </div>
              <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-gray-500 whitespace-normal break-words">
                {shownKids.map(k => nameOf(k)).join(', ')}{extraKids > 0 ? ` and ${extraKids} more` : ''}
              </p>
            </div>
          ) : (
            <p className="text-[11px] italic text-gray-400">No children recorded yet</p>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Main export ───────────────────────────────────────────────────────────
export default function FamilyGraph({ persons }: { persons: Person[] }) {
  // navigation trail of family ids; special last entry 'whole' = full tree
  // Persisted in sessionStorage so a person-profile navigation + back preserves it
  const [trail, setTrail] = useState<string[]>(() => {
    try {
      const s = sessionStorage.getItem('jag-tree-trail');
      return s ? (JSON.parse(s) as string[]) : [];
    } catch { return []; }
  });
  const [famSearch, setFamSearch] = useState('');

  useEffect(() => {
    try { sessionStorage.setItem('jag-tree-trail', JSON.stringify(trail)); }
    catch { /* storage unavailable */ }
  }, [trail]);

  const byId = useMemo(() => new Map(persons.map(p => [p.id, p])), [persons]);
  const families = useMemo(() => buildFamilies(persons), [persons]);

  // person id → ALL families they head (multiple marriages = multiple entries)
  const headOf = useMemo(() => {
    const m = new Map<string, FamilyUnit[]>();
    families.forEach(f => f.parentIds.forEach(pid => {
      const arr = m.get(pid) ?? [];
      arr.push(f);
      m.set(pid, arr);
    }));
    return m;
  }, [families]);

  const openFamily = useCallback((id: string) => {
    setTrail(t => {
      const idx = t.indexOf(id);
      return idx >= 0 ? t.slice(0, idx + 1) : [...t.filter(x => x !== 'whole'), id];
    });
  }, []);

  // People who belong to no family unit (no links at all).
  const unlinked = useMemo(() => {
    const inFamily = new Set(families.flatMap(f => f.memberIds));
    return persons.filter(p => !inFamily.has(p.id));
  }, [families, persons]);

  // Drop stale trail entries (e.g. after the page filter changes).
  const validTrail = trail.filter(id => id === 'whole' || families.some(f => f.id === id));
  const view = validTrail[validTrail.length - 1] ?? null;
  const current = view && view !== 'whole' ? families.find(f => f.id === view)! : null;

  // ── Per-family / whole-tree view ─────────────────────────────────────
  if (view) {
    const visible = current
      ? current.memberIds.map(id => byId.get(id)!).filter(Boolean)
      : persons;

    // family the current heads grew up in (one level up)
    const upFamily = current
      ? families.find(f => f.id !== current.id && current.parentIds.some(pid => f.childIds.includes(pid))) ?? null
      : null;

    const crumbs = validTrail.slice(0, -1);

    return (
      <div className="overflow-hidden rounded-xl border border-burgundy-900/10 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-x-1 gap-y-2 border-b border-burgundy-900/10 bg-cream-50 px-3 py-2.5">
          {/* breadcrumbs */}
          <button
            type="button"
            onClick={() => setTrail([])}
            className="rounded-md px-2 py-1 text-xs font-semibold text-burgundy-700 transition hover:bg-burgundy-50"
          >
            All families
          </button>
          {crumbs.map(id => {
            const f = families.find(x => x.id === id);
            return (
              <span key={id} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3 text-gray-300" />
                <button
                  type="button"
                  onClick={() => openFamily(id)}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-burgundy-700 transition hover:bg-burgundy-50"
                >
                  {id === 'whole' ? 'Whole tree' : f?.label ?? '…'}
                </button>
              </span>
            );
          })}
          <span className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 text-gray-300" />
            <span className="px-2 py-1 font-serif text-sm font-bold text-gray-950">
              {current ? current.label : 'Whole family tree'}
            </span>
          </span>
          <span className="text-xs font-medium text-gray-400">
            · {visible.length} {visible.length === 1 ? 'member' : 'members'}
          </span>

          <span className="ml-auto flex items-center gap-2">
            {upFamily && (
              <button
                type="button"
                onClick={() => openFamily(upFamily.id)}
                title="Go to the parents' family"
                className="inline-flex items-center gap-1.5 rounded-lg border border-burgundy-900/10 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-burgundy-900/30 hover:text-gray-950"
              >
                <ChevronUp className="h-3.5 w-3.5" /> {upFamily.label}
              </button>
            )}
          </span>
        </div>

        <div style={{ width: '100%', height: '72vh', background: '#fdfaf4' }}>
          {/* key forces a remount so fitView re-fits each family to the viewport */}
          <FamilyFlow
            key={view}
            persons={visible}
            headOf={headOf}
            currentFamily={current}
            onOpenFamily={openFamily}
            showMiniMap={!current}
          />
        </div>
      </div>
    );
  }

  // ── Families overview ────────────────────────────────────────────────
  const q = famSearch.trim().toLowerCase();
  const visibleFamilies = q
    ? families.filter(f =>
        f.label.toLowerCase().includes(q) ||
        f.memberIds.some(id => {
          const p = byId.get(id);
          return p && `${p.firstName} ${p.middleName ?? ''} ${p.lastName}`.toLowerCase().includes(q);
        }))
    : families;

  const groups = GENERATION_ORDER
    .map(g => ({ generation: g, fams: visibleFamilies.filter(f => f.generation === g) }))
    .filter(x => x.fams.length > 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-burgundy-900/10 bg-white px-4 py-3 shadow-sm">
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-burgundy-900/40" />
          <input
            type="text"
            placeholder="Find a family or member"
            value={famSearch}
            onChange={e => setFamSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-burgundy-900/10 bg-gray-50 pl-10 pr-9 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gold-500 focus:bg-white focus:ring-4 focus:ring-gold-500/20"
          />
          {famSearch && (
            <button
              type="button"
              onClick={() => setFamSearch('')}
              className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              aria-label="Clear family search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500">
          <span className="font-bold text-gray-900">{visibleFamilies.length}</span> of {families.length} {families.length === 1 ? 'family' : 'families'}
        </p>
        <button
          type="button"
          onClick={() => setTrail(['whole'])}
          className="ml-auto inline-flex items-center gap-2 rounded-lg bg-burgundy-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-burgundy-700 active:bg-burgundy-900"
        >
          <GitBranch className="h-4 w-4" /> Whole tree
        </button>
      </div>

      {groups.length === 0 && (
        <div className="rounded-xl border border-burgundy-900/10 bg-white p-8 text-center shadow-sm">
          <p className="font-serif text-lg font-bold text-gray-950">No families match “{famSearch}”</p>
          <p className="mt-1 text-sm text-gray-500">Try another name.</p>
        </div>
      )}

      {groups.map(({ generation, fams }) => (
        <section key={generation}>
          <div className="mb-2.5 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: GEN_BADGE[generation] }} />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              {GENERATION_LABELS[generation]} families
            </h3>
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">{fams.length}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {fams.map(f => (
              <FamilyCard key={f.id} unit={f} byId={byId} onOpen={openFamily} />
            ))}
          </div>
        </section>
      ))}

      {unlinked.length > 0 && !q && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white/80 p-4">
          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">
            <Users className="h-3.5 w-3.5" /> Not linked to a family yet
          </p>
          <div className="flex flex-wrap gap-2">
            {unlinked.map(p => (
              <span key={p.id} className="inline-flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 shadow-sm">
                <Avatar person={p} size={24} />
                {p.firstName} {p.lastName}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
