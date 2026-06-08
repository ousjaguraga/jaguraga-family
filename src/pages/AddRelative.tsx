import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, UserPlus } from 'lucide-react';
import { usePersonById, useAllPersons, createPerson, updatePerson } from '../hooks/useFamily';
import { fullName, generationIndex } from '../utils/helpers';
import { GENERATION_ORDER, type Gender, type Generation } from '../types';

type Role = 'father' | 'mother' | 'child';

const ROLE_LABELS: Record<Role, string> = {
  father: 'Father',
  mother: 'Mother',
  child:  'Child',
};

const ROLE_GENDERS: Record<Role, Gender> = {
  father: 'MALE',
  mother: 'FEMALE',
  child:  'MALE',
};

function nextGeneration(current: Generation, role: Role): Generation {
  const idx = generationIndex(current);
  if (role === 'child') {
    // one generation younger
    return GENERATION_ORDER[Math.min(idx + 1, GENERATION_ORDER.length - 1)];
  }
  // parent = one generation older
  return GENERATION_ORDER[Math.max(idx - 1, 0)];
}

export default function AddRelative() {
  const { personId, role } = useParams<{ personId: string; role: string }>();
  const safeRole = (role as Role) ?? 'child';

  const { person, isLoading } = usePersonById(personId);
  const { persons }            = useAllPersons();
  const navigate               = useNavigate();

  const [form, setForm] = useState({
    firstName:  '',
    lastName:   '',
    gender:     ROLE_GENDERS[safeRole],
    birthDate:  '',
    birthPlace: '',
  });
  const [saving, setSaving]   = useState(false);
  const [error,  setError]    = useState<string | null>(null);
  const [tab,    setTab]      = useState<'new' | 'existing'>('new');
  const [existingId, setExistingId] = useState('');

  function field(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));
  }

  // Candidates for linking an existing person
  const candidates = persons.filter(p => {
    if (p.id === personId) return false;
    if (safeRole === 'father') return p.gender === 'MALE';
    if (safeRole === 'mother') return p.gender === 'FEMALE';
    return true; // child — any gender
  });

  async function handleCreateNew(e: React.FormEvent) {
    e.preventDefault();
    if (!person || !personId) return;
    setError(null);
    setSaving(true);

    try {
      const gen = nextGeneration(person.generation, safeRole);

      const newPerson = await createPerson({
        firstName:     form.firstName.trim(),
        lastName:      form.lastName.trim() || person.lastName,
        middleName:    null,
        gender:        form.gender,
        birthDate:     form.birthDate || null,
        birthPlace:    form.birthPlace.trim() || null,
        bio:           null,
        photoKey:      null,
        generation:    gen,
        isAncestor:    safeRole !== 'child',
        isDeceased:    false,
        cognitoUserId: null,
        fatherId:      safeRole === 'child' ? (person.gender === 'MALE' ? personId : person.fatherId ?? null) : null,
        motherId:      safeRole === 'child' ? (person.gender === 'FEMALE' ? personId : person.motherId ?? null) : null,
        spouseId:      null,
      });

      // If adding a parent, update the current person's fatherId/motherId
      if (safeRole === 'father') {
        await updatePerson(personId, { fatherId: newPerson.id });
      } else if (safeRole === 'mother') {
        await updatePerson(personId, { motherId: newPerson.id });
      }
      // For child: the child was created with parentId already set above

      navigate(`/person/${personId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  async function handleLinkExisting(e: React.FormEvent) {
    e.preventDefault();
    if (!personId || !existingId) return;
    setError(null);
    setSaving(true);

    try {
      if (safeRole === 'father') {
        await updatePerson(personId, { fatherId: existingId });
      } else if (safeRole === 'mother') {
        await updatePerson(personId, { motherId: existingId });
      } else {
        // child: update the child's parentId
        const parentField = person?.gender === 'MALE' ? 'fatherId' : 'motherId';
        await updatePerson(existingId, { [parentField]: personId });
      }
      navigate(`/person/${personId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
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

  const roleLabel = ROLE_LABELS[safeRole];

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-10">
      <Link to={`/person/${personId}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to {fullName(person)}
      </Link>

      <h1 className="section-heading text-2xl mb-1">Add {roleLabel}</h1>
      <p className="text-gray-500 text-sm mb-6">
        Adding the {roleLabel.toLowerCase()} of <strong>{fullName(person)}</strong>.
      </p>

      {/* Tab: new vs existing */}
      <div className="flex rounded-lg overflow-hidden border border-gray-200 mb-6">
        {(['new', 'existing'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors
              ${tab === t ? 'bg-burgundy-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            {t === 'new' ? 'Create new person' : 'Link existing member'}
          </button>
        ))}
      </div>

      {tab === 'new' ? (
        <form onSubmit={handleCreateNew} className="card space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First name *</label>
              <input className="input" value={form.firstName} onChange={field('firstName')} required autoFocus />
            </div>
            <div>
              <label className="label">Last name</label>
              <input className="input" value={form.lastName} onChange={field('lastName')}
                placeholder={person.lastName} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Gender *</label>
              <select className="input" value={form.gender} onChange={field('gender')}>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Date of birth</label>
              <input type="date" className="input" value={form.birthDate} onChange={field('birthDate')} />
            </div>
          </div>

          <div>
            <label className="label">Birthplace</label>
            <input className="input" value={form.birthPlace} onChange={field('birthPlace')}
              placeholder="e.g. Susuwol, Gambia" />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button type="submit" disabled={saving || !form.firstName.trim()}
            className="btn-primary flex items-center gap-2 w-full justify-center">
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              : <><UserPlus className="w-4 h-4" /> Create & link as {roleLabel.toLowerCase()}</>
            }
          </button>
        </form>
      ) : (
        <form onSubmit={handleLinkExisting} className="card space-y-4">
          <div>
            <label className="label">Select from existing members</label>
            <select className="input" value={existingId} onChange={e => setExistingId(e.target.value)} required>
              <option value="">— Choose a person —</option>
              {candidates.map(p => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button type="submit" disabled={saving || !existingId}
            className="btn-primary flex items-center gap-2 w-full justify-center">
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Linking…</>
              : <><UserPlus className="w-4 h-4" /> Link as {roleLabel.toLowerCase()}</>
            }
          </button>
        </form>
      )}
    </div>
  );
}
