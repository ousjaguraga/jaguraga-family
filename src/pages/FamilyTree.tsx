import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Download,
  GitBranch,
  LayoutGrid,
  Loader2,
  MapPin,
  Search,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useAllPersons } from '../hooks/useFamily';
import FamilyTreeView, { HierarchyList } from '../components/tree/FamilyTreeView';
import ExportTreeDialog from '../components/ExportTreeDialog';
import { GENERATION_LABELS, GENERATION_ORDER, type Generation } from '../types';
import { useAuth } from '../context/AuthContext';

type View = 'tree' | 'grid';

const GENERATION_DOTS: Record<Generation, string> = {
  GREAT_GRANDPARENT: 'bg-violet-500',
  GRANDPARENT: 'bg-sky-500',
  PARENT: 'bg-emerald-500',
  CURRENT: 'bg-amber-500',
  CHILD: 'bg-rose-500',
};

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.08] px-3 py-3 backdrop-blur-sm">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 text-gold-300">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-semibold leading-none text-white">{value}</p>
        <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-white/60">{label}</p>
      </div>
    </div>
  );
}

export default function FamilyTree() {
  const { persons, isLoading, error } = useAllPersons();
  const { user } = useAuth();
  const [view, setView] = useState<View>('tree');
  const [search, setSearch] = useState('');
  const [genFilter, setGenFilter] = useState<Generation | 'ALL'>('ALL');
  const [showExport, setShowExport] = useState(false);

  const myPersonId = persons.find(p => p.cognitoUserId === user?.userId)?.id ?? null;
  const authBlocked = Boolean(error && !user && /jwt|unauthorized|not authorized|auth/i.test(error));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return persons.filter(person => {
      const name = `${person.firstName} ${person.middleName ?? ''} ${person.lastName}`.toLowerCase();
      const place = (person.birthPlace ?? '').toLowerCase();
      const matchSearch = !q || name.includes(q) || place.includes(q);
      const matchGeneration = genFilter === 'ALL' || person.generation === genFilter;
      return matchSearch && matchGeneration;
    });
  }, [genFilter, persons, search]);

  const activeGenerations = useMemo(
    () => GENERATION_ORDER.filter(generation => persons.some(person => person.generation === generation)),
    [persons],
  );

  const stats = useMemo(() => {
    const places = new Set(
      persons
        .map(person => person.birthPlace?.trim())
        .filter((place): place is string => Boolean(place)),
    );

    const spousePairs = new Set<string>();
    let parentLinks = 0;

    persons.forEach(person => {
      if (person.fatherId) parentLinks += 1;
      if (person.motherId) parentLinks += 1;
      if (person.spouseId) {
        spousePairs.add([person.id, person.spouseId].sort().join(':'));
      }
    });

    return {
      generations: activeGenerations.length,
      places: places.size,
      connections: parentLinks + spousePairs.size,
    };
  }, [activeGenerations.length, persons]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-cream-50 text-gray-900">
      <section className="border-b border-burgundy-950/10 bg-burgundy-900 text-white">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-300/90">
                Jaguraga lineage
              </p>
              <h1 className="mt-2 font-serif text-3xl font-bold leading-tight text-white sm:text-4xl">
                Family Tree
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
                A clear map of names, places, and generations across the family.
              </p>
            </div>

            {user && (
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                {persons.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowExport(true)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/20 sm:w-auto"
                  >
                    <Download className="h-4 w-4" />
                    Export my tree
                  </button>
                )}
                <Link
                  to="/setup-profile"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gold-500 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-black/10 transition hover:bg-gold-400 sm:w-auto"
                >
                  <UserPlus className="h-4 w-4" />
                  Add member
                </Link>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Metric icon={Users} label="Members" value={persons.length} />
            <Metric icon={GitBranch} label="Generations" value={stats.generations} />
            <Metric icon={MapPin} label="Places" value={stats.places} />
            <Metric icon={Users} label="Connections" value={stats.connections} />
          </div>
        </div>
      </section>

      <section className="sticky top-16 z-30 border-b border-burgundy-900/10 bg-cream-50/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_auto] lg:items-center">
            <div className="relative">
              <label htmlFor="family-tree-search" className="sr-only">Search family tree</label>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-burgundy-900/40" />
              <input
                id="family-tree-search"
                type="text"
                placeholder="Name or birthplace"
                value={search}
                onChange={event => setSearch(event.target.value)}
                className="h-11 w-full rounded-lg border border-burgundy-900/10 bg-white pl-10 pr-10 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-gold-500 focus:ring-4 focus:ring-gold-500/20"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-lg border border-burgundy-900/10 bg-white p-1 shadow-sm sm:inline-grid sm:w-fit">
              <button
                type="button"
                onClick={() => setView('tree')}
                aria-pressed={view === 'tree'}
                className={`inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition ${
                  view === 'tree'
                    ? 'bg-burgundy-800 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <GitBranch className="h-4 w-4" />
                Tree
              </button>
              <button
                type="button"
                onClick={() => setView('grid')}
                aria-pressed={view === 'grid'}
                className={`inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition ${
                  view === 'grid'
                    ? 'bg-burgundy-800 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                Directory
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setGenFilter('ALL')}
              className={`flex flex-shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                genFilter === 'ALL'
                  ? 'bg-burgundy-800 text-white shadow-sm'
                  : 'border border-burgundy-900/10 bg-white text-gray-600 hover:border-burgundy-900/20 hover:text-gray-900'
              }`}
            >
              All
              <span className="rounded-md bg-black/[0.08] px-1.5 py-0.5 text-[10px]">{persons.length}</span>
            </button>

            {activeGenerations.map(generation => {
              const count = persons.filter(person => person.generation === generation).length;
              const active = genFilter === generation;

              return (
                <button
                  key={generation}
                  type="button"
                  onClick={() => setGenFilter(active ? 'ALL' : generation)}
                  className={`flex flex-shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    active
                      ? 'bg-burgundy-800 text-white shadow-sm'
                      : 'border border-burgundy-900/10 bg-white text-gray-600 hover:border-burgundy-900/20 hover:text-gray-900'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${GENERATION_DOTS[generation]}`} />
                  <span className="whitespace-nowrap">{GENERATION_LABELS[generation]}</span>
                  <span className="rounded-md bg-black/[0.08] px-1.5 py-0.5 text-[10px]">{count}</span>
                </button>
              );
            })}
          </div>

          <p className="text-xs font-medium text-gray-500">
            Showing {filtered.length} of {persons.length}
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-[1600px] px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        {isLoading ? (
          <div className="flex min-h-[360px] items-center justify-center gap-3 rounded-lg border border-burgundy-900/10 bg-white text-gray-500 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-burgundy-700" />
            <span className="text-sm font-medium">Loading family records</span>
          </div>
        ) : error ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-burgundy-900/10 bg-white px-4 text-center shadow-sm">
            <div className="max-w-md">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-burgundy-50 text-burgundy-700">
                <GitBranch className="h-5 w-5" />
              </div>
              <h2 className="mt-4 font-serif text-2xl font-bold text-gray-950">
                {authBlocked ? 'Sign in to view the tree' : 'Unable to load family records'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                {authBlocked
                  ? 'Family records are available to signed-in members.'
                  : error}
              </p>
              {authBlocked && (
                <Link
                  to="/auth"
                  className="mt-5 inline-flex items-center justify-center rounded-lg bg-burgundy-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-burgundy-700"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        ) : view === 'tree' ? (
          <FamilyTreeView persons={filtered} />
        ) : (
          <div className="space-y-4">
            {!myPersonId && (
              <div className="flex flex-col gap-3 rounded-xl border border-gold-300 bg-gold-50 p-4 sm:flex-row sm:items-center">
                <div className="flex-1">
                  {user ? (
                    <>
                      <p className="font-serif text-base font-bold text-gray-900">
                        You're not in the family tree yet
                      </p>
                      <p className="mt-0.5 text-sm text-gray-600">
                        Find your existing entry, or create one if you are not listed.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-serif text-base font-bold text-gray-900">
                        Are you part of this family?
                      </p>
                      <p className="mt-0.5 text-sm text-gray-600">
                        Sign in to see where you fit and add yourself to the tree.
                      </p>
                    </>
                  )}
                </div>
                {user ? (
                  <Link
                    to="/setup-profile"
                    className="inline-flex flex-shrink-0 items-center gap-2 rounded-lg bg-burgundy-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-burgundy-700"
                  >
                    <UserPlus className="h-4 w-4" />
                    Find yourself
                  </Link>
                ) : (
                  <Link
                    to="/auth"
                    className="inline-flex flex-shrink-0 items-center gap-2 rounded-lg bg-burgundy-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-burgundy-700"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            )}
            <HierarchyList persons={filtered} />
          </div>
        )}
      </main>

      {showExport && (
        <ExportTreeDialog
          persons={persons}
          defaultPersonId={myPersonId}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
