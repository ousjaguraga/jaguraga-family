import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createPerson, updatePerson, useAllPersons } from '../hooks/useFamily';
import PhotoUpload from '../components/PhotoUpload';
import PersonPicker from '../components/PersonPicker';
import { generationAbove } from '../utils/helpers';
import { GENERATION_LABELS, GENERATION_ORDER, type Generation, type Gender, type Person } from '../types';

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'MALE',   label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER',  label: 'Other' },
];

export default function SetupProfile() {
  const { id: routePersonId } = useParams<{ id?: string }>();
  const isEditRoute = Boolean(routePersonId);

  const { user, userAttrs, refreshUser, isAdmin } = useAuth();
  const { persons, isLoading: isPersonsLoading } = useAllPersons();
  const navigate = useNavigate();

  // Route edit mode: edit a specific person. Setup mode: edit/create own profile.
  const ownPerson = persons.find(p => p.cognitoUserId === user?.userId);
  const existing = isEditRoute
    ? persons.find(p => p.id === routePersonId)
    : ownPerson;

  const isOwner = user?.userId === existing?.owner?.split('::')[1] ||
                  user?.userId === existing?.cognitoUserId;
  const canEditTarget = !isEditRoute || Boolean(isAdmin || isOwner);

  const [form, setForm] = useState({
    firstName:  userAttrs['given_name']  ?? '',
    lastName:   userAttrs['family_name'] ?? '',
    middleName: '',
    nickname:   '',
    gender:     'MALE' as Gender,
    birthDate:  '',
    birthPlace: '',
    bio:        '',
    generation: 'CURRENT' as Generation,
    fatherId:   '',
    motherId:   '',
    spouseId:   '',
  });
  const [photoKey, setPhotoKey] = useState<string | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);

  // Pre-fill from existing person record
  useEffect(() => {
    if (!existing) return;
    setPersonId(existing.id);
    setForm({
      firstName:  existing.firstName,
      lastName:   existing.lastName,
      middleName: existing.middleName ?? '',
      nickname:   existing.nickname ?? '',
      gender:     existing.gender,
      birthDate:  existing.birthDate ?? '',
      birthPlace: existing.birthPlace ?? '',
      bio:        existing.bio ?? '',
      generation: existing.generation,
      fatherId:   existing.fatherId ?? '',
      motherId:   existing.motherId ?? '',
      spouseId:   existing.spouseId ?? '',
    });
    setPhotoKey(existing.photoKey ?? null);
  }, [existing]);

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm(f => ({ ...f, [key]: e.target.value }));
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || (isEditRoute && (!existing || !canEditTarget))) return;
    setError(null);
    setSaving(true);

    try {
      const payload: Omit<Person, 'id' | 'createdAt' | 'updatedAt' | 'owner'> = {
        firstName:     form.firstName.trim(),
        lastName:      form.lastName.trim(),
        middleName:    form.middleName.trim() || null,
        nickname:      form.nickname.trim() || null,
        gender:        form.gender,
        birthDate:     form.birthDate || null,
        birthPlace:    form.birthPlace.trim() || null,
        bio:           form.bio.trim() || null,
        generation:    form.generation,
        isAncestor:    existing?.isAncestor ?? false,
        isDeceased:    existing?.isDeceased ?? false,
        cognitoUserId: isEditRoute ? (existing?.cognitoUserId ?? null) : user.userId,
        fatherId:      form.fatherId || null,
        motherId:      form.motherId || null,
        spouseId:      form.spouseId || null,
        photoKey:      photoKey,
      };

      let saved: Person;
      if (personId) {
        saved = await updatePerson(personId, payload);
      } else {
        saved = await createPerson(payload);
        setPersonId(saved.id);
      }

      await refreshUser();
      navigate(`/person/${saved.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  if (isEditRoute && isPersonsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isEditRoute && !existing) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center text-red-600">
        Person not found.
      </div>
    );
  }

  if (isEditRoute && !canEditTarget) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center text-red-600">
        You are not allowed to edit this person.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="section-heading text-3xl">
          {isEditRoute ? 'Edit Person' : personId ? 'Edit My Profile' : 'Set Up My Profile'}
        </h1>
        <p className="text-gray-500 mt-1">
          {isEditRoute
            ? 'Update this person in the family tree.'
            : personId
            ? 'Update your details in the family tree.'
            : 'Create your profile and link yourself to the family tree.'
          }
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Photo */}
        <div className="card flex flex-col items-center gap-2">
          <h2 className="font-semibold text-gray-700 mb-2">Profile Photo</h2>
          {personId ? (
            <PhotoUpload
              personId={personId}
              currentKey={photoKey}
              onUploaded={key => {
                setPhotoKey(key);
                // persist right away so the photo isn't lost if they never hit Save
                updatePerson(personId, { photoKey: key }).catch(() => {});
              }}
            />
          ) : (
            <p className="text-center text-sm text-gray-400">
              Save your profile first — then you can add a photo here.
            </p>
          )}
        </div>

        {/* Basic info */}
        <div className="card space-y-5">
          <h2 className="font-serif text-lg font-semibold text-gray-800">Personal Details</h2>

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

          <div>
            <label className="label">Nickname</label>
            <input
              className="input"
              placeholder="What the family calls you, e.g. Jagu"
              value={form.nickname}
              onChange={field('nickname')}
            />
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
              <label className="label">Generation</label>
              <select className="input" value={form.generation} onChange={field('generation')}>
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
              <label className="label">Birthplace / hometown</label>
              <input className="input" placeholder="e.g. Suduwol, Gambia" value={form.birthPlace} onChange={field('birthPlace')} />
            </div>
          </div>

          <div>
            <label className="label">About me (bio)</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Write a short bio about yourself…"
              value={form.bio}
              onChange={field('bio')}
            />
          </div>
        </div>

        {/* Family links */}
        <div className="card space-y-5">
          <h2 className="font-serif text-lg font-semibold text-gray-800">Family Links</h2>
          <p className="text-sm text-gray-500">
            Search for your father, mother, or spouse. The list shows the right
            generation automatically — parents come from the generation above yours.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PersonPicker
              label="Father"
              persons={persons}
              value={form.fatherId}
              onChange={id => setForm(f => ({ ...f, fatherId: id }))}
              excludeIds={personId ? [personId] : []}
              filterGender="MALE"
              generation={generationAbove(form.generation)}
              placeholder="Search for your father…"
            />
            <PersonPicker
              label="Mother"
              persons={persons}
              value={form.motherId}
              onChange={id => setForm(f => ({ ...f, motherId: id }))}
              excludeIds={personId ? [personId] : []}
              filterGender="FEMALE"
              generation={generationAbove(form.generation)}
              placeholder="Search for your mother…"
            />
          </div>

          <PersonPicker
            label="Spouse / partner"
            persons={persons}
            value={form.spouseId}
            onChange={id => setForm(f => ({ ...f, spouseId: id }))}
            excludeIds={personId ? [personId] : []}
            generation={form.generation}
            placeholder="Search for your spouse…"
          />
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
              : <><Save className="w-4 h-4" /> {personId ? 'Save Changes' : 'Create Profile'}</>
            }
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
