import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { useAllPersons } from '../hooks/useFamily';
import FamilyTreeView from '../components/tree/FamilyTreeView';
import PersonCard from '../components/PersonCard';
import { GENERATION_LABELS, GENERATION_ORDER, type Generation } from '../types';

type ViewMode = 'tree' | 'list';

export default function FamilyTree() {
  const { persons, isLoading, error } = useAllPersons();
  const [viewMode,     setViewMode]     = useState<ViewMode>('tree');
  const [searchQuery,  setSearchQuery]  = useState('');
  const [genFilter,    setGenFilter]    = useState<Generation | 'ALL'>('ALL');

  const filtered = persons.filter(p => {
    const matchSearch =
      !searchQuery ||
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.birthPlace ?? '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchGen = genFilter === 'ALL' || p.generation === genFilter;

    return matchSearch && matchGen;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-6">
        <h1 className="section-heading text-3xl">Jaguraga Family Tree</h1>
        <p className="text-gray-500 mt-1">
          {persons.length} member{persons.length !== 1 ? 's' : ''} across {
            GENERATION_ORDER.filter(g => persons.some(p => p.generation === g)).length
          } generations
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or birthplace…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input pl-9 text-sm"
          />
        </div>

        {/* Generation filter */}
        <select
          value={genFilter}
          onChange={e => setGenFilter(e.target.value as Generation | 'ALL')}
          className="input text-sm w-auto"
        >
          <option value="ALL">All generations</option>
          {GENERATION_ORDER.map(g => (
            <option key={g} value={g}>{GENERATION_LABELS[g]}</option>
          ))}
        </select>

        {/* View toggle */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200">
          {(['tree', 'list'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors
                ${viewMode === mode
                  ? 'bg-burgundy-800 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading family tree…</span>
        </div>
      ) : error ? (
        <div className="card border-red-200 bg-red-50 text-red-700 py-8 text-center">
          {error}
        </div>
      ) : viewMode === 'tree' ? (
        <div className="card overflow-hidden">
          <FamilyTreeView persons={filtered} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length > 0
            ? filtered.map(p => <PersonCard key={p.id} person={p} />)
            : (
              <div className="col-span-full text-center py-16 text-gray-400">
                No members match your search.
              </div>
            )
          }
        </div>
      )}
    </div>
  );
}
