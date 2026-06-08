import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { useAllPersons } from '../hooks/useFamily';
import FamilyTreeView from '../components/tree/FamilyTreeView';
import { GENERATION_LABELS, GENERATION_ORDER, type Generation } from '../types';

export default function FamilyTree() {
  const { persons, isLoading, error } = useAllPersons();
  const [search,    setSearch]    = useState('');
  const [genFilter, setGenFilter] = useState<Generation | 'ALL'>('ALL');

  const filtered = persons.filter(p => {
    const matchSearch =
      !search ||
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      (p.birthPlace ?? '').toLowerCase().includes(search.toLowerCase());
    const matchGen = genFilter === 'ALL' || p.generation === genFilter;
    return matchSearch && matchGen;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-6">
        <h1 className="section-heading text-3xl">Jaguraga Family Tree</h1>
        <p className="text-gray-500 mt-1">
          {persons.length} member{persons.length !== 1 ? 's' : ''} — tap any name to see their connections
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9 text-sm"
          />
        </div>
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
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading…</span>
        </div>
      ) : error ? (
        <div className="card border-red-200 bg-red-50 text-red-700 py-8 text-center">{error}</div>
      ) : (
        <div className="card">
          <FamilyTreeView persons={filtered} />
        </div>
      )}
    </div>
  );
}
