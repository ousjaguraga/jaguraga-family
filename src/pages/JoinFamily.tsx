import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, Heart, Loader2, Send, UserPlus, Users, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAllPersons } from '../hooks/useFamily';
import { cancelJoinRequest, createJoinRequest, useJoinRequests } from '../hooks/useRequests';
import PersonPicker from '../components/PersonPicker';
import { fullName, generationAbove } from '../utils/helpers';
import {
  GENERATION_LABELS,
  GENERATION_ORDER,
  type Generation,
  type NewFamilyProposal,
} from '../types';

type Mode = 'choose' | 'link' | 'new' | 'sent';

export default function JoinFamily() {
  const { user } = useAuth();
  const { persons, isLoading: personsLoading } = useAllPersons();
  const { requests, isLoading: requestsLoading, refresh } = useJoinRequests();
  const navigate = useNavigate();

  const me = persons.find(p => p.cognitoUserId === user?.userId) ?? null;
  const myRequests = requests.filter(r => !me || r.personId === me.id);
  const pending  = myRequests.find(r => r.status === 'PENDING') ?? null;
  const rejected = myRequests.find(r => r.status === 'REJECTED') ?? null;

  const [mode, setMode] = useState<Mode>('choose');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // link-to-existing form
  const [fatherId, setFatherId] = useState('');
  const [motherId, setMotherId] = useState('');
  const [spouseId, setSpouseId] = useState('');
  const [message, setMessage]   = useState('');

  // new-family form
  const [nf, setNf] = useState({
    fatherFirst: '', fatherLast: 'Jaguraga',
    motherFirst: '', motherLast: 'Jaguraga',
  });

  const parentGeneration: Generation = useMemo(() => {
    const idx = GENERATION_ORDER.indexOf(me?.generation ?? 'CURRENT');
    return GENERATION_ORDER[Math.max(0, idx - 1)];
  }, [me?.generation]);

  if (personsLoading || requestsLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // ── Step 0: must have a profile first ───────────────────────────────
  if (!me) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <UserPlus className="mx-auto h-12 w-12 text-burgundy-300" />
        <h1 className="mt-4 font-serif text-3xl font-bold text-gray-900">First, find yourself</h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          Link your existing family entry, or create a profile if you are not in the tree yet.
        </p>
        <Link to="/setup-profile" className="btn-primary mt-6 inline-flex items-center gap-2">
          <UserPlus className="h-4 w-4" /> Find or create my profile
        </Link>
      </div>
    );
  }

  const alreadyLinked = Boolean(me.fatherId || me.motherId);

  // ── Pending request: show status ─────────────────────────────────────
  if (pending) {
    const father = persons.find(p => p.id === pending.fatherId);
    const mother = persons.find(p => p.id === pending.motherId);
    const spouse = persons.find(p => p.id === pending.spouseId);
    const proposal = pending.newFamilyJson ? JSON.parse(pending.newFamilyJson) as NewFamilyProposal : null;

    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="card text-center">
          <Clock className="mx-auto h-12 w-12 text-gold-500" />
          <h1 className="mt-4 font-serif text-2xl font-bold text-gray-900">Waiting for approval</h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            An admin will review your request. You'll be linked into the tree once it's approved.
          </p>
          <div className="mt-5 rounded-lg bg-gray-50 p-4 text-left text-sm text-gray-700">
            {pending.type === 'LINK_EXISTING' ? (
              <>
                {father && <p><span className="text-gray-400">Father:</span> {fullName(father)}</p>}
                {mother && <p><span className="text-gray-400">Mother:</span> {fullName(mother)}</p>}
                {spouse && <p><span className="text-gray-400">Spouse:</span> {fullName(spouse)}</p>}
              </>
            ) : proposal && (
              <>
                {proposal.father?.firstName && <p><span className="text-gray-400">New father:</span> {proposal.father.firstName} {proposal.father.lastName}</p>}
                {proposal.mother?.firstName && <p><span className="text-gray-400">New mother:</span> {proposal.mother.firstName} {proposal.mother.lastName}</p>}
              </>
            )}
            {pending.message && <p className="mt-2 italic text-gray-500">“{pending.message}”</p>}
          </div>
          <button
            type="button"
            onClick={async () => { await cancelJoinRequest(pending.id); refresh(); }}
            className="mt-5 text-sm font-semibold text-red-500 hover:underline"
          >
            Cancel this request
          </button>
        </div>
      </div>
    );
  }

  // ── Sent confirmation ────────────────────────────────────────────────
  if (mode === 'sent') {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <h1 className="mt-4 font-serif text-3xl font-bold text-gray-900">Request sent!</h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          An admin will review it shortly. We'll link you into the family tree once approved.
        </p>
        <button type="button" onClick={() => navigate('/dashboard')} className="btn-primary mt-6">
          Back to dashboard
        </button>
      </div>
    );
  }

  async function submitLink() {
    if (!fatherId && !motherId && !spouseId) {
      setError('Pick at least one person to link to.');
      return;
    }
    setError(null); setSaving(true);
    try {
      await createJoinRequest({
        personId:      me!.id,
        requesterName: fullName(me!),
        type:          'LINK_EXISTING',
        fatherId:      fatherId || null,
        motherId:      motherId || null,
        spouseId:      spouseId || null,
        message:       message.trim() || null,
      });
      await refresh();
      setMode('sent');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  async function submitNewFamily() {
    if (!nf.fatherFirst.trim() && !nf.motherFirst.trim()) {
      setError("Enter at least one parent's name.");
      return;
    }
    setError(null); setSaving(true);
    try {
      const proposal: NewFamilyProposal = {
        ...(nf.fatherFirst.trim() ? { father: { firstName: nf.fatherFirst.trim(), lastName: nf.fatherLast.trim() || 'Jaguraga' } } : {}),
        ...(nf.motherFirst.trim() ? { mother: { firstName: nf.motherFirst.trim(), lastName: nf.motherLast.trim() || 'Jaguraga' } } : {}),
        generation: parentGeneration,
      };
      await createJoinRequest({
        personId:      me!.id,
        requesterName: fullName(me!),
        type:          'NEW_FAMILY',
        newFamilyJson: JSON.stringify(proposal),
        message:       message.trim() || null,
      });
      await refresh();
      setMode('sent');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="section-heading text-3xl">Join the Family Tree</h1>
        <p className="mt-1 text-gray-500">
          Tell us where you belong — an admin will approve it and you'll appear in the tree.
        </p>
      </div>

      {alreadyLinked && (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          You're already linked to your family. You can still request changes below — an admin will review them.
        </div>
      )}

      {rejected && mode === 'choose' && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="flex items-center gap-1.5 font-semibold"><XCircle className="h-4 w-4" /> Your last request was declined.</p>
          {rejected.adminNote && <p className="mt-1">Admin's note: “{rejected.adminNote}”</p>}
          <p className="mt-1">You can send a new request below.</p>
        </div>
      )}

      {/* ── Choose path ──────────────────────────────────────────────── */}
      {mode === 'choose' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode('link')}
            className="group flex flex-col items-start gap-3 rounded-2xl border-2 border-gray-100 bg-white p-6 text-left transition hover:-translate-y-0.5 hover:border-gold-400 hover:shadow-md"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-burgundy-100 text-burgundy-700">
              <Users className="h-5 w-5" />
            </span>
            <span className="font-serif text-lg font-bold text-gray-900">My family is in the tree</span>
            <span className="text-sm leading-6 text-gray-500">
              Find your father, mother, or spouse among the existing members and link yourself to them.
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMode('new')}
            className="group flex flex-col items-start gap-3 rounded-2xl border-2 border-gray-100 bg-white p-6 text-left transition hover:-translate-y-0.5 hover:border-gold-400 hover:shadow-md"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <UserPlus className="h-5 w-5" />
            </span>
            <span className="font-serif text-lg font-bold text-gray-900">My family isn't here yet</span>
            <span className="text-sm leading-6 text-gray-500">
              Give us your parents' names and we'll add your branch of the family to the tree.
            </span>
          </button>
        </div>
      )}

      {/* ── Link to existing ─────────────────────────────────────────── */}
      {mode === 'link' && (
        <div className="card space-y-5">
          <h2 className="font-serif text-lg font-semibold text-gray-800">Who are your people?</h2>
          <PersonPicker
            label="My father"
            persons={persons}
            value={fatherId}
            onChange={setFatherId}
            excludeIds={[me.id]}
            filterGender="MALE"
            generation={generationAbove(me.generation)}
            placeholder="Search for your father…"
          />
          <PersonPicker
            label="My mother"
            persons={persons}
            value={motherId}
            onChange={setMotherId}
            excludeIds={[me.id]}
            filterGender="FEMALE"
            generation={generationAbove(me.generation)}
            placeholder="Search for your mother…"
          />
          <PersonPicker
            label="My spouse (optional)"
            persons={persons}
            value={spouseId}
            onChange={setSpouseId}
            excludeIds={[me.id]}
            generation={me.generation}
            placeholder="Search for your spouse…"
          />
          <div>
            <label className="label">Anything the admin should know? (optional)</label>
            <textarea className="input resize-none" rows={2} placeholder="e.g. I'm the third child of…" value={message} onChange={e => setMessage(e.target.value)} />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={submitLink} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send request
            </button>
            <button type="button" onClick={() => { setMode('choose'); setError(null); }} className="btn-secondary">Back</button>
          </div>
        </div>
      )}

      {/* ── Propose new family ───────────────────────────────────────── */}
      {mode === 'new' && (
        <div className="card space-y-5">
          <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-gray-800">
            <Heart className="h-4 w-4 text-burgundy-600" /> Your parents
          </h2>
          <p className="text-sm text-gray-500">
            They'll be added as <span className="font-semibold">{GENERATION_LABELS[parentGeneration]}s</span> and
            you'll be linked as their child once an admin approves.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Father's first name</label>
              <input className="input" value={nf.fatherFirst} onChange={e => setNf(f => ({ ...f, fatherFirst: e.target.value }))} />
            </div>
            <div>
              <label className="label">Father's last name</label>
              <input className="input" value={nf.fatherLast} onChange={e => setNf(f => ({ ...f, fatherLast: e.target.value }))} />
            </div>
            <div>
              <label className="label">Mother's first name</label>
              <input className="input" value={nf.motherFirst} onChange={e => setNf(f => ({ ...f, motherFirst: e.target.value }))} />
            </div>
            <div>
              <label className="label">Mother's last name</label>
              <input className="input" value={nf.motherLast} onChange={e => setNf(f => ({ ...f, motherLast: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Anything the admin should know? (optional)</label>
            <textarea className="input resize-none" rows={2} placeholder="e.g. We're the Banjul branch…" value={message} onChange={e => setMessage(e.target.value)} />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={submitNewFamily} disabled={saving} className="btn-primary flex items-center gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send request
            </button>
            <button type="button" onClick={() => { setMode('choose'); setError(null); }} className="btn-secondary">Back</button>
          </div>
        </div>
      )}
    </div>
  );
}
