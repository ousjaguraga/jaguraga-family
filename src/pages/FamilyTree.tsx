import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Search, LayoutGrid, GitBranch, UserPlus } from 'lucide-react';
import { useAllPersons } from '../hooks/useFamily';
import FamilyTreeView from '../components/tree/FamilyTreeView';
import PersonCard from '../components/PersonCard';
import { GENERATION_LABELS, GENERATION_ORDER, type Generation } from '../types';
import { useAuth } from '../context/AuthContext';

type View = 'tree' | 'grid';

const LEGEND = [
  { label: 'Great-grandparent', color: 'from-violet-500 to-purple-700' },
  { label: 'Grandparent',       color: 'from-blue-500   to-cyan-700'   },
  { label: 'Parent',            color: 'from-emerald-500 to-teal-700'  },
  { label: 'Current gen',       color: 'from-amber-400  to-orange-500' },
  { label: 'Child',             color: 'from-rose-400   to-pink-600'   },
];

export default function FamilyTree() {
  const { persons, isLoading, error } = useAllPersons();
  const { user }                       = useAuth();
  const [view,      setView]      = useState<View>('tree');
  const [search,    setSearch]    = useState('');
  const [genFilter, setGenFilter] = useState<Generation | 'ALL'>('ALL');

  const filtered = persons.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      (p.birthPlace ?? '').toLowerCase().includes(q);
    return matchSearch && (genFilter === 'ALL' || p.generation === genFilter);
  });

  const activeGens = GENERATION_ORDER.filter(g => persons.some(p => p.generation === g));

  return (
    <div className="w-full min-h-[calc(100vh-64px)] flex flex-col"
      style={{ background: 'linear-gradient(160deg,#071e14 0%,#0d3225 50%,#071e14 100%)' }}>

      {/* ══════════════════════════════════════════════════════════════════
          STICKY CONTROLS — 3 separate rows, each full-width on mobile
      ══════════════════════════════════════════════════════════════════ */}
      <div className="sticky top-16 z-30 bg-[#0a2a1a]/95 backdrop-blur-md border-b border-white/8">

        {/* ROW 1: title + view toggle + add */}
        <div className="flex items-center gap-2 px-4 pt-3 pb-2">
          <div className="flex items-baseline gap-2 flex-1 min-w-0">
            <h1 className="font-serif text-base sm:text-lg font-bold text-white truncate">
              Jaguraga Family
            </h1>
            <span className="text-xs text-white/40 flex-shrink-0">
              {persons.length} member{persons.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-white/8 rounded-xl p-1 flex-shrink-0">
            <button onClick={() => setView('tree')} title="Tree view"
              className={`p-1.5 rounded-lg transition-colors
                ${view === 'tree' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/70'}`}>
              <GitBranch className="w-4 h-4" />
            </button>
            <button onClick={() => setView('grid')} title="Grid view"
              className={`p-1.5 rounded-lg transition-colors
                ${view === 'grid' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/70'}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {user && (
            <Link to="/setup-profile"
              className="flex-shrink-0 flex items-center gap-1.5 bg-gold-500 hover:bg-gold-400
                text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors">
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add member</span>
            </Link>
          )}
        </div>

        {/* ROW 2: search — full width */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              type="text"
              placeholder="Search by name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/8 border border-white/12 text-white text-sm
                placeholder:text-white/30 rounded-xl pl-9 pr-3 py-2.5
                focus:outline-none focus:ring-2 focus:ring-gold-500/40"
            />
          </div>
        </div>

        {/* ROW 3: generation pills — horizontal scroll, no scrollbar */}
        <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setGenFilter('ALL')}
            className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors
              ${genFilter === 'ALL' ? 'bg-gold-500 text-white' : 'bg-white/8 text-white/60 hover:bg-white/12'}`}>
            All
          </button>
          {activeGens.map(g => (
            <button key={g}
              onClick={() => setGenFilter(genFilter === g ? 'ALL' : g)}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors whitespace-nowrap
                ${genFilter === g ? 'bg-gold-500 text-white' : 'bg-white/8 text-white/60 hover:bg-white/12'}`}>
              {GENERATION_LABELS[g]}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-64 gap-3 text-white/40">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64 px-4">
            <div className="bg-red-900/40 border border-red-500/30 text-red-300 rounded-2xl px-6 py-4 text-sm text-center">
              {error}
            </div>
          </div>
        ) : view === 'tree' ? (
          <FamilyTreeView persons={filtered} />
        ) : (
          <div className="p-4 sm:p-6">
            {filtered.length === 0 ? (
              <p className="text-center py-20 text-white/40 text-sm">No members match your search.</p>
            ) : (
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filtered.map(p => <PersonCard key={p.id} person={p} compact />)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          LEGEND — wraps on mobile
      ══════════════════════════════════════════════════════════════════ */}
      {view === 'tree' && !isLoading && persons.length > 0 && (
        <div className="flex items-center justify-center gap-3 sm:gap-5 py-3 px-4
          border-t border-white/8 flex-wrap">
          {LEGEND.map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 bg-gradient-to-br ${item.color}`} />
              <span className="text-[10px] text-white/40 font-medium whitespace-nowrap">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
