import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getUrl } from 'aws-amplify/storage';
import { Loader2, Calendar, MapPin, Edit, Trash2, Users, ArrowLeft, UserPlus } from 'lucide-react';
import { usePersonById, getSiblings, deletePerson } from '../hooks/useFamily';
import { useAllPersons } from '../hooks/useFamily';
import { useAuth } from '../context/AuthContext';
import { fullName, initials, formatDate, getAge } from '../utils/helpers';
import { GENERATION_LABELS, type Person } from '../types';

export default function PersonDetail() {
  const { id }                      = useParams<{ id: string }>();
  const { person, isLoading, error } = usePersonById(id);
  const { persons }                  = useAllPersons();
  const { user, isAdmin }            = useAuth();
  const navigate                     = useNavigate();

  const [photoUrl,  setPhotoUrl]  = useState<string | null>(null);
  const [siblingPersons, setSiblingPersons] = useState<Person[]>([]);
  const [deleting, setDeleting]   = useState(false);

  useEffect(() => {
    if (!person?.photoKey) return;
    getUrl({ path: person.photoKey })
      .then(({ url }) => setPhotoUrl(url.toString()))
      .catch(() => {});
  }, [person?.photoKey]);

  useEffect(() => {
    if (!id || persons.length === 0) return;
    getSiblings(id).then(rels => {
      const sibIds = rels.map(r => r.siblingPersonId);
      setSiblingPersons(persons.filter(p => sibIds.includes(p.id)));
    }).catch(() => {});
  }, [id, persons]);

  const father  = person?.fatherId  ? persons.find(p => p.id === person.fatherId)  : null;
  const mother  = person?.motherId  ? persons.find(p => p.id === person.motherId)  : null;
  const children = persons.filter(p => p.fatherId === id || p.motherId === id);
  const partners = (() => {
    if (!person) return [] as Person[];
    const ids = new Set<string>();
    const push = (pid?: string | null) => {
      if (pid && pid !== person.id) ids.add(pid);
    };

    // Explicit spouses define families even without children.
    push(person.spouseId);
    persons.forEach(p => {
      if (p.spouseId === person.id) push(p.id);
    });

    // Exact co-parents also define families.
    children.forEach(c => {
      if (c.fatherId === person.id) push(c.motherId);
      if (c.motherId === person.id) push(c.fatherId);
    });

    return [...ids]
      .map(pid => persons.find(p => p.id === pid) ?? null)
      .filter((p): p is Person => p !== null)
      .sort((a, b) => fullName(a).localeCompare(fullName(b)));
  })();

  const isOwner = user?.userId === person?.owner?.split('::')[1] ||
                  user?.userId === person?.cognitoUserId;
  const canEdit = isOwner || isAdmin;

  // Gramps-style: one family per partner, children grouped by which
  // marriage they belong to (supports multiple marriages).
  const families = (() => {
    const units: Array<{ partner: Person | null; kids: Person[] }> = partners.map(partner => ({
      partner,
      kids: children.filter(c => c.fatherId === partner.id || c.motherId === partner.id),
    }));
    const claimed = new Set(units.flatMap(u => u.kids.map(k => k.id)));
    const orphans = children.filter(c => !claimed.has(c.id));
    if (orphans.length || units.length === 0) {
      units.push({ partner: null, kids: orphans });
    }
    return units;
  })();

  // Siblings = explicit sibling records + everyone sharing a parent.
  const allSiblings = (() => {
    if (!person) return [] as Person[];
    const derived = persons.filter(p =>
      p.id !== person.id &&
      ((person.fatherId && p.fatherId === person.fatherId) ||
       (person.motherId && p.motherId === person.motherId)));
    const merged = new Map<string, Person>();
    [...derived, ...siblingPersons].forEach(p => merged.set(p.id, p));
    return [...merged.values()].sort((a, b) => fullName(a).localeCompare(fullName(b)));
  })();

  async function handleDelete() {
    if (!id || !window.confirm('Remove this person from the family tree?')) return;
    setDeleting(true);
    try {
      await deletePerson(id);
      navigate('/family-tree');
    } catch {
      setDeleting(false);
    }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen gap-2 text-gray-400">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  );

  if (error || !person) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center text-red-600">
      {error ?? 'Person not found.'}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back */}
      <Link to="/family-tree" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Family Tree
      </Link>

      {/* Profile header */}
      <div className="card mb-6 flex flex-col sm:flex-row gap-6 items-start">
        {/* Photo */}
        <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-burgundy-200
          bg-burgundy-100 flex items-center justify-center text-2xl font-bold text-burgundy-700 flex-shrink-0">
          {photoUrl
            ? <img src={photoUrl} alt={fullName(person)} className="w-full h-full object-cover" />
            : <span>{initials(person)}</span>
          }
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl font-bold text-gray-900">{fullName(person)}</h1>
              {person.nickname && (
                <p className="mt-0.5 font-serif text-lg italic text-gold-700">“{person.nickname}”</p>
              )}
              <span className="badge bg-burgundy-100 text-burgundy-700 mt-1">
                {GENERATION_LABELS[person.generation]}
              </span>
              {person.isDeceased && (
                <span className="badge bg-gray-100 text-gray-500 ml-2 mt-1">Deceased</span>
              )}
              {person.isAncestor && (
                <span className="badge bg-gold-100 text-gold-700 ml-2 mt-1">Ancestor</span>
              )}
            </div>

            {canEdit && (
              <div className="flex gap-2 flex-shrink-0">
                <Link to={`/edit-person/${person.id}`} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1">
                  <Edit className="w-3.5 h-3.5" />
                  Edit
                </Link>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="border-2 border-red-300 text-red-600 px-3 py-1.5 rounded-lg text-sm
                    font-semibold hover:bg-red-50 transition-colors flex items-center gap-1"
                >
                  {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Delete
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {person.birthDate && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>
                  Born {formatDate(person.birthDate)}
                  {!person.isDeceased && ` (age ${getAge(person.birthDate)})`}
                </span>
              </div>
            )}
            {person.deathDate && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>Died {formatDate(person.deathDate)} (aged {getAge(person.birthDate, person.deathDate)})</span>
              </div>
            )}
            {person.birthPlace && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>{person.birthPlace}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4 text-gray-400" />
              <span>{person.gender === 'MALE' ? 'Male' : person.gender === 'FEMALE' ? 'Female' : 'Other'}</span>
            </div>
          </div>

          {person.bio && (
            <p className="mt-4 text-gray-600 text-sm leading-relaxed">{person.bio}</p>
          )}
        </div>
      </div>

      {/* Parents (compact) */}
      <div className="card mb-4">
        <h2 className="mb-2 font-serif text-base font-semibold text-gray-900">Parents</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-2">
            {father
              ? <MiniPersonLink person={father} label="Father" compact />
              : canEdit
                ? <AddRelativeButton to={`/add-relative/${person.id}/father`} label="Add father" compact />
                : <p className="px-1 text-xs text-gray-400">Father not linked.</p>
            }
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-2">
            {mother
              ? <MiniPersonLink person={mother} label="Mother" compact />
              : canEdit
                ? <AddRelativeButton to={`/add-relative/${person.id}/mother`} label="Add mother" compact />
                : <p className="px-1 text-xs text-gray-400">Mother not linked.</p>
            }
          </div>
        </div>
      </div>

      {/* Relationships */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

        {/* Families — one card per marriage/union (Gramps-style) */}
        {families.map((fam, i) => (
          <div key={fam.partner?.id ?? `unknown-${i}`} className="card border-l-4 border-l-gold-300">
            <h2 className="font-serif text-lg font-semibold text-gray-900 mb-3">
              {fam.partner
                ? `Family with ${fullName(fam.partner)}`
                : families.length > 1 ? 'Other children' : 'Children'}
              {fam.kids.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-400">
                  ({fam.kids.length} {fam.kids.length === 1 ? 'child' : 'children'})
                </span>
              )}
            </h2>
            <div className="space-y-2">
              {fam.partner && <CoupleCard person={person} partner={fam.partner} />}
              {fam.kids.length > 0 && (
                <div className="ml-3 space-y-1 border-l-2 border-gray-100 pl-3">
                  {fam.kids.map(c => <MiniPersonLink key={c.id} person={c} compact />)}
                </div>
              )}
              {!fam.partner && fam.kids.length === 0 && !canEdit && (
                <p className="text-sm text-gray-400">No children linked.</p>
              )}
              {canEdit && i === families.length - 1 && (
                <AddRelativeButton to={`/add-relative/${person.id}/child`} label="Add child" compact />
              )}
            </div>
          </div>
        ))}

        {/* Siblings (shared parents + explicit records) */}
        <div className="card">
          <h2 className="font-serif text-lg font-semibold text-gray-900 mb-3">
            Siblings {allSiblings.length > 0 && `(${allSiblings.length})`}
          </h2>
          <div className="space-y-2">
            {allSiblings.map(s => <MiniPersonLink key={s.id} person={s} />)}
            {canEdit && (
              <AddRelativeButton to={`/add-sibling/${person.id}`} label="Add sibling" />
            )}
            {allSiblings.length === 0 && !canEdit && (
              <p className="text-sm text-gray-400">No siblings linked.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CoupleCard({ person, partner }: { person: Person; partner: Person }) {
  const husband = person.gender === 'MALE'
    ? person
    : partner.gender === 'MALE'
      ? partner
      : null;
  const wife = person.gender === 'FEMALE'
    ? person
    : partner.gender === 'FEMALE'
      ? partner
      : null;

  const top = husband ?? person;
  const bottom = top.id === person.id ? partner : person;
  const topRole = husband && wife ? (top.id === husband.id ? 'Husband' : 'Wife') : 'Partner';
  const bottomRole = husband && wife ? (bottom.id === wife.id ? 'Wife' : 'Partner') : 'Partner';

  return (
    <div className="overflow-hidden rounded-xl border border-gold-200 bg-gold-50/60 shadow-sm">
      <div className="border-b border-gold-200/80 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gold-700">
        Family pair
      </div>
      <MiniPersonLink person={top} label={topRole} />
      <div className="mx-3 border-t border-gold-200/70" />
      <MiniPersonLink person={bottom} label={bottomRole} />
    </div>
  );
}

function AddRelativeButton({
  to,
  label,
  compact = false,
}: {
  to: string;
  label: string;
  compact?: boolean;
}) {
  return (
    <Link to={to}
      className={`flex w-full items-center gap-2 border border-dashed transition-colors
        ${compact
          ? 'rounded-md border-gray-200 px-2 py-1.5 text-xs text-gray-500 hover:border-burgundy-400 hover:text-burgundy-700'
          : 'rounded-lg border-gray-200 px-3 py-2 text-sm text-gray-400 hover:border-burgundy-400 hover:text-burgundy-700'}`}>
      <UserPlus className="w-3.5 h-3.5" />
      {label}
    </Link>
  );
}

function MiniPersonLink({
  person,
  label,
  compact = false,
}: {
  person: Person;
  label?: string;
  compact?: boolean;
}) {
  return (
    <Link
      to={`/person/${person.id}`}
      className={`flex items-start transition-colors hover:bg-gray-50 ${compact ? 'gap-2 rounded-md p-2' : 'gap-3 rounded-lg p-3'}`}
    >
      <div
        className={`flex flex-shrink-0 items-center justify-center rounded-full bg-burgundy-100 font-bold text-burgundy-700
          ${compact ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs'}`}
      >
        {initials(person)}
      </div>
      <div className="min-w-0">
        {label && <p className={`${compact ? 'text-[10px]' : 'text-xs'} leading-none text-gray-400`}>{label}</p>}
        <p className={`${compact ? 'text-xs' : 'text-sm'} font-medium leading-snug text-gray-800 whitespace-normal break-words`}>{fullName(person)}</p>
      </div>
    </Link>
  );
}
