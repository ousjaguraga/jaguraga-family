import { useEffect, useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { getUrl } from 'aws-amplify/storage';
import { UserPlus } from 'lucide-react';
import { Person, type Generation } from '../../types';
import { initials, fullName } from '../../utils/helpers';

/* ── Generation gradient map ─────────────────────────────────────────────── */
const GEN_GRADIENT: Record<Generation, string> = {
  GREAT_GRANDPARENT: 'from-violet-500 to-purple-700',
  GRANDPARENT:       'from-blue-500   to-cyan-700',
  PARENT:            'from-emerald-500 to-teal-700',
  CURRENT:           'from-amber-400  to-orange-500',
  CHILD:             'from-rose-400   to-pink-600',
};

/* ── Single person card inside the tree ─────────────────────────────────── */
const TreeCard = memo(function TreeCard({ person }: { person: Person }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!person.photoKey) return;
    getUrl({ path: person.photoKey })
      .then(({ url }) => setPhotoUrl(url.toString()))
      .catch(() => {});
  }, [person.photoKey]);

  const gradient  = GEN_GRADIENT[person.generation] ?? 'from-gray-400 to-gray-600';
  const birthYear = person.birthDate ? new Date(person.birthDate).getFullYear() : null;
  const deathYear = person.deathDate ? new Date(person.deathDate).getFullYear() : null;

  return (
    <Link
      to={`/person/${person.id}`}
      title={fullName(person)}
      className="group relative flex flex-col items-center gap-1.5 rounded-2xl p-2.5
        w-[96px] sm:w-[112px]
        bg-white/95 border-2 border-transparent
        hover:border-gold-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.25)]
        active:border-gold-300 active:shadow-[0_12px_40px_rgba(0,0,0,0.25)]
        hover:-translate-y-1.5 transition-all duration-200 select-none"
    >
      {/* Avatar */}
      <div className={`w-12 h-12 rounded-xl overflow-hidden flex-shrink-0
        flex items-center justify-center text-xs font-bold text-white
        bg-gradient-to-br ${gradient} shadow-sm`}>
        {photoUrl
          ? <img src={photoUrl} alt={fullName(person)} className="w-full h-full object-cover" />
          : <span>{initials(person)}</span>
        }
      </div>

      {/* Name */}
      <div className="text-center w-full">
        <p className="text-[11px] font-bold text-gray-900 leading-tight truncate">
          {person.firstName}
        </p>
        <p className="text-[10px] text-gray-500 leading-tight truncate">
          {person.lastName}
        </p>
        {birthYear && (
          <p className="text-[9px] text-gray-400 mt-0.5 tabular-nums">
            {birthYear}{deathYear ? `–${deathYear}` : person.isDeceased ? '†' : ''}
          </p>
        )}
      </div>

      {/* Quick-add overlay on hover */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0
        group-hover:opacity-100 transition-opacity z-10 flex gap-1 whitespace-nowrap">
        <Link to={`/add-relative/${person.id}/child`}
          onClick={e => e.stopPropagation()}
          title="Add child"
          className="bg-burgundy-700 text-white text-[9px] font-semibold px-2 py-1 rounded-lg
            hover:bg-burgundy-600 flex items-center gap-0.5 shadow-lg">
          <UserPlus className="w-2.5 h-2.5" />
          Child
        </Link>
      </div>
    </Link>
  );
});

/* ── Recursive branch: one person + all their descendants ────────────────── */
function TreeBranch({
  person,
  allPersons,
  visited,
}: {
  person:     Person;
  allPersons: Person[];
  visited:    Set<string>;
}) {
  if (visited.has(person.id)) return null;
  const seen = new Set([...visited, person.id]);

  // Deduplicate children (a child may list both parents)
  const childrenMap = new Map<string, Person>();
  allPersons
    .filter(p => p.fatherId === person.id || p.motherId === person.id)
    .forEach(p => childrenMap.set(p.id, p));
  const children = [...childrenMap.values()];

  return (
    <div className="flex flex-col items-center">
      <TreeCard person={person} />

      {children.length > 0 && (
        <>
          {/* Drop line from card to children row */}
          <div className="tree-drop" />

          {/* Children row */}
          <ul className="tree-row">
            {children.map(child => (
              <li key={child.id} className="tree-col">
                {/* Stub from horizontal connector down to child */}
                <div className="tree-stub" />
                <TreeBranch person={child} allPersons={allPersons} visited={seen} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/* ── Root pair: optionally show a couple side-by-side before their tree ──── */
function RootBlock({
  person,
  allPersons,
  visited,
}: {
  person:     Person;
  allPersons: Person[];
  visited:    Set<string>;
}) {
  const spouse = person.spouseId
    ? allPersons.find(p => p.id === person.spouseId)
    : null;

  // children via this person OR their spouse
  const childrenMap = new Map<string, Person>();
  allPersons
    .filter(p => p.fatherId === person.id || p.motherId === person.id ||
                 (spouse && (p.fatherId === spouse.id || p.motherId === spouse.id)))
    .forEach(p => childrenMap.set(p.id, p));
  const children = [...childrenMap.values()];

  const seen = new Set([...visited, person.id, ...(spouse ? [spouse.id] : [])]);

  if (!spouse) {
    return <TreeBranch person={person} allPersons={allPersons} visited={visited} />;
  }

  return (
    <div className="flex flex-col items-center">
      {/* Couple row */}
      <div className="flex items-center gap-3">
        <TreeCard person={person} />
        {/* Hearts / marriage bar */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-10 h-0.5 bg-gold-400/60 rounded-full" />
          <span className="text-gold-400 text-xs">♥</span>
          <div className="w-10 h-0.5 bg-gold-400/60 rounded-full" />
        </div>
        <TreeCard person={spouse} />
      </div>

      {children.length > 0 && (
        <>
          <div className="tree-drop" />
          <ul className="tree-row">
            {children.map(child => (
              <li key={child.id} className="tree-col">
                <div className="tree-stub" />
                <TreeBranch person={child} allPersons={allPersons} visited={seen} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/* ── Main export ─────────────────────────────────────────────────────────── */
export default function FamilyTreeView({ persons }: { persons: Person[] }) {
  if (persons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-white/40 gap-3">
        <p className="text-lg font-medium">No family members yet.</p>
        <p className="text-sm">The admin will add the first ancestors to get started.</p>
      </div>
    );
  }

  // Find persons who have no parent present in the dataset → they are tree roots
  const ids = new Set(persons.map(p => p.id));
  const roots = persons.filter(p => {
    const fatherPresent = p.fatherId && ids.has(p.fatherId);
    const motherPresent = p.motherId && ids.has(p.motherId);
    return !fatherPresent && !motherPresent;
  });

  // Deduplicate: if a root has a spouse who is also a root, only show the pair once
  const shownIds = new Set<string>();
  const rootBlocks: Person[] = [];
  for (const r of roots) {
    if (shownIds.has(r.id)) continue;
    shownIds.add(r.id);
    if (r.spouseId && ids.has(r.spouseId)) shownIds.add(r.spouseId);
    rootBlocks.push(r);
  }

  return (
    /*
      The outer div clips and scrolls.
      The inner div uses inline-flex so it grows to exactly its content
      width — this is what makes horizontal scroll work on iOS/Android.
    */
    <div className="w-full overflow-x-auto overflow-y-auto no-scrollbar"
      style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="inline-flex gap-16 items-start px-8 pt-10 pb-16 min-h-[300px]">
        {rootBlocks.map(root => (
          <RootBlock
            key={root.id}
            person={root}
            allPersons={persons}
            visited={new Set()}
          />
        ))}
      </div>
    </div>
  );
}
