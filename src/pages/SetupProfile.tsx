import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Loader2, Save, Search, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createPerson, updatePerson, useAllPersons } from '../hooks/useFamily';
import { cancelJoinRequest, createJoinRequest, useJoinRequests } from '../hooks/useRequests';
import PhotoUpload from '../components/PhotoUpload';
import PersonPicker from '../components/PersonPicker';
import { fullName, generationAbove } from '../utils/helpers';
import { GENERATION_LABELS, GENERATION_ORDER, type Generation, type Gender, type Person } from '../types';

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'MALE',   label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER',  label: 'Other' },
];

type SetupMode = 'choose' | 'claim' | 'create';

export default function SetupProfile() {
  const { id: routePersonId } = useParams<{ id?: string }>();
  const isEditRoute = Boolean(routePersonId);

  const { user, userAttrs, refreshUser, isAdmin } = useAuth();
  const { persons, isLoading: isPersonsLoading } = useAllPersons();
  const { requests, isLoading: areRequestsLoading, refresh: refreshRequests } = useJoinRequests();
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
  const [setupMode, setSetupMode] = useState<SetupMode>(isEditRoute ? 'create' : 'choose');
  const [claimPersonId, setClaimPersonId] = useState('');

  const claimRequests = requests.filter(request => request.type === 'CLAIM_PROFILE');
  const pendingClaim = claimRequests.find(request => request.status === 'PENDING') ?? null;
  const rejectedClaim = claimRequests.find(request => request.status === 'REJECTED') ?? null;
  const claimCandidates = persons.filter(person => !person.cognitoUserId);

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

  async function submitClaim() {
    const target = persons.find(person => person.id === claimPersonId);
    if (!target || !user) return;
    setSaving(true);
    setError(null);
    try {
      await createJoinRequest({
        personId: target.id,
        requesterName: `${userAttrs['given_name'] ?? ''} ${userAttrs['family_name'] ?? ''}`.trim()
          || user.signInDetails?.loginId
          || 'Family member',
        type: 'CLAIM_PROFILE',
        message: user.signInDetails?.loginId ? `Account: ${user.signInDetails.loginId}` : null,
      });
      await refreshRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send this profile claim.');
    } finally {
      setSaving(false);
    }
  }

  if (isPersonsLoading || (!isEditRoute && areRequestsLoading)) {
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

  if (!isEditRoute && !ownPerson && pendingClaim) {
    const target = persons.find(person => person.id === pendingClaim.personId);
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <div className="card text-center">
          <Clock className="mx-auto h-11 w-11 text-gold-500" />
          <h1 className="mt-4 font-serif text-2xl font-bold text-gray-900">Profile link awaiting approval</h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            An admin will confirm that this is your family tree entry. No new profile has been created.
          </p>
          {target && (
            <div className="mt-5 rounded-lg border border-gold-200 bg-gold-50 px-4 py-3 text-left">
              <p className="text-xs font-bold uppercase tracking-wider text-gold-700">Selected profile</p>
              <p className="mt-1 font-semibold text-gray-900">{fullName(target)}</p>
              <p className="text-xs text-gray-500">{GENERATION_LABELS[target.generation]}{target.birthPlace ? ` · ${target.birthPlace}` : ''}</p>
            </div>
          )}
          <button
            type="button"
            onClick={async () => { await cancelJoinRequest(pendingClaim.id); await refreshRequests(); setSetupMode('choose'); }}
            className="mt-5 text-sm font-semibold text-red-500 hover:underline"
          >
            Cancel this request
          </button>
        </div>
      </div>
    );
  }

  if (!isEditRoute && !ownPerson && setupMode === 'choose') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="mb-8 text-center">
          <h1 className="section-heading text-3xl">Find Your Family Profile</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-500">
            You may already be in the family tree. Search first to avoid creating a duplicate profile.
          </p>
        </div>

        {rejectedClaim && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Your previous profile claim was declined.
            {rejectedClaim.adminNote && ` Admin note: “${rejectedClaim.adminNote}”`}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setSetupMode('claim')}
            className="group flex flex-col items-start gap-3 rounded-xl border-2 border-gold-300 bg-gold-50 p-6 text-left transition hover:border-gold-500 hover:shadow-md"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gold-500 text-white">
              <Search className="h-5 w-5" />
            </span>
            <span className="font-serif text-lg font-bold text-gray-900">I am already in the tree</span>
            <span className="text-sm leading-6 text-gray-600">
              Find your existing entry and request to link it to this account.
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSetupMode('create')}
            className="group flex flex-col items-start gap-3 rounded-xl border-2 border-gray-100 bg-white p-6 text-left transition hover:border-burgundy-300 hover:shadow-md"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-burgundy-100 text-burgundy-700">
              <UserPlus className="h-5 w-5" />
            </span>
            <span className="font-serif text-lg font-bold text-gray-900">I am not in the tree</span>
            <span className="text-sm leading-6 text-gray-500">
              Create a new profile only when you cannot find an existing entry.
            </span>
          </button>
        </div>
      </div>
    );
  }

  if (!isEditRoute && !ownPerson && setupMode === 'claim') {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <button type="button" onClick={() => { setSetupMode('choose'); setError(null); }} className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="card space-y-5">
          <div>
            <h1 className="font-serif text-2xl font-bold text-gray-900">Find your existing profile</h1>
            <p className="mt-1 text-sm leading-6 text-gray-500">
              Search by name, nickname, or birthplace. An admin will confirm the match before linking it.
            </p>
          </div>
          <PersonPicker
            label="My family tree entry"
            persons={claimCandidates}
            value={claimPersonId}
            onChange={setClaimPersonId}
            placeholder="Search for your name…"
          />
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <button type="button" onClick={submitClaim} disabled={saving || !claimPersonId} className="btn-primary flex w-full items-center justify-center gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Request profile link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      {!isEditRoute && !ownPerson && (
        <button type="button" onClick={() => { setSetupMode('choose'); setError(null); }} className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="h-4 w-4" /> Check for an existing profile
        </button>
      )}
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
