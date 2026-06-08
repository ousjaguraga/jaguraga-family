import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import { createPerson, updatePerson, useAllPersons } from '../../hooks/useFamily';
import { usePersonById } from '../../hooks/useFamily';
import PhotoUpload from '../../components/PhotoUpload';
import { GENERATION_LABELS, GENERATION_ORDER, type Generation, type Gender, type Person } from '../../types';

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'MALE',   label: 'Male'   },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER',  label: 'Other'  },
];

export default function AddAncestor() {
  const { id }                  = useParams<{ id?: string }>();  // present when editing
  const isEdit                  = Boolean(id);
  const { person, isLoading: loadingExisting } = usePersonById(id);
  const { persons }             = useAllPersons();
  const navigate                = useNavigate();

  const [form, setForm] = useState({
    firstName:  '',
    lastName:   'Jaguraga',
    middleName: '',
    gender:     'MALE' as Gender,
    birthDate:  '',
    deathDate:  '',
    birthPlace: '',
    bio:        '',
    generation: 'GRANDPARENT' as Generation,
    isDeceased: false,
    fatherId:   '',
    motherId:   '',
    spouseId:   '',
  });
  const [photoKey, setPhotoKey] = useState<string | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [savedId,  setSavedId]  = useState<string | null>(id ?? null);

  // Pre-fill when editing
  useEffect(() => {
    if (!person) return;
    setForm({
      firstName:  person.firstName,
      lastName:   person.lastName,
      middleName: person.middleName ?? '',
      gender:     person.gender,
      birthDate:  person.birthDate ?? '',
      deathDate:  person.deathDate ?? '',
      birthPlace: person.birthPlace ?? '',
      bio:        person.bio ?? '',
      generation: person.generation,
      isDeceased: person.isDeceased ?? false,
      fatherId:   person.fatherId ?? '',
      motherId:   person.motherId ?? '',
      spouseId:   person.spouseId ?? '',
    });
    setPhotoKey(person.photoKey ?? null);
    setSavedId(person.id);
  }, [person]);

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value = e.target.type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : e.target.value;
      setForm(f => ({ ...f, [key]: value }));
    };
  }

  // Ancestors that could be parents of this person (older generations)
  const parentCandidates = persons.filter(p => {
    if (p.id === id) return false;
    const genIdx   = GENERATION_ORDER.indexOf(form.generation);
    const candIdx  = GENERATION_ORDER.indexOf(p.generation);
    return candIdx < genIdx; // strictly older generation
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const payload: Omit<Person, 'id' | 'createdAt' | 'updatedAt' | 'owner'> = {
        firstName:     form.firstName.trim(),
        lastName:      form.lastName.trim(),
        middleName:    form.middleName.trim() || null,
        gender:        form.gender,
        birthDate:     form.birthDate || null,
        deathDate:     form.deathDate || null,
        birthPlace:    form.birthPlace.trim() || null,
        bio:           form.bio.trim() || null,
        generation:    form.generation,
        isAncestor:    true,
        isDeceased:    form.isDeceased,
        cognitoUserId: null,
        fatherId:      form.fatherId || null,
        motherId:      form.motherId || null,
        spouseId:      form.spouseId || null,
        photoKey:      photoKey,
      };

      let saved: Person;
      if (isEdit && id) {
        saved = await updatePerson(id, payload);
      } else {
        saved = await createPerson(payload);
        setSavedId(saved.id);
      }

      navigate(`/person/${saved.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save ancestor.');
    } finally {
      setSaving(false);
    }
  }

  if (isEdit && loadingExisting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Admin
      </Link>

      <h1 className="section-heading text-3xl mb-1">
        {isEdit ? 'Edit Ancestor' : 'Add Ancestor'}
      </h1>
      <p className="text-gray-500 text-sm mb-8">
        {isEdit
          ? 'Update the details for this ancestor.'
          : 'Add an elder to the family tree. These ancestors appear in the lineage selector for all users.'
        }
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo */}
        {savedId && (
          <div className="card flex flex-col items-center">
            <h2 className="font-semibold text-gray-700 mb-3">Photo</h2>
            <PhotoUpload personId={savedId} currentKey={photoKey} onUploaded={setPhotoKey} />
          </div>
        )}

        {/* Details */}
        <div className="card space-y-5">
          <h2 className="font-serif text-lg font-semibold text-gray-800">Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">First name *</label>
              <input className="input" value={form.firstName} onChange={field('firstName')} required />
            </div>
            <div>
              <label className="label">Middle name</label>
              <input className="input" value={form.middleName} onChange={field('middleName')} />
            </div>
            <div>
              <label className="label">Last name *</label>
              <input className="input" value={form.lastName} onChange={field('lastName')} required />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Gender *</label>
              <select className="input" value={form.gender} onChange={field('gender')} required>
                {GENDER_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Generation *</label>
              <select className="input" value={form.generation} onChange={field('generation')} required>
                {GENERATION_ORDER.map(g => (
                  <option key={g} value={g}>{GENERATION_LABELS[g]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Date of birth</label>
              <input type="date" className="input" value={form.birthDate} onChange={field('birthDate')} />
            </div>
            <div>
              <label className="label">Birthplace</label>
              <input className="input" placeholder="e.g. Susuwol, Gambia" value={form.birthPlace} onChange={field('birthPlace')} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Date of death</label>
              <input type="date" className="input" value={form.deathDate} onChange={field('deathDate')} />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="isDeceased"
                checked={form.isDeceased}
                onChange={field('isDeceased')}
                className="w-4 h-4 accent-burgundy-700"
              />
              <label htmlFor="isDeceased" className="text-sm font-medium text-gray-700">
                Mark as deceased
              </label>
            </div>
          </div>

          <div>
            <label className="label">Biography / notes</label>
            <textarea
              className="input resize-none"
              rows={4}
              placeholder="Write about this ancestor's life, achievements, and legacy…"
              value={form.bio}
              onChange={field('bio')}
            />
          </div>
        </div>

        {/* Parent links */}
        <div className="card space-y-5">
          <h2 className="font-serif text-lg font-semibold text-gray-800">Parent & Spouse Links</h2>
          <p className="text-xs text-gray-400">
            Optional — link this person to their parents or spouse if they're already in the tree.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Father</label>
              <select className="input" value={form.fatherId} onChange={field('fatherId')}>
                <option value="">— None —</option>
                {parentCandidates.filter(p => p.gender === 'MALE').map(p => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} ({GENERATION_LABELS[p.generation]})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Mother</label>
              <select className="input" value={form.motherId} onChange={field('motherId')}>
                <option value="">— None —</option>
                {parentCandidates.filter(p => p.gender === 'FEMALE').map(p => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} ({GENERATION_LABELS[p.generation]})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Spouse</label>
            <select className="input" value={form.spouseId} onChange={field('spouseId')}>
              <option value="">— None —</option>
              {persons.filter(p => p.id !== id).map(p => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName} ({GENERATION_LABELS[p.generation]})
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              : <><Save className="w-4 h-4" /> {isEdit ? 'Save Changes' : 'Add Ancestor'}</>
            }
          </button>
          <button type="button" onClick={() => navigate('/admin')} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
