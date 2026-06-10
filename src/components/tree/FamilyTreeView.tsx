import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUrl } from 'aws-amplify/storage';
import { ArrowRight, Calendar, ChevronDown, Heart, MapPin, Users } from 'lucide-react';
import { GENERATION_LABELS, GENERATION_ORDER, type Gender, type Generation, type Person } from '../../types';
import { fullName, initials } from '../../utils/helpers';
import FamilyGraph from './FamilyGraph';

const GENDER_AVATAR: Record<Gender, string> = {
  MALE:   'from-sky-500 to-blue-700',
  FEMALE: 'from-rose-400 to-pink-700',
  OTHER:  'from-slate-400 to-slate-600',
};

const GENERATION_STYLE: Record<Generation, { badge: string; border: string; dot: string; header: string }> = {
  GREAT_GRANDPARENT: { badge: 'bg-violet-50 text-violet-700 ring-violet-200', border: 'border-violet-200', dot: 'bg-violet-500', header: 'bg-violet-50 border-violet-200' },
  GRANDPARENT:       { badge: 'bg-sky-50 text-sky-700 ring-sky-200',          border: 'border-sky-200',    dot: 'bg-sky-500',    header: 'bg-sky-50 border-sky-200' },
  PARENT:            { badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', border: 'border-emerald-200', dot: 'bg-emerald-500', header: 'bg-emerald-50 border-emerald-200' },
  CURRENT:           { badge: 'bg-amber-50 text-amber-700 ring-amber-200',    border: 'border-amber-200',  dot: 'bg-amber-500',  header: 'bg-amber-50 border-amber-200' },
  CHILD:             { badge: 'bg-rose-50 text-rose-700 ring-rose-200',       border: 'border-rose-200',   dot: 'bg-rose-500',   header: 'bg-rose-50 border-rose-200' },
};

// ── Helpers ───────────────────────────────────────────────────────────────

function dateTime(v?: string | null) {
  if (!v) return Infinity;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? Infinity : t;
}

function sortPeople(persons: Person[]) {
  return [...persons].sort((a, b) => {
    const gi = GENERATION_ORDER.indexOf(a.generation) - GENERATION_ORDER.indexOf(b.generation);
    if (gi !== 0) return gi;
    const td = dateTime(a.birthDate) - dateTime(b.birthDate);
    if (td !== 0) return td;
    return fullName(a).localeCompare(fullName(b));
  });
}

function yearRange(p: Person) {
  const by = p.birthDate ? new Date(p.birthDate).getFullYear() : null;
  const dy = p.deathDate ? new Date(p.deathDate).getFullYear() : null;
  if (by && dy) return `${by}–${dy}`;
  if (by && p.isDeceased) return `${by}–`;
  if (by) return String(by);
  if (p.isDeceased) return 'Deceased';
  return null;
}

function usePhotoUrl(photoKey?: string | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!photoKey) { setUrl(null); return; }
    getUrl({ path: photoKey })
      .then(r => { if (!cancelled) setUrl(r.url.toString()); })
      .catch(() => { if (!cancelled) setUrl(null); });
    return () => { cancelled = true; };
  }, [photoKey]);
  return url;
}

function Avatar({ person, size = 'md' }: { person: Person; size?: 'sm' | 'md' }) {
  const photoUrl = usePhotoUrl(person.photoKey);
  const cls = size === 'sm' ? 'h-8 w-8 text-xs rounded-md' : 'h-11 w-11 text-sm rounded-lg';
  return (
    <div className={`flex flex-shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br font-bold text-white shadow-sm ${GENDER_AVATAR[person.gender]} ${cls}`}>
      {photoUrl
        ? <img src={photoUrl} alt={fullName(person)} className="h-full w-full object-cover" />
        : <span>{initials(person)}</span>}
    </div>
  );
}

// ── Relation mini-chip ────────────────────────────────────────────────────

function RelationChip({ person }: { person: Person }) {
  const style = GENERATION_STYLE[person.generation];
  return (
    <Link
      to={`/person/${person.id}`}
      className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1.5 transition hover:border-gold-300 hover:bg-gold-50"
    >
      <Avatar person={person} size="sm" />
      <div className="min-w-0">
        <p className="text-xs font-semibold leading-tight text-gray-900 whitespace-normal break-words">{fullName(person)}</p>
        <p className={`mt-0.5 inline-block rounded px-1 py-px text-[9px] font-bold ring-1 ${style.badge}`}>
          {GENERATION_LABELS[person.generation]}
        </p>
      </div>
    </Link>
  );
}

function RelationGroup({ label, icon: Icon, persons }: { label: string; icon: typeof Users; persons: Person[] }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-gray-400" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {persons.map(p => <RelationChip key={p.id} person={p} />)}
      </div>
    </div>
  );
}

// ── Accordion row ─────────────────────────────────────────────────────────

function PersonAccordionRow({ person, allPersons }: { person: Person; allPersons: Person[] }) {
  const [open, setOpen] = useState(false);
  const style  = GENERATION_STYLE[person.generation];
  const years  = yearRange(person);

  const father   = person.fatherId ? allPersons.find(p => p.id === person.fatherId) ?? null : null;
  const mother   = person.motherId ? allPersons.find(p => p.id === person.motherId) ?? null : null;
  const spouse   = person.spouseId ? allPersons.find(p => p.id === person.spouseId) ?? null : null;
  const children = sortPeople(allPersons.filter(p => p.fatherId === person.id || p.motherId === person.id));
  const siblings = sortPeople(allPersons.filter(p =>
    p.id !== person.id &&
    ((person.fatherId && p.fatherId === person.fatherId) ||
     (person.motherId && p.motherId === person.motherId)),
  ));

  const parents    = [father, mother].filter((p): p is Person => p !== null);
  const hasFamily  = parents.length > 0 || spouse || children.length > 0 || siblings.length > 0;

  return (
    <div className={`overflow-hidden rounded-lg border ${style.border} bg-white shadow-sm`}>
      {/* Row header — always visible */}
      <button
        type="button"
        onClick={() => hasFamily && setOpen(v => !v)}
        className="flex w-full items-center gap-3 px-3 py-3 text-left"
        aria-expanded={open}
      >
        <Avatar person={person} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-snug text-gray-900 whitespace-normal break-words">{fullName(person)}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <span className={`inline-block rounded px-1.5 py-px text-[10px] font-bold ring-1 ${style.badge}`}>
              {GENERATION_LABELS[person.generation]}
            </span>
            {years && (
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                <Calendar className="h-3 w-3" />{years}
              </span>
            )}
            {person.birthPlace && (
              <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
                <MapPin className="h-3 w-3" />{person.birthPlace}
              </span>
            )}
            {person.isDeceased && <span className="text-[10px] text-gray-400">رحمه الله</span>}
          </div>
        </div>
        {hasFamily && (
          <ChevronDown className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {/* Expandable family panel */}
      {open && hasFamily && (
        <div className="space-y-3 border-t border-gray-100 px-3 pb-4 pt-3">
          {parents.length > 0 && <RelationGroup label="Parents" icon={Users} persons={parents} />}
          {spouse && <RelationGroup label="Spouse" icon={Heart} persons={[spouse]} />}
          {children.length > 0 && <RelationGroup label="Children" icon={Users} persons={children} />}
          {siblings.length > 0 && <RelationGroup label="Siblings" icon={Users} persons={siblings} />}
          <Link
            to={`/person/${person.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-burgundy-700 hover:underline"
          >
            View full profile <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Generation section ────────────────────────────────────────────────────

function GenerationSection({ generation, people, allPersons }: {
  generation: Generation;
  people: Person[];
  allPersons: Person[];
}) {
  const style = GENERATION_STYLE[generation];
  const [collapsed, setCollapsed] = useState(false);

  return (
    <section>
      <button
        type="button"
        onClick={() => setCollapsed(v => !v)}
        className={`mb-3 flex w-full items-center gap-2 rounded-lg border px-3 py-2 ${style.header} transition hover:opacity-90`}
      >
        <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
        <h2 className="flex-1 text-left text-sm font-bold text-gray-900">{GENERATION_LABELS[generation]}</h2>
        <span className="rounded bg-white/70 px-2 py-0.5 text-[11px] font-bold text-gray-700">{people.length}</span>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`} />
      </button>

      {!collapsed && (
        <div className="space-y-2">
          {people.map(person => (
            <PersonAccordionRow key={person.id} person={person} allPersons={allPersons} />
          ))}
        </div>
      )}
    </section>
  );
}

// ── Hierarchy list ────────────────────────────────────────────────────────

const GEN_HEX: Record<Generation, string> = {
  GREAT_GRANDPARENT: '#6d28d9',
  GRANDPARENT:       '#0369a1',
  PARENT:            '#047857',
  CURRENT:           '#b45309',
  CHILD:             '#be185d',
};

interface UnionNode {
  spouse:   Person | null;   // null = children whose other parent is unknown
  children: TreeNode[];
}

interface TreeNode {
  person:          Person;
  unions:          UnionNode[];
  descendantCount: number;
}

/**
 * Builds the full nested tree in one pass using a shared `placed` set so every
 * person appears exactly once. Supports MULTIPLE marriages: every spouse
 * (explicit spouseId link or implicit co-parent of a shared child) gets her
 * own union, with the children of that specific union nested under her.
 */
function buildTree(
  roots:      Person[],
  allPersons: Person[],
  byId:       Map<string, Person>,
): TreeNode[] {
  const placed = new Set<string>();

  // ALL partners: spouse links (both directions) + co-parents of shared children.
  function partnersOf(p: Person): Person[] {
    const ids: string[] = [];
    const seen = new Set<string>([p.id]);
    const push = (id?: string | null) => {
      if (id && byId.has(id) && !seen.has(id)) { seen.add(id); ids.push(id); }
    };
    push(p.spouseId);
    allPersons.forEach(q => { if (q.spouseId === p.id) push(q.id); });
    allPersons.forEach(c => {
      if (c.fatherId === p.id) push(c.motherId);
      else if (c.motherId === p.id) push(c.fatherId);
    });
    return ids.map(id => byId.get(id)!);
  }

  function buildNode(p: Person): TreeNode {
    placed.add(p.id);
    const partners = partnersOf(p).filter(s => !placed.has(s.id));
    partners.forEach(s => placed.add(s.id));
    const partnerIds = new Set(partners.map(s => s.id));

    // children of p or any of p's partners, grouped by which union they belong to
    const kids = allPersons
      .filter(c =>
        !placed.has(c.id) &&
        ((c.fatherId != null && (c.fatherId === p.id || partnerIds.has(c.fatherId))) ||
         (c.motherId != null && (c.motherId === p.id || partnerIds.has(c.motherId)))),
      )
      .sort((a, b) => dateTime(a.birthDate) - dateTime(b.birthDate) || fullName(a).localeCompare(fullName(b)));

    const byPartner = new Map<string, UnionNode>();
    const unions: UnionNode[] = partners.map(s => {
      const u: UnionNode = { spouse: s, children: [] };
      byPartner.set(s.id, u);
      return u;
    });
    const unknownUnion: UnionNode = { spouse: null, children: [] };

    let descendantCount = 0;
    for (const c of kids) {
      if (placed.has(c.id)) continue; // an earlier sibling may have claimed them
      let key: string | null = null;
      if (c.fatherId === p.id)      key = c.motherId && partnerIds.has(c.motherId) ? c.motherId : null;
      else if (c.motherId === p.id) key = c.fatherId && partnerIds.has(c.fatherId) ? c.fatherId : null;
      else if (c.fatherId && partnerIds.has(c.fatherId)) key = c.fatherId;
      else if (c.motherId && partnerIds.has(c.motherId)) key = c.motherId;

      const node = buildNode(c);
      descendantCount += 1 + node.descendantCount;
      (key ? byPartner.get(key)! : unknownUnion).children.push(node);
    }
    if (unknownUnion.children.length) unions.push(unknownUnion);

    return { person: p, unions, descendantCount };
  }

  const result: TreeNode[] = [];
  for (const root of roots) {
    if (!placed.has(root.id)) {
      result.push(buildNode(root));
    }
  }
  return result;
}

function HierarchyRow({ node, depth, defaultOpen }: { node: TreeNode; depth: number; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const { person, unions, descendantCount } = node;
  const hasContent = unions.some(u => u.spouse !== null || u.children.length > 0);
  const genColor = GEN_HEX[person.generation];
  const yr = yearRange(person);
  const spouseCount = unions.filter(u => u.spouse).length;

  return (
    <div>
      <div
        className="group flex items-center gap-1.5 rounded-lg px-2 py-1 transition hover:bg-gray-50"
        style={{ paddingLeft: depth * 22 + 8 }}
      >
        {/* chevron / spacer */}
        <button
          type="button"
          onClick={() => hasContent && setOpen(v => !v)}
          aria-expanded={open}
          className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded transition
            ${hasContent ? 'text-gray-400 hover:bg-gray-200 hover:text-gray-700' : 'pointer-events-none opacity-0'}`}
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${!open ? '-rotate-90' : ''}`}
          />
        </button>

        {/* person */}
        <Link
          to={`/person/${person.id}`}
          className="flex min-w-0 flex-1 items-start gap-2 no-underline"
        >
          <Avatar person={person} size="sm" />
          <span className="text-sm font-semibold leading-snug text-gray-900 whitespace-normal break-words">
            {fullName(person)}
            {person.nickname && <span className="ml-1 font-normal italic text-gold-700">“{person.nickname}”</span>}
            {person.isDeceased && <span className="ml-1 text-[10px] text-gray-400">رحمه الله</span>}
          </span>
          <span
            className="hidden flex-shrink-0 rounded px-1.5 py-px text-[9px] font-bold sm:inline"
            style={{ color: genColor, background: `${genColor}18` }}
          >
            {GENERATION_LABELS[person.generation]}
          </span>
          {yr && <span className="hidden flex-shrink-0 text-[11px] text-gray-400 sm:inline">{yr}</span>}
        </Link>

        {/* family summary badges */}
        {spouseCount > 1 && (
          <span className="flex flex-shrink-0 items-center gap-1 rounded-full bg-rose-50 px-1.5 py-px text-[10px] font-bold text-rose-500">
            <Heart className="h-2.5 w-2.5" />{spouseCount}
          </span>
        )}
        {descendantCount > 0 && (
          <span
            className="flex-shrink-0 rounded-full bg-gray-100 px-1.5 py-px text-[10px] font-bold text-gray-500"
            title={`${descendantCount} descendants`}
          >
            {descendantCount}
          </span>
        )}
      </div>

      {/* unions: every wife/husband at the SAME level, her children beneath her */}
      {open && hasContent && (
        <div className="relative">
          <div
            className="absolute top-0 bottom-2 w-px bg-gray-200"
            style={{ left: depth * 22 + 18 }}
          />
          {unions.map((u, i) =>
            u.spouse ? (
              <div key={u.spouse.id}>
                {(() => {
                  const husband = person.gender === 'MALE'
                    ? person
                    : u.spouse.gender === 'MALE'
                      ? u.spouse
                      : null;
                  const wife = person.gender === 'FEMALE'
                    ? person
                    : u.spouse.gender === 'FEMALE'
                      ? u.spouse
                      : null;

                  const top = husband ?? person;
                  const bottom = top.id === person.id ? u.spouse : person;
                  const topRole = husband && wife
                    ? (top.id === husband.id ? 'Husband' : 'Wife')
                    : 'Partner';
                  const bottomRole = husband && wife
                    ? (bottom.id === wife.id ? 'Wife' : 'Partner')
                    : 'Partner';

                  return (
                    <div className="py-2" style={{ paddingLeft: (depth + 1) * 22 + 8 }}>
                      <div className="overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-[0_6px_18px_rgba(0,0,0,0.06)]">
                        <div className="flex items-center justify-between border-b border-rose-100 bg-rose-50/80 px-4 py-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Family card</p>
                          {u.children.length > 0 && (
                            <span className="rounded-full bg-white px-1.5 py-px text-[10px] font-bold text-gray-500">
                              {u.children.length} {u.children.length === 1 ? 'child' : 'children'}
                            </span>
                          )}
                        </div>

                        <Link
                          to={`/person/${top.id}`}
                          className="flex min-w-0 items-start gap-3 px-4 py-3 no-underline transition hover:bg-rose-50/50"
                        >
                          <Avatar person={top} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold leading-snug text-gray-900 whitespace-normal break-words">
                              {fullName(top)}
                            </p>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{topRole}</p>
                          </div>
                        </Link>

                        <div className="mx-4 border-t border-gray-100" />

                        <Link
                          to={`/person/${bottom.id}`}
                          className="flex min-w-0 items-start gap-3 px-4 py-3 no-underline transition hover:bg-rose-50/50"
                        >
                          <Avatar person={bottom} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold leading-snug text-gray-900 whitespace-normal break-words">
                              {fullName(bottom)}
                            </p>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{bottomRole}</p>
                          </div>
                        </Link>
                      </div>
                    </div>
                  );
                })()}

                {u.children.map(child => (
                  <HierarchyRow key={child.person.id} node={child} depth={depth + 2} defaultOpen={defaultOpen} />
                ))}
              </div>
            ) : (
              <div key={`unknown-${i}`}>
                {u.children.map(child => (
                  <HierarchyRow key={child.person.id} node={child} depth={depth + 1} defaultOpen={defaultOpen} />
                ))}
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

export function HierarchyList({ persons }: { persons: Person[] }) {
  const byId  = useMemo(() => new Map(persons.map(p => [p.id, p])), [persons]);
  const idSet = useMemo(() => new Set(persons.map(p => p.id)), [persons]);
  // collapsed by default — the great-grandparents hold everyone inside them
  const [ctl, setCtl] = useState({ open: false, key: 0 });

  const tree = useMemo(() => {
    // Sort before finding roots so males come before females at the same
    // generation/birth-year (determines who is the "anchor" for each couple).
    const sorted = [...persons].sort((a, b) => {
      const gi = GENERATION_ORDER.indexOf(a.generation) - GENERATION_ORDER.indexOf(b.generation);
      if (gi !== 0) return gi;
      if (a.gender !== b.gender) return a.gender === 'MALE' ? -1 : 1;
      return dateTime(a.birthDate) - dateTime(b.birthDate) || fullName(a).localeCompare(fullName(b));
    });
    const roots = sorted.filter(
      p => (!p.fatherId || !idSet.has(p.fatherId)) && (!p.motherId || !idSet.has(p.motherId)),
    );
    return buildTree(roots, persons, byId);
  }, [persons, byId, idSet]);

  if (persons.length === 0) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-burgundy-900/10 bg-white px-4 text-center shadow-sm">
        <p className="font-serif text-2xl font-bold text-gray-950">No family members found</p>
        <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">
          Try a different search or generation filter.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-burgundy-900/10 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Family Hierarchy
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCtl(c => ({ open: true, key: c.key + 1 }))}
            className="rounded-md border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-600 transition hover:border-burgundy-300 hover:text-burgundy-700"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={() => setCtl(c => ({ open: false, key: c.key + 1 }))}
            className="rounded-md border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-gray-600 transition hover:border-burgundy-300 hover:text-burgundy-700"
          >
            Collapse all
          </button>
        </div>
      </div>
      <div className="p-3">
        {tree.map(node => (
          <HierarchyRow
            key={`${ctl.key}-${node.person.id}`}
            node={node}
            depth={0}
            defaultOpen={ctl.open}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main export — graph view ──────────────────────────────────────────────
export default function FamilyTreeView({ persons }: { persons: Person[] }) {
  if (persons.length === 0) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-burgundy-900/10 bg-white px-4 text-center shadow-sm">
        <p className="font-serif text-2xl font-bold text-gray-950">No family members found</p>
        <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">Try a different search or generation filter.</p>
      </div>
    );
  }

  return <FamilyGraph persons={persons} />;
}

// ── Accordion view — used by the grid toggle ──────────────────────────────
export function FamilyAccordion({ persons }: { persons: Person[] }) {
  const groups = useMemo(
    () => GENERATION_ORDER
      .map(generation => ({ generation, people: sortPeople(persons.filter(p => p.generation === generation)) }))
      .filter(g => g.people.length > 0),
    [persons],
  );

  if (persons.length === 0) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-burgundy-900/10 bg-white px-4 text-center shadow-sm">
        <p className="font-serif text-2xl font-bold text-gray-950">No family members found</p>
        <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">Try a different search or generation filter.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map(g => (
        <GenerationSection
          key={g.generation}
          generation={g.generation}
          people={g.people}
          allPersons={persons}
        />
      ))}
    </div>
  );
}

