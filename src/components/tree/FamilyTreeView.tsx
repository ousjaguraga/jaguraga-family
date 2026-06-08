import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUrl } from 'aws-amplify/storage';
import { X, UserPlus } from 'lucide-react';
import { Person, GENERATION_LABELS, GENERATION_ORDER } from '../../types';
import { fullName, initials } from '../../utils/helpers';
import { groupByGeneration } from '../../utils/helpers';

interface Props {
  persons: Person[];
}

// ── small clickable chip ─────────────────────────────────────────────────────

function PersonChip({
  person,
  selected,
  onClick,
}: {
  person:   Person;
  selected: boolean;
  onClick:  () => void;
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!person.photoKey) return;
    getUrl({ path: person.photoKey }).then(({ url }) => setPhotoUrl(url.toString())).catch(() => {});
  }, [person.photoKey]);

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all group
        ${selected
          ? 'bg-burgundy-100 ring-2 ring-burgundy-600 scale-105 shadow-md'
          : 'hover:bg-gray-100'
        }`}
    >
      <div className={`w-11 h-11 rounded-full overflow-hidden flex items-center justify-center
        text-xs font-bold flex-shrink-0 border-2 transition-colors
        ${selected
          ? 'border-burgundy-600 bg-burgundy-200 text-burgundy-800'
          : 'border-gray-200 bg-gray-100 text-gray-600 group-hover:border-gray-300'
        }`}>
        {photoUrl
          ? <img src={photoUrl} alt={fullName(person)} className="w-full h-full object-cover" />
          : <span>{initials(person)}</span>
        }
      </div>
      <span className={`text-xs leading-tight text-center max-w-[64px] truncate
        ${selected ? 'text-burgundy-800 font-semibold' : 'text-gray-600'}`}>
        {person.firstName}
      </span>
    </button>
  );
}

// ── single person node in the focused mini-tree ──────────────────────────────

function FocusNode({
  person,
  label,
  highlight,
  onSelect,
}: {
  person:   Person;
  label?:   string;
  highlight?: boolean;
  onSelect: (id: string) => void;
}) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!person.photoKey) return;
    getUrl({ path: person.photoKey }).then(({ url }) => setPhotoUrl(url.toString())).catch(() => {});
  }, [person.photoKey]);

  return (
    <div className="flex flex-col items-center gap-1">
      {label && <span className="text-xs text-gray-400 mb-0.5">{label}</span>}
      <button
        onClick={() => onSelect(person.id)}
        className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all group
          ${highlight
            ? 'bg-burgundy-700 ring-2 ring-burgundy-500 shadow-lg'
            : 'bg-white border border-gray-200 hover:border-burgundy-300 hover:shadow-sm'
          }`}
      >
        <div className={`w-14 h-14 rounded-full overflow-hidden flex items-center justify-center
          text-sm font-bold border-2
          ${highlight
            ? 'border-gold-400 bg-gold-100 text-gold-800'
            : 'border-gray-200 bg-burgundy-100 text-burgundy-700'
          }`}>
          {photoUrl
            ? <img src={photoUrl} alt={fullName(person)} className="w-full h-full object-cover" />
            : <span>{initials(person)}</span>
          }
        </div>
        <div className="text-center">
          <p className={`text-xs font-semibold leading-tight ${highlight ? 'text-white' : 'text-gray-800'}`}>
            {person.firstName}
          </p>
          <p className={`text-xs leading-tight ${highlight ? 'text-burgundy-200' : 'text-gray-400'}`}>
            {person.lastName}
          </p>
        </div>
      </button>
      <Link
        to={`/person/${person.id}`}
        className="text-xs text-burgundy-600 hover:underline mt-0.5"
        onClick={e => e.stopPropagation()}
      >
        View
      </Link>
    </div>
  );
}

// ── connector SVG ─────────────────────────────────────────────────────────────

function VLine({ height = 32 }: { height?: number }) {
  return <div className="w-px bg-burgundy-200 mx-auto" style={{ height }} />;
}

function HConnector() {
  return <div className="flex-1 h-px bg-burgundy-200 self-center" />;
}

// ── main component ────────────────────────────────────────────────────────────

export default function FamilyTreeView({ persons }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected  = persons.find(p => p.id === selectedId) ?? null;
  const father    = selected?.fatherId  ? persons.find(p => p.id === selected.fatherId)  : null;
  const mother    = selected?.motherId  ? persons.find(p => p.id === selected.motherId)  : null;
  const children  = selected ? persons.filter(p => p.fatherId === selected.id || p.motherId === selected.id) : [];
  const siblings  = selected
    ? persons.filter(p =>
        p.id !== selected.id &&
        ((selected.fatherId && p.fatherId === selected.fatherId) ||
         (selected.motherId && p.motherId === selected.motherId)),
      )
    : [];

  const grouped = groupByGeneration(persons);
  const activeGenerations = GENERATION_ORDER.filter(g => (grouped.get(g)?.length ?? 0) > 0);

  if (persons.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p>No family members yet. The admin will add ancestors soon.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Compact all-members grid ──────────────────────────────────────── */}
      <div className="space-y-4">
        {activeGenerations.map(gen => {
          const members = grouped.get(gen) ?? [];
          return (
            <div key={gen}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
                {GENERATION_LABELS[gen]}
                <span className="ml-1 font-normal">({members.length})</span>
              </p>
              <div className="flex flex-wrap gap-1">
                {members.map(p => (
                  <PersonChip
                    key={p.id}
                    person={p}
                    selected={p.id === selectedId}
                    onClick={() => setSelectedId(p.id === selectedId ? null : p.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Focused mini-tree ─────────────────────────────────────────────── */}
      {selected && (
        <div className="border-t border-gray-100 pt-6">
          {/* dismiss button */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-600">
              {fullName(selected)}'s connections
            </p>
            <button
              onClick={() => setSelectedId(null)}
              className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col items-center gap-0">
            {/* Parents row */}
            {(father || mother) && (
              <>
                <div className="flex items-end justify-center gap-6 mb-0">
                  {father && (
                    <FocusNode person={father} label="Father" onSelect={setSelectedId} />
                  )}
                  {mother && (
                    <FocusNode person={mother} label="Mother" onSelect={setSelectedId} />
                  )}
                </div>
                <VLine height={28} />
              </>
            )}

            {/* Person + siblings row */}
            <div className="flex items-center gap-3 flex-wrap justify-center">
              {siblings.slice(0, 3).map(sib => (
                <FocusNode key={sib.id} person={sib} onSelect={setSelectedId} />
              ))}
              {siblings.length > 3 && (
                <span className="text-xs text-gray-400 self-center">
                  +{siblings.length - 3} more
                </span>
              )}

              {/* Divider between siblings and selected */}
              {siblings.length > 0 && (
                <div className="w-px h-12 bg-gray-200 self-center" />
              )}

              <FocusNode person={selected} highlight onSelect={setSelectedId} />
            </div>

            {/* Children row */}
            {children.length > 0 && (
              <>
                <VLine height={28} />
                <div className="flex items-start gap-4 flex-wrap justify-center">
                  {children.map(child => (
                    <FocusNode key={child.id} person={child} onSelect={setSelectedId} />
                  ))}
                </div>
              </>
            )}

            {/* Quick-add links */}
            <div className="flex gap-3 mt-5 flex-wrap justify-center">
              {!father && (
                <Link to={`/add-relative/${selected.id}/father`}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-burgundy-700 border border-dashed border-gray-300 hover:border-burgundy-400 px-3 py-1.5 rounded-lg transition-colors">
                  <UserPlus className="w-3.5 h-3.5" />
                  Add father
                </Link>
              )}
              {!mother && (
                <Link to={`/add-relative/${selected.id}/mother`}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-burgundy-700 border border-dashed border-gray-300 hover:border-burgundy-400 px-3 py-1.5 rounded-lg transition-colors">
                  <UserPlus className="w-3.5 h-3.5" />
                  Add mother
                </Link>
              )}
              <Link to={`/add-relative/${selected.id}/child`}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-burgundy-700 border border-dashed border-gray-300 hover:border-burgundy-400 px-3 py-1.5 rounded-lg transition-colors">
                <UserPlus className="w-3.5 h-3.5" />
                Add child
              </Link>
            </div>
          </div>
        </div>
      )}

      {!selectedId && (
        <p className="text-center text-sm text-gray-400 pt-2">
          Tap a person above to see their family connections
        </p>
      )}
    </div>
  );
}
