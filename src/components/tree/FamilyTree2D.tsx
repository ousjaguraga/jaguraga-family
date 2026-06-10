import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GENERATION_LABELS, type Gender, type Person } from '../../types';
import { fullName } from '../../utils/helpers';

// ── Layout constants ──────────────────────────────────────────────────────
const NW   = 120;   // card width
const NH   = 68;    // card height
const CGAP = 24;    // gap between husband and wife cards
const SGAP = 14;    // horizontal gap between sibling subtrees
const YGAP = 96;    // vertical gap between parent row and child row
const PAD  = 32;    // SVG viewBox padding
const CUW  = NW * 2 + CGAP; // full couple unit width

const GENDER_COLOR: Record<Gender, string> = {
  MALE:   '#0284c7',
  FEMALE: '#e11d48',
  OTHER:  '#64748b',
};

function trunc(s: string, max: number) {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

// ── Tree data types ───────────────────────────────────────────────────────
interface FNode {
  person:   Person;
  spouse:   Person | null;
  children: FNode[];
}

interface PNode {
  person:   Person;
  spouse:   Person | null;
  children: PNode[];
  cx:       number; // midpoint x of this family unit
  cy:       number; // vertical center of the card row
}

interface SvgEdge {
  key: string;
  x1: number; y1: number;
  x2: number; y2: number;
}

// ── Build recursive family tree ───────────────────────────────────────────
function buildTree(persons: Person[]): FNode[] {
  const byId   = new Map(persons.map(p => [p.id, p]));
  const idSet  = new Set(persons.map(p => p.id));
  const visited = new Set<string>();

  function makeNode(p: Person): FNode {
    visited.add(p.id);
    const spouse = p.spouseId && !visited.has(p.spouseId) ? (byId.get(p.spouseId) ?? null) : null;
    if (spouse) visited.add(spouse.id);

    const pIds = new Set(spouse ? [p.id, spouse.id] : [p.id]);
    const kids = persons
      .filter(c => !visited.has(c.id) &&
        ((c.fatherId && pIds.has(c.fatherId)) || (c.motherId && pIds.has(c.motherId))))
      .sort((a, b) => {
        const at = a.birthDate ? new Date(a.birthDate).getTime() : Infinity;
        const bt = b.birthDate ? new Date(b.birthDate).getTime() : Infinity;
        if (at !== bt) return at - bt;
        return fullName(a).localeCompare(fullName(b));
      });

    kids.forEach(c => visited.add(c.id));
    return { person: p, spouse, children: kids.map(c => makeNode(c)) };
  }

  const roots = persons.filter(
    p => (!p.fatherId || !idSet.has(p.fatherId)) && (!p.motherId || !idSet.has(p.motherId)),
  );

  const result: FNode[] = [];
  for (const r of roots) {
    if (visited.has(r.id)) continue;
    result.push(makeNode(r));
  }
  return result;
}

// ── Subtree width calculation ─────────────────────────────────────────────
function subW(n: FNode): number {
  const unitW = n.spouse ? CUW : NW;
  if (!n.children.length) return unitW;
  const cw = n.children.reduce((s, c) => s + subW(c), 0) + (n.children.length - 1) * SGAP;
  return Math.max(unitW, cw);
}

// ── Assign x/y positions ──────────────────────────────────────────────────
function layoutNode(n: FNode, cx: number, cy: number): PNode {
  if (!n.children.length) return { ...n, cx, cy, children: [] };

  const totalCW = n.children.reduce((s, c) => s + subW(c), 0) + (n.children.length - 1) * SGAP;
  let x = cx - totalCW / 2;
  const children = n.children.map(c => {
    const w   = subW(c);
    const node = layoutNode(c, x + w / 2, cy + NH + YGAP);
    x += w + SGAP;
    return node;
  });
  return { ...n, cx, cy, children };
}

// ── Flatten tree into node + edge lists ───────────────────────────────────
function collect(p: PNode, nodes: PNode[], edges: SvgEdge[]) {
  nodes.push(p);
  p.children.forEach(c => {
    edges.push({ key: `${p.person.id}>${c.person.id}`, x1: p.cx, y1: p.cy + NH / 2, x2: c.cx, y2: c.cy - NH / 2 });
    collect(c, nodes, edges);
  });
}

// ── Card SVG element ──────────────────────────────────────────────────────
function Card({
  person, x, y, hovered, onEnter, onLeave, onClick,
}: {
  person: Person; x: number; y: number; hovered: boolean;
  onEnter: () => void; onLeave: () => void; onClick: () => void;
}) {
  const color = GENDER_COLOR[person.gender];
  return (
    <g transform={`translate(${x},${y})`} style={{ cursor: 'pointer' }}
      onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={onClick}>
      <rect width={NW} height={NH} rx={11} fill="#fffdf8"
        stroke={hovered ? '#17543d' : color} strokeWidth={hovered ? 2.5 : 1.5}
        filter="url(#ns)" />
      {/* Gender colour bar */}
      <rect x={0} y={0} width={4} height={NH} rx={4} fill={color} opacity={0.9} />
      <text x={13} y={28} fontSize={13} fontWeight={700} fill="#0f172a">
        {trunc(person.firstName, 13)}
      </text>
      <text x={13} y={45} fontSize={11} fontWeight={500} fill="#475569">
        {trunc(person.lastName, 17)}
      </text>
      <text x={13} y={63} fontSize={10} fontWeight={600} fill={color} opacity={0.85}>
        {trunc(GENERATION_LABELS[person.generation], 18)}
      </text>
    </g>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function FamilyTree2D({ persons }: { persons: Person[] }) {
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [preview,   setPreview]   = useState('');

  const { nodes, edges, svgW, svgH, vb } = useMemo(() => {
    const trees = buildTree(persons);
    if (!trees.length) return { nodes: [] as PNode[], edges: [] as SvgEdge[], svgW: 800, svgH: 200, vb: '-400 -80 800 200' };

    const ROOT_GAP = 48;
    let curX = 0;
    const positioned = trees.map(t => {
      const w    = subW(t);
      const node = layoutNode(t, curX + w / 2, PAD + NH / 2);
      curX += w + ROOT_GAP;
      return node;
    });

    const nodes: PNode[]   = [];
    const edges: SvgEdge[] = [];
    positioned.forEach(r => collect(r, nodes, edges));

    const xs = nodes.flatMap(n =>
      n.spouse ? [n.cx - CUW / 2, n.cx + CUW / 2] : [n.cx - NW / 2, n.cx + NW / 2]);
    const ys = nodes.flatMap(n => [n.cy - NH / 2, n.cy + NH / 2]);

    const minX = Math.min(...xs) - PAD;
    const maxX = Math.max(...xs) + PAD;
    const minY = Math.min(...ys) - PAD;
    const maxY = Math.max(...ys) + PAD;
    const svgW = maxX - minX;
    const svgH = maxY - minY;

    return { nodes, edges, svgW, svgH, vb: `${minX} ${minY} ${svgW} ${svgH}` };
  }, [persons]);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-burgundy-900/10 bg-white shadow-sm">
        <svg width={svgW} height={svgH} viewBox={vb}
          role="img" aria-label="Family tree"
          style={{ display: 'block', minWidth: '100%' }}>
          <defs>
            <linearGradient id="pl" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9fceb8" />
              <stop offset="100%" stopColor="#4a8a69" />
            </linearGradient>
            <linearGradient id="sl" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#f0cc75" />
              <stop offset="100%" stopColor="#c8962e" />
            </linearGradient>
            <filter id="ns" x="-20%" y="-20%" width="140%" height="160%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#173c30" floodOpacity="0.12" />
            </filter>
          </defs>

          {/* Bezier parent → child curves */}
          {edges.map(e => {
            const my = (e.y1 + e.y2) / 2;
            return (
              <path key={e.key}
                d={`M ${e.x1} ${e.y1} C ${e.x1} ${my}, ${e.x2} ${my}, ${e.x2} ${e.y2}`}
                fill="none" stroke="url(#pl)" strokeWidth={2} strokeLinecap="round" opacity={0.8} />
            );
          })}

          {/* Spouse connectors */}
          {nodes.filter(n => n.spouse).map(n => {
            const x1 = n.cx - CGAP / 2; // right edge of husband card
            const x2 = n.cx + CGAP / 2; // left edge of wife card
            return (
              <g key={`sp-${n.person.id}`}>
                <line x1={x1} y1={n.cy} x2={x2} y2={n.cy}
                  stroke="url(#sl)" strokeWidth={2.5} strokeLinecap="round" opacity={0.9} />
                <circle cx={n.cx} cy={n.cy} r={6} fill="#fef3c7" stroke="#d97706" strokeWidth={1.5} />
                <text x={n.cx} y={n.cy + 4} textAnchor="middle" fontSize={8} fill="#d97706"
                  style={{ userSelect: 'none' }}>♥</text>
              </g>
            );
          })}

          {/* Cards */}
          {nodes.map(n => (
            <g key={`u-${n.person.id}`}>
              <Card
                person={n.person}
                x={n.spouse ? n.cx - NW - CGAP / 2 : n.cx - NW / 2}
                y={n.cy - NH / 2}
                hovered={hoveredId === n.person.id}
                onEnter={() => { setHoveredId(n.person.id); setPreview(fullName(n.person)); }}
                onLeave={() => { setHoveredId(null); setPreview(''); }}
                onClick={() => navigate(`/person/${n.person.id}`)}
              />
              {n.spouse && (
                <Card
                  person={n.spouse}
                  x={n.cx + CGAP / 2}
                  y={n.cy - NH / 2}
                  hovered={hoveredId === n.spouse.id}
                  onEnter={() => { setHoveredId(n.spouse!.id); setPreview(fullName(n.spouse!)); }}
                  onLeave={() => { setHoveredId(null); setPreview(''); }}
                  onClick={() => navigate(`/person/${n.spouse!.id}`)}
                />
              )}
            </g>
          ))}
        </svg>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-burgundy-900/10 bg-white px-3 py-2.5 shadow-sm">
        <p className="text-xs font-medium text-gray-600">Click a card to open profile.</p>
        <p className="max-w-[60%] text-right text-xs font-semibold text-burgundy-800 whitespace-normal break-words">
          {preview || 'Hover a card to preview'}
        </p>
      </div>
    </div>
  );
}
