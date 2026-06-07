import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getUrl } from 'aws-amplify/storage';
import { Loader2, Calendar, MapPin, Edit, Trash2, Users, ArrowLeft } from 'lucide-react';
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
  const spouse  = person?.spouseId  ? persons.find(p => p.id === person.spouseId)  : null;
  const children = persons.filter(p => p.fatherId === id || p.motherId === id);

  const isOwner = user?.userId === person?.owner?.split('::')[1] ||
                  user?.userId === person?.cognitoUserId;
  const canEdit = isOwner || isAdmin;

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

      {/* Relationships */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Parents */}
        {(father || mother) && (
          <div className="card">
            <h2 className="font-serif text-lg font-semibold text-gray-900 mb-4">Parents</h2>
            <div className="space-y-3">
              {father && <MiniPersonLink person={father} label="Father" />}
              {mother && <MiniPersonLink person={mother} label="Mother" />}
            </div>
          </div>
        )}

        {/* Spouse */}
        {spouse && (
          <div className="card">
            <h2 className="font-serif text-lg font-semibold text-gray-900 mb-4">Spouse</h2>
            <MiniPersonLink person={spouse} label="Spouse" />
          </div>
        )}

        {/* Children */}
        {children.length > 0 && (
          <div className="card">
            <h2 className="font-serif text-lg font-semibold text-gray-900 mb-4">
              Children ({children.length})
            </h2>
            <div className="space-y-2">
              {children.map(c => <MiniPersonLink key={c.id} person={c} />)}
            </div>
          </div>
        )}

        {/* Siblings */}
        {siblingPersons.length > 0 && (
          <div className="card">
            <h2 className="font-serif text-lg font-semibold text-gray-900 mb-4">
              Siblings ({siblingPersons.length})
            </h2>
            <div className="space-y-2">
              {siblingPersons.map(s => <MiniPersonLink key={s.id} person={s} />)}
            </div>
            {canEdit && (
              <Link to={`/add-sibling/${person.id}`} className="mt-3 text-sm text-burgundy-700 hover:underline block">
                + Add sibling
              </Link>
            )}
          </div>
        )}

        {/* Add sibling if none */}
        {siblingPersons.length === 0 && canEdit && (
          <div className="card border-dashed border-gray-300 bg-gray-50 text-center py-8">
            <p className="text-gray-400 text-sm mb-3">No siblings linked yet.</p>
            <Link to={`/add-sibling/${person.id}`} className="btn-secondary text-sm py-1.5 px-4">
              + Add Sibling
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniPersonLink({ person, label }: { person: Person; label?: string }) {
  return (
    <Link to={`/person/${person.id}`} className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-2 transition-colors">
      <div className="w-9 h-9 rounded-full bg-burgundy-100 flex items-center justify-center
        text-xs font-bold text-burgundy-700 flex-shrink-0">
        {initials(person)}
      </div>
      <div>
        {label && <p className="text-xs text-gray-400 leading-none">{label}</p>}
        <p className="text-sm font-medium text-gray-800">{fullName(person)}</p>
      </div>
    </Link>
  );
}
