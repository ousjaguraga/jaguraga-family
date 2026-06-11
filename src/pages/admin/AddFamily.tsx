import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Heart, Loader2, Save, Search } from 'lucide-react';
import PersonPicker from '../../components/PersonPicker';
import { useAllPersons, updatePerson } from '../../hooks/useFamily';
import { createFamilyUnion } from '../../hooks/useFamilyUnions';
import { fullName, generationBelow } from '../../utils/helpers';
import type { FamilyUnionStatus } from '../../types';

export default function AddFamily() {
  const { persons, isLoading } = useAllPersons();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [partner1Id, setPartner1Id] = useState(searchParams.get('personId') ?? '');
  const [partner2Id, setPartner2Id] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<FamilyUnionStatus>('UNKNOWN');
  const [notes, setNotes] = useState('');
  const [childSearch, setChildSearch] = useState('');
  const [childIds, setChildIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const partner1 = persons.find(person => person.id === partner1Id) ?? null;
  const partner2 = persons.find(person => person.id === partner2Id) ?? null;
  const father = [partner1, partner2].find(person => person?.gender === 'MALE') ?? null;
  const mother = [partner1, partner2].find(person => person?.gender === 'FEMALE') ?? null;
  const childGeneration = partner1 ? generationBelow(partner1.generation) : null;

  const childCandidates = useMemo(() => {
    const q = childSearch.trim().toLowerCase();
    return persons
      .filter(person => person.id !== partner1Id && person.id !== partner2Id)
      .filter(person => !childGeneration || person.generation === childGeneration)
      .filter(person => !father || !person.fatherId || person.fatherId === father.id)
      .filter(person => !mother || !person.motherId || person.motherId === mother.id)
      .filter(person => !q || fullName(person).toLowerCase().includes(q))
      .sort((a, b) => fullName(a).localeCompare(fullName(b)));
  }, [childGeneration, childSearch, father, mother, partner1Id, partner2Id, persons]);

  function toggleChild(id: string) {
    setChildIds(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!partner1 || !partner2) return;
    setSaving(true);
    setError(null);
    try {
      if (childIds.size > 0 && (!father || !mother)) {
        throw new Error('Children can only be linked when the family has one male and one female parent.');
      }
      const selectedChildren = [...childIds]
        .map(id => persons.find(person => person.id === id))
        .filter((person): person is NonNullable<typeof person> => Boolean(person));
      const conflict = selectedChildren.find(child =>
        (father && child.fatherId && child.fatherId !== father.id) ||
        (mother && child.motherId && child.motherId !== mother.id));
      if (conflict) {
        throw new Error(`${fullName(conflict)} already has a conflicting parent link.`);
      }

      await createFamilyUnion({
        partner1Id: partner1.id,
        partner2Id: partner2.id,
        startDate: startDate || null,
        endDate: endDate || null,
        status,
        notes: notes.trim() || null,
      });

      await Promise.all(
        selectedChildren.map(child => updatePerson(child.id, {
          fatherId: father?.id ?? null,
          motherId: mother?.id ?? null,
        })),
      );

      navigate('/family-tree');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add family.');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link to="/admin" className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft className="h-4 w-4" /> Back to Admin
      </Link>

      <div className="mb-8">
        <h1 className="section-heading text-3xl">Add Family</h1>
        <p className="mt-1 text-gray-500">
          Record a marriage or partnership directly. Each person can belong to multiple families.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card space-y-5">
          <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-gray-800">
            <Heart className="h-4 w-4 text-burgundy-600" /> Partners
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <PersonPicker
              label="First partner"
              persons={persons}
              value={partner1Id}
              onChange={setPartner1Id}
              excludeIds={partner2Id ? [partner2Id] : []}
              placeholder="Search for the first partner…"
            />
            <PersonPicker
              label="Second partner"
              persons={persons}
              value={partner2Id}
              onChange={setPartner2Id}
              excludeIds={partner1Id ? [partner1Id] : []}
              generation={partner1?.generation ?? null}
              placeholder="Search for the second partner…"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Relationship status</label>
              <select className="input" value={status} onChange={e => setStatus(e.target.value as FamilyUnionStatus)}>
                <option value="UNKNOWN">Unknown / not recorded</option>
                <option value="CURRENT">Current</option>
                <option value="ENDED">Ended / former</option>
              </select>
            </div>
            <div>
              <label className="label">Started</label>
              <input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Ended</label>
              <input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional marriage or family notes…" />
          </div>
        </div>

        <div className="card space-y-4">
          <div>
            <h2 className="font-serif text-lg font-semibold text-gray-800">Children in this family</h2>
            <p className="mt-1 text-xs text-gray-500">
              Optional. Existing parent links are never replaced with conflicting parents.
            </p>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
            <input className="input pl-9" value={childSearch} onChange={e => setChildSearch(e.target.value)} placeholder="Find a child…" />
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-gray-100 p-2">
            {childCandidates.length === 0 ? (
              <p className="px-2 py-4 text-center text-sm text-gray-400">No compatible children found.</p>
            ) : childCandidates.map(child => (
              <label key={child.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={childIds.has(child.id)}
                  onChange={() => toggleChild(child.id)}
                  className="h-4 w-4 accent-burgundy-700"
                />
                <span className="text-sm font-medium text-gray-800">{fullName(child)}</span>
              </label>
            ))}
          </div>
        </div>

        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={saving || !partner1Id || !partner2Id} className="btn-primary flex items-center gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Add family
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  );
}
