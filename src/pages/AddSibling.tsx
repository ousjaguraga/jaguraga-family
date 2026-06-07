import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, UserPlus, PlusCircle } from 'lucide-react';
import { usePersonById, useAllPersons, addSibling, createPerson } from '../hooks/useFamily';
import { useAuth } from '../context/AuthContext';
import { fullName } from '../utils/helpers';
import { GENERATION_LABELS, type Gender, type SiblingType } from '../types';

type Mode = 'select' | 'create';

export default function AddSibling() {
  const { id }                        = useParams<{ id: string }>();
  const { person, isLoading }          = usePersonById(id);
  const { persons }                    = useAllPersons();
  const { user }                       = useAuth();
  const navigate                       = useNavigate();

  const [mode,        setMode]        = useState<Mode>('select');
  const [selectedId,  setSelectedId]  = useState('');
  const [siblingType, setSiblingType] = useState<SiblingType>('FULL');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  // New sibling form
  const [newFirst,  setNewFirst]  = useState('');
  const [newLast,   setNewLast]   = useState(person?.lastName ?? '');
  const [newGender, setNewGender] = useState<Gender>('MALE');
  const [newBirth,  setNewBirth]  = useState('');

  // Filter out self and persons already confirmed as siblings
  const candidates = persons.filter(p => p.id !== id);

  async function handleLinkExisting(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !selectedId) return;
    setSaving(true);
    setError(null);
    try {
      await addSibling(id, selectedId, siblingType);
      navigate(`/person/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link sibling.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateNew(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !user || !person) return;
    setSaving(true);
    setError(null);
    try {
      const newPerson = await createPerson({
        firstName:     newFirst.trim(),
        lastName:      newLast.trim() || person.lastName,
        gender:        newGender,
        birthDate:     newBirth || null,
        birthPlace:    person.birthPlace,
        generation:    person.generation,
        isAncestor:    false,
        isDeceased:    false,
        cognitoUserId: null,
        fatherId:      person.fatherId,
        motherId:      person.motherId,
        spouseId:      null,
        middleName:    null,
        bio:           null,
        photoKey:      null,
      });
      await addSibling(id, newPerson.id, siblingType);
      navigate(`/person/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sibling.');
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  );

  if (!person) return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center text-red-600">Person not found.</div>
  );

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-10">
      <Link to={`/person/${id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to {fullName(person)}
      </Link>

      <h1 className="section-heading text-2xl mb-1">Add a Sibling</h1>
      <p className="text-gray-500 text-sm mb-8">
        Link a sibling to <strong>{fullName(person)}</strong>.
      </p>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('select')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors
            ${mode === 'select'
              ? 'bg-burgundy-800 text-white border-burgundy-800'
              : 'bg-white text-gray-600 border-gray-200 hover:border-burgundy-300'
            }`}
        >
          Select existing member
        </button>
        <button
          onClick={() => setMode('create')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-colors
            ${mode === 'create'
              ? 'bg-burgundy-800 text-white border-burgundy-800'
              : 'bg-white text-gray-600 border-gray-200 hover:border-burgundy-300'
            }`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <PlusCircle className="w-4 h-4" />
            Create new entry
          </span>
        </button>
      </div>

      {mode === 'select' ? (
        <form onSubmit={handleLinkExisting} className="card space-y-5">
          <div>
            <label className="label">Choose sibling from existing members</label>
            <select
              className="input"
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              required
            >
              <option value="">— Select a person —</option>
              {candidates.map(p => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName} — {GENERATION_LABELS[p.generation]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Sibling relationship type</label>
            <select className="input" value={siblingType} onChange={e => setSiblingType(e.target.value as SiblingType)}>
              <option value="FULL">Full sibling (same parents)</option>
              <option value="HALF">Half sibling (one shared parent)</option>
              <option value="STEP">Step sibling</option>
            </select>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button type="submit" disabled={saving || !selectedId} className="btn-primary flex items-center gap-2 w-full justify-center">
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Linking…</>
              : <><UserPlus className="w-4 h-4" /> Link sibling</>
            }
          </button>
        </form>
      ) : (
        <form onSubmit={handleCreateNew} className="card space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First name *</label>
              <input className="input" value={newFirst} onChange={e => setNewFirst(e.target.value)} required />
            </div>
            <div>
              <label className="label">Last name</label>
              <input className="input" value={newLast} onChange={e => setNewLast(e.target.value)} placeholder={person.lastName} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Gender *</label>
              <select className="input" value={newGender} onChange={e => setNewGender(e.target.value as Gender)}>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Date of birth</label>
              <input type="date" className="input" value={newBirth} onChange={e => setNewBirth(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Sibling relationship type</label>
            <select className="input" value={siblingType} onChange={e => setSiblingType(e.target.value as SiblingType)}>
              <option value="FULL">Full sibling (same parents)</option>
              <option value="HALF">Half sibling (one shared parent)</option>
              <option value="STEP">Step sibling</option>
            </select>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button type="submit" disabled={saving || !newFirst.trim()} className="btn-primary flex items-center gap-2 w-full justify-center">
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
              : <><PlusCircle className="w-4 h-4" /> Create & link sibling</>
            }
          </button>
        </form>
      )}
    </div>
  );
}
