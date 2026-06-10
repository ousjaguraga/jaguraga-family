import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Search, X } from 'lucide-react';
import { GENERATION_LABELS, type Gender, type Generation, type Person } from '../types';
import { fullName, initials } from '../utils/helpers';

const GENDER_BG: Record<Gender, string> = {
  MALE: '#0284c7', FEMALE: '#e11d48', OTHER: '#64748b',
};

function yearOf(p: Person): string | null {
  if (!p.birthDate) return null;
  const y = new Date(p.birthDate).getFullYear();
  return Number.isNaN(y) ? null : String(y);
}

export interface PersonPickerProps {
  label:         string;
  persons:       Person[];
  value:         string;
  onChange:      (id: string) => void;
  /** ids never offered (the person themselves, already-used links, …) */
  excludeIds?:   string[];
  filterGender?: Gender;
  /** restrict candidates to exactly this generation (e.g. parents = one above) */
  generation?:   Generation | null;
  placeholder?:  string;
}

/**
 * Searchable person selector. Scoped to the relevant generation by default
 * (a CURRENT-gen person picking a father only sees PARENT-gen men), with a
 * one-tap escape hatch to search everyone. Full keyboard support:
 * ↑/↓ to highlight, Enter to choose, Esc to dismiss.
 */
export default function PersonPicker({
  label,
  persons,
  value,
  onChange,
  excludeIds,
  filterGender,
  generation,
  placeholder = 'Type a name to search…',
}: PersonPickerProps) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [hi, setHi] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = persons.find(p => p.id === value) ?? null;

  const pool = useMemo(() => {
    const excluded = new Set(excludeIds ?? []);
    let list = persons.filter(p => !excluded.has(p.id));
    if (filterGender) list = list.filter(p => p.gender === filterGender);
    if (generation && !showAll) list = list.filter(p => p.generation === generation);
    return list.sort((a, b) => fullName(a).localeCompare(fullName(b)));
  }, [persons, excludeIds, filterGender, generation, showAll]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? pool.filter(p =>
          `${fullName(p)} ${p.nickname ?? ''} ${p.birthPlace ?? ''}`.toLowerCase().includes(needle))
      : pool;
    return list.slice(0, 8);
  }, [pool, q]);

  // dismiss when clicking outside
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => { setHi(0); }, [q, showAll, generation, filterGender]);

  function choose(p: Person) {
    onChange(p.id);
    setQ('');
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setHi(h => Math.min(h + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (open && results[hi]) choose(results[hi]); }
    else if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
  }

  // ── Selected state ────────────────────────────────────────────────────
  if (selected) {
    return (
      <div>
        <label className="label">{label}</label>
        <div className="flex min-h-[44px] items-center gap-3 rounded-lg border-2 border-emerald-300 bg-emerald-50 px-3 py-2">
          <span
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
            style={{ background: GENDER_BG[selected.gender] }}
          >
            {initials(selected)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-gray-900">
              {fullName(selected)}
              {selected.nickname && <span className="ml-1 font-normal italic text-gold-700">“{selected.nickname}”</span>}
            </span>
            <span className="block text-xs text-gray-500">
              {GENERATION_LABELS[selected.generation]}{yearOf(selected) ? ` · b. ${yearOf(selected)}` : ''}
            </span>
          </span>
          <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" aria-hidden />
          <button
            type="button"
            onClick={() => { onChange(''); setShowAll(false); setTimeout(() => inputRef.current?.focus(), 0); }}
            className="flex-shrink-0 rounded-md px-2 py-1.5 text-xs font-semibold text-gray-500 transition hover:bg-white hover:text-red-500"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  // ── Search state ──────────────────────────────────────────────────────
  const scopeLabel = generation ? `${GENERATION_LABELS[generation]} generation` : null;

  return (
    <div ref={rootRef}>
      <label className="label">{label}</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" aria-hidden />
        <input
          ref={inputRef}
          className="input min-h-[44px] pl-9 pr-9"
          placeholder={placeholder}
          value={q}
          role="combobox"
          aria-expanded={open}
          aria-label={label}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {q && (
          <button
            type="button"
            onClick={() => { setQ(''); inputRef.current?.focus(); }}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="relative z-20">
          <div className="absolute left-0 right-0 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
            {results.length === 0 ? (
              <p className="px-3 py-3 text-sm text-gray-400">
                {q.trim() ? <>No one called “{q.trim()}” here.</> : 'No candidates yet.'}
                {generation && !showAll && ' They may be in another generation.'}
              </p>
            ) : (
              <ul role="listbox" aria-label={`${label} suggestions`}>
                {results.map((p, i) => (
                  <li key={p.id} role="option" aria-selected={i === hi}>
                    <button
                      type="button"
                      onMouseEnter={() => setHi(i)}
                      onClick={() => choose(p)}
                      className={`flex min-h-[44px] w-full items-center gap-3 px-3 py-2 text-left transition ${
                        i === hi ? 'bg-burgundy-50' : 'bg-white'
                      }`}
                    >
                      <span
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                        style={{ background: GENDER_BG[p.gender] }}
                      >
                        {initials(p)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-gray-900">
                          {fullName(p)}
                          {p.nickname && <span className="ml-1 italic text-gold-700">“{p.nickname}”</span>}
                        </span>
                        <span className="block text-xs text-gray-400">
                          {GENERATION_LABELS[p.generation]}{yearOf(p) ? ` · b. ${yearOf(p)}` : ''}{p.birthPlace ? ` · ${p.birthPlace}` : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {generation && (
              <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-3 py-2">
                <p className="text-[11px] text-gray-400">
                  {showAll ? 'Searching all generations' : `Showing the ${scopeLabel}`}
                </p>
                <button
                  type="button"
                  onClick={() => setShowAll(v => !v)}
                  className="text-[11px] font-semibold text-burgundy-700 hover:underline"
                >
                  {showAll ? `Only ${scopeLabel}` : 'Search everyone'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
