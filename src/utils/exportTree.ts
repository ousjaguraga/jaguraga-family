import {
  layoutFamily,
  makeLookups,
  NODE_W,
  NODE_H,
  LEVEL_GAP,
} from '../components/tree/FamilyGraph';
import type { Gender, Person } from '../types';

// ── What to include in the export ─────────────────────────────────────────
export interface ExportScope {
  roots:       boolean; // ancestors and their partners (your lineage)
  siblings:    boolean; // your siblings and their partners
  descendants: boolean; // your spouse, children, grandchildren…
  everyone:    boolean; // the whole connected clan
}

export const DEFAULT_SCOPE: ExportScope = {
  roots: true,
  siblings: true,
  descendants: true,
  everyone: false,
};

/** People reachable from `rootId` under the chosen scope. */
export function computeScope(persons: Person[], rootId: string, scope: ExportScope): Person[] {
  const { byId, has, partnersOf } = makeLookups(persons);
  const me = byId.get(rootId);
  if (!me) return [];

  const include = new Set<string>([me.id]);
  const addPartner = (p: Person) => {
    partnersOf(p).forEach(s => include.add(s.id));
  };

  if (scope.everyone) {
    // BFS across every family link.
    const queue = [me.id];
    while (queue.length) {
      const id = queue.shift()!;
      const p = byId.get(id);
      if (!p) continue;
      const neighbors: string[] = [];
      if (has(p.fatherId)) neighbors.push(p.fatherId!);
      if (has(p.motherId)) neighbors.push(p.motherId!);
      partnersOf(p).forEach(s => neighbors.push(s.id));
      persons.forEach(c => {
        if (c.fatherId === p.id || c.motherId === p.id) neighbors.push(c.id);
      });
      neighbors.forEach(n => {
        if (!include.has(n)) { include.add(n); queue.push(n); }
      });
    }
    return persons.filter(p => include.has(p.id));
  }

  if (scope.roots) {
    // Walk up the lineage; include each ancestor and their partner.
    const queue = [me.id];
    const seen = new Set<string>([me.id]);
    while (queue.length) {
      const p = byId.get(queue.shift()!);
      if (!p) continue;
      [p.fatherId, p.motherId].forEach(pid => {
        if (has(pid) && !seen.has(pid!)) {
          seen.add(pid!);
          include.add(pid!);
          const parent = byId.get(pid!)!;
          addPartner(parent);
          queue.push(pid!);
        }
      });
    }
  }

  if (scope.siblings) {
    persons.forEach(p => {
      if (p.id === me.id) return;
      const shared =
        (has(me.fatherId) && p.fatherId === me.fatherId) ||
        (has(me.motherId) && p.motherId === me.motherId);
      if (shared) {
        include.add(p.id);
        addPartner(p);
      }
    });
  }

  if (scope.descendants) {
    addPartner(me);
    const queue = [me.id];
    const seen = new Set<string>([me.id]);
    while (queue.length) {
      const id = queue.shift()!;
      persons.forEach(c => {
        if ((c.fatherId === id || c.motherId === id) && !seen.has(c.id)) {
          seen.add(c.id);
          include.add(c.id);
          addPartner(c);
          queue.push(c.id);
        }
      });
    }
  }

  return persons.filter(p => include.has(p.id));
}

// ── SVG rendering ──────────────────────────────────────────────────────────
const GENDER_STROKE: Record<Gender, string> = {
  MALE: '#0284c7', FEMALE: '#e11d48', OTHER: '#64748b',
};
const GENDER_FILL: Record<Gender, string> = {
  MALE: '#f0f9ff', FEMALE: '#fff1f2', OTHER: '#f8fafc',
};

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function yearsOf(p: Person): string {
  const by = p.birthDate ? new Date(p.birthDate).getFullYear() : null;
  const dy = p.deathDate ? new Date(p.deathDate).getFullYear() : null;
  if (by && dy) return `${by}–${dy}`;
  if (by) return String(by);
  return '';
}

export function buildTreeSvg(persons: Person[], title: string): string {
  const { pos, couples, unions } = layoutFamily(persons);

  const MARGIN = 48;
  const HEADER = 86;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  pos.forEach(({ x, y }) => {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x + NODE_W);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y + NODE_H);
  });
  if (!Number.isFinite(minX)) { minX = 0; maxX = NODE_W; minY = 0; maxY = NODE_H; }

  const ox = MARGIN - minX;
  const oy = MARGIN + HEADER - minY;
  const width  = maxX - minX + MARGIN * 2;
  const height = maxY - minY + MARGIN * 2 + HEADER;

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Georgia, 'Times New Roman', serif">`);
  parts.push(`<rect width="${width}" height="${height}" fill="#fdfaf4"/>`);

  // header
  parts.push(`<text x="${width / 2}" y="${MARGIN + 6}" text-anchor="middle" font-size="26" font-weight="bold" fill="#3f1220">${esc(title)}</text>`);
  parts.push(`<text x="${width / 2}" y="${MARGIN + 30}" text-anchor="middle" font-size="12" fill="#9a8d7e">Jaguraga Family Tree · ${new Date().toLocaleDateString()}</text>`);
  parts.push(`<line x1="${MARGIN}" y1="${MARGIN + 46}" x2="${width - MARGIN}" y2="${MARGIN + 46}" stroke="#c9a227" stroke-width="1.5"/>`);

  // descent lines (couple midpoint → child, elbow path)
  unions.forEach(u => {
    const ux = u.x + ox, uy = u.y + oy;
    // multi-marriage junction: lines from each parent converge below the row
    u.parentIds.forEach(pid => {
      const pp = pos.get(pid);
      if (!pp) return;
      const px = pp.x + ox + NODE_W / 2;
      const py = pp.y + oy + NODE_H;
      parts.push(`<path d="M${px},${py} L${px},${uy} L${ux},${uy}" fill="none" stroke="#d97706" stroke-width="2"/>`);
    });
    u.childIds.forEach(cid => {
      const c = pos.get(cid);
      if (!c) return;
      const cx = c.x + ox + NODE_W / 2;
      const cy = c.y + oy;
      const midY = cy - LEVEL_GAP / 2;
      parts.push(`<path d="M${ux},${uy} L${ux},${midY} L${cx},${midY} L${cx},${cy}" fill="none" stroke="#4a8a69" stroke-width="2"/>`);
    });
  });

  // spouse lines with heart
  couples.forEach(({ left, right }) => {
    const l = pos.get(left), r = pos.get(right);
    if (!l || !r) return;
    const y = l.y + oy + NODE_H / 2;
    const x1 = l.x + ox + NODE_W;
    const x2 = r.x + ox;
    parts.push(`<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#d97706" stroke-width="2" stroke-dasharray="5 3"/>`);
    parts.push(`<text x="${(x1 + x2) / 2}" y="${y + 4}" text-anchor="middle" font-size="12" fill="#d97706">♥</text>`);
  });

  // person cards
  persons.forEach(p => {
    const at = pos.get(p.id);
    if (!at) return;
    const x = at.x + ox, y = at.y + oy;
    const stroke = GENDER_STROKE[p.gender];
    const fill   = GENDER_FILL[p.gender];
    const ini = `${(p.firstName || '?')[0] ?? ''}${(p.lastName || '')[0] ?? ''}`.toUpperCase();
    const name = `${p.firstName} ${p.lastName}`.slice(0, 22);
    const sub = [p.nickname ? `"${p.nickname}"` : '', yearsOf(p), p.isDeceased ? 'رحمه الله' : '']
      .filter(Boolean).join('  ');

    parts.push(`<rect x="${x}" y="${y}" width="${NODE_W}" height="${NODE_H}" rx="12" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`);
    parts.push(`<circle cx="${x + 28}" cy="${y + NODE_H / 2}" r="17" fill="${stroke}"/>`);
    parts.push(`<text x="${x + 28}" y="${y + NODE_H / 2 + 4}" text-anchor="middle" font-size="12" font-weight="bold" fill="#ffffff">${esc(ini)}</text>`);
    parts.push(`<text x="${x + 52}" y="${y + NODE_H / 2 - 4}" font-size="12.5" font-weight="bold" fill="#0f172a">${esc(name)}</text>`);
    if (sub) {
      parts.push(`<text x="${x + 52}" y="${y + NODE_H / 2 + 13}" font-size="10" fill="#64748b">${esc(sub)}</text>`);
    }
  });

  parts.push('</svg>');
  return parts.join('\n');
}

// ── Downloads ──────────────────────────────────────────────────────────────
function triggerDownload(href: string, filename: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function downloadSvg(svg: string, filename: string) {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function downloadPng(svg: string, filename: string, scale = 2): Promise<void> {
  return new Promise((resolve, reject) => {
    const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(blob => {
        if (!blob) { reject(new Error('PNG export failed')); return; }
        const url = URL.createObjectURL(blob);
        triggerDownload(url, filename);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        resolve();
      }, 'image/png');
    };
    img.onerror = () => reject(new Error('Could not render the tree image'));
    img.src = svgUrl;
  });
}
