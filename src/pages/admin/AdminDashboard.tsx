import { Link } from 'react-router-dom';
import { Check, Loader2, PlusCircle, Trash2, Shield, UserPlus, X } from 'lucide-react';
import { useAllPersons, deletePerson } from '../../hooks/useFamily';
import { approveJoinRequest, rejectJoinRequest, useJoinRequests } from '../../hooks/useRequests';
import { GENERATION_LABELS, GENERATION_ORDER, type Generation, type JoinRequest, type NewFamilyProposal, type Person } from '../../types';
import { fullName } from '../../utils/helpers';
import { useState } from 'react';

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
            {requester ? (
              <Link to={`/person/${requester.id}`} className="hover:underline">{fullName(requester)}</Link>
            ) : (req.requesterName ?? 'Unknown member')}
            <span className="ml-2 rounded bg-gold-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold-700">
              {req.type === 'NEW_FAMILY' ? 'New family' : 'Link request'}
            </span>
          </p>
          <div className="mt-2 space-y-0.5 text-sm text-gray-600">
            {req.type === 'LINK_EXISTING' ? (
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

  const pendingRequests = requests.filter(r => r.status === 'PENDING');

  const ancestors = persons.filter(p => p.isAncestor);
  const filtered  = (genFilter === 'ALL' ? persons : persons.filter(p => p.generation === genFilter));

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
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-5 h-5 text-gold-600" />
          <h2 className="font-serif text-xl font-bold text-gray-900">Join Requests</h2>
          {pendingRequests.length > 0 && (
            <span className="rounded-full bg-gold-500 px-2 py-0.5 text-xs font-bold text-white">{pendingRequests.length}</span>
          )}
        </div>
        {pendingRequests.length === 0 ? (
          <div className="card py-6 text-center text-sm text-gray-400">
            No pending requests — everyone who asked has been reviewed.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map(r => (
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

      {/* Filter */}
      <div className="flex items-center gap-4 mb-5">
        <label className="text-sm font-medium text-gray-700">Filter by generation:</label>
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
                      No members found.
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
