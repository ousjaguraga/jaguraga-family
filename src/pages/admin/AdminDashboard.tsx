import { Link } from 'react-router-dom';
import { Check, Loader2, PlusCircle, Search, Trash2, Shield, UserPlus, X } from 'lucide-react';
import { useAllPersons, deletePerson } from '../../hooks/useFamily';
import { approveJoinRequest, rejectJoinRequest, useJoinRequests } from '../../hooks/useRequests';
import { GENERATION_LABELS, GENERATION_ORDER, type Generation, type JoinRequest, type NewFamilyProposal, type Person } from '../../types';
import { fullName } from '../../utils/helpers';
import { useMemo, useState } from 'react';

function ListSearch({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="input h-10 pl-9 pr-9 text-sm"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={`Clear ${label.toLowerCase()}`}
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ── Join request review card ──────────────────────────────────────────────
function RequestCard({ req, persons, onDone }: {
  req: JoinRequest;
  persons: Person[];
  onDone: () => void;
}) {
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const requester = persons.find(p => p.id === req.personId);
  const father = persons.find(p => p.id === req.fatherId);
  const mother = persons.find(p => p.id === req.motherId);
  const spouse = persons.find(p => p.id === req.spouseId);
  const proposal = req.newFamilyJson ? JSON.parse(req.newFamilyJson) as NewFamilyProposal : null;
  const requestLabel = req.type === 'CLAIM_PROFILE'
    ? 'Profile claim'
    : req.type === 'NEW_FAMILY'
      ? 'New family'
      : 'Link request';

  async function act(kind: 'approve' | 'reject') {
    setError(null);
    if (kind === 'reject') {
      const note = window.prompt('Why is this request declined? (shown to the member, optional)') ?? '';
      setBusy('reject');
      try { await rejectJoinRequest(req.id, note); onDone(); }
      catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
      finally { setBusy(null); }
      return;
    }
    setBusy('approve');
    try { await approveJoinRequest(req); onDone(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(null); }
  }

  return (
    <div className="card border-l-4 border-l-gold-400">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900">
            {req.type === 'CLAIM_PROFILE'
              ? (req.requesterName ?? 'Unknown account')
              : requester ? (
              <Link to={`/person/${requester.id}`} className="hover:underline">{fullName(requester)}</Link>
              ) : (req.requesterName ?? 'Unknown member')}
            <span className="ml-2 rounded bg-gold-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold-700">
              {requestLabel}
            </span>
          </p>
          <div className="mt-2 space-y-0.5 text-sm text-gray-600">
            {req.type === 'CLAIM_PROFILE' ? (
              <p>
                Wants to link this account to{' '}
                {requester
                  ? <Link className="font-medium hover:underline" to={`/person/${requester.id}`}>{fullName(requester)}</Link>
                  : 'a family member who is no longer available'}
              </p>
            ) : req.type === 'LINK_EXISTING' ? (
              <>
                {father && <p>Father → <Link className="font-medium hover:underline" to={`/person/${father.id}`}>{fullName(father)}</Link></p>}
                {mother && <p>Mother → <Link className="font-medium hover:underline" to={`/person/${mother.id}`}>{fullName(mother)}</Link></p>}
                {spouse && <p>Spouse → <Link className="font-medium hover:underline" to={`/person/${spouse.id}`}>{fullName(spouse)}</Link></p>}
              </>
            ) : proposal && (
              <>
                {proposal.father?.firstName && <p>Create father: <span className="font-medium">{proposal.father.firstName} {proposal.father.lastName}</span></p>}
                {proposal.mother?.firstName && <p>Create mother: <span className="font-medium">{proposal.mother.firstName} {proposal.mother.lastName}</span></p>}
                <p className="text-xs text-gray-400">As {GENERATION_LABELS[proposal.generation]}s, married to each other, linked as the requester's parents.</p>
              </>
            )}
            {req.message && <p className="mt-1 italic text-gray-500">“{req.message}”</p>}
          </div>
        </div>

        <div className="flex flex-shrink-0 gap-2">
          <button
            onClick={() => act('approve')}
            disabled={busy !== null}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy === 'approve' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Approve
          </button>
          <button
            onClick={() => act('reject')}
            disabled={busy !== null}
            className="flex items-center gap-1.5 rounded-lg border-2 border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
          >
            {busy === 'reject' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
            Decline
          </button>
        </div>
      </div>
      {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const { persons, isLoading, error, refresh } = useAllPersons();
  const { requests, refresh: refreshRequests }  = useJoinRequests();
  const [deletingId, setDeletingId]             = useState<string | null>(null);
  const [genFilter, setGenFilter]               = useState<Generation | 'ALL'>('ALL');
  const [requestSearch, setRequestSearch]       = useState('');
  const [memberSearch, setMemberSearch]         = useState('');

  const pendingRequests = useMemo(
    () => requests.filter(r => r.status === 'PENDING'),
    [requests],
  );

  const ancestors = persons.filter(p => p.isAncestor);
  const filteredRequests = useMemo(() => {
    const q = requestSearch.trim().toLowerCase();
    if (!q) return pendingRequests;

    return pendingRequests.filter(req => {
      const relatedNames = [req.personId, req.fatherId, req.motherId, req.spouseId]
        .map(id => persons.find(p => p.id === id))
        .filter((person): person is Person => Boolean(person))
        .map(fullName);
      return [
        req.requesterName,
        req.message,
        req.newFamilyJson,
        ...relatedNames,
      ].some(value => value?.toLowerCase().includes(q));
    });
  }, [pendingRequests, persons, requestSearch]);

  const filtered = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    return persons
      .filter(p => genFilter === 'ALL' || p.generation === genFilter)
      .filter(p => !q || [
        fullName(p),
        p.nickname,
        p.birthPlace,
      ].some(value => value?.toLowerCase().includes(q)))
      .sort((a, b) => fullName(a).localeCompare(fullName(b)));
  }, [genFilter, memberSearch, persons]);

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Remove "${name}" from the family tree? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await deletePerson(id);
      await refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-gold-600" />
            <h1 className="font-serif text-3xl font-bold text-burgundy-900">Admin Panel</h1>
          </div>
          <p className="text-gray-500 text-sm">Manage ancestors, family members, and the tree.</p>
        </div>

        <Link to="/admin/add-ancestor" className="btn-primary flex items-center gap-2 text-sm">
          <PlusCircle className="w-4 h-4" />
          Add ancestor
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total members',      value: persons.length  },
          { label: 'Admin ancestors',    value: ancestors.length },
          { label: 'Great-grandparents', value: persons.filter(p => p.generation === 'GREAT_GRANDPARENT').length },
          { label: 'Grandparents',       value: persons.filter(p => p.generation === 'GRANDPARENT').length },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <p className="text-3xl font-bold font-serif text-burgundy-800">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pending join requests */}
      <div className="mb-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-gold-600" />
            <h2 className="font-serif text-xl font-bold text-gray-900">Join Requests</h2>
            {pendingRequests.length > 0 && (
              <span className="rounded-full bg-gold-500 px-2 py-0.5 text-xs font-bold text-white">
                {filteredRequests.length} of {pendingRequests.length}
              </span>
            )}
          </div>
          {pendingRequests.length > 0 && (
            <ListSearch
              value={requestSearch}
              onChange={setRequestSearch}
              placeholder="Search request names"
              label="Search join requests"
            />
          )}
        </div>
        {pendingRequests.length === 0 ? (
          <div className="card py-6 text-center text-sm text-gray-400">
            No pending requests — everyone who asked has been reviewed.
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="card py-6 text-center text-sm text-gray-400">
            No join requests match “{requestSearch}”.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map(r => (
              <RequestCard
                key={r.id}
                req={r}
                persons={persons}
                onDone={() => { refreshRequests(); refresh(); }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Member filters */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-xl font-bold text-gray-900">Family Members</h2>
          <p className="mt-0.5 text-xs text-gray-500">{filtered.length} of {persons.length} members</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <ListSearch
            value={memberSearch}
            onChange={setMemberSearch}
            placeholder="Search member names"
            label="Search family members"
          />
          <div>
            <label className="sr-only" htmlFor="admin-generation-filter">Filter by generation</label>
            <select
              id="admin-generation-filter"
              value={genFilter}
              onChange={e => setGenFilter(e.target.value as Generation | 'ALL')}
              className="input h-10 w-full text-sm sm:w-auto"
            >
              <option value="ALL">All generations</option>
              {GENERATION_ORDER.map(g => (
                <option key={g} value={g}>{GENERATION_LABELS[g]}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-gray-400 py-12">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading…</span>
        </div>
      ) : error ? (
        <div className="card border-red-200 bg-red-50 text-red-700 py-8 text-center">{error}</div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Name', 'Generation', 'Gender', 'Birth date', 'Ancestor', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                      {memberSearch
                        ? `No members match “${memberSearch}”.`
                        : 'No members found for this generation.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <Link to={`/person/${p.id}`} className="hover:text-burgundy-700 hover:underline">
                          {fullName(p)}
                        </Link>
                        {p.isDeceased && <span className="ml-1 text-gray-400 text-xs">رحمه الله</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{GENERATION_LABELS[p.generation]}</td>
                      <td className="px-4 py-3 text-gray-500 capitalize">{p.gender.toLowerCase()}</td>
                      <td className="px-4 py-3 text-gray-500">{p.birthDate ?? '—'}</td>
                      <td className="px-4 py-3">
                        {p.isAncestor
                          ? <span className="badge bg-gold-100 text-gold-700">Yes</span>
                          : <span className="badge bg-gray-100 text-gray-500">No</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link to={`/admin/edit-ancestor/${p.id}`} className="text-burgundy-600 hover:text-burgundy-800 text-xs font-medium">
                            Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(p.id, fullName(p))}
                            disabled={deletingId === p.id}
                            className="text-red-500 hover:text-red-700 text-xs font-medium flex items-center gap-1"
                          >
                            {deletingId === p.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <Trash2 className="w-3 h-3" />
                            }
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
