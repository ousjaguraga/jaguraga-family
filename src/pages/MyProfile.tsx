import { Link } from 'react-router-dom';
import { Loader2, Edit, UserPlus, TreePine } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAllPersons } from '../hooks/useFamily';
import PersonCard from '../components/PersonCard';

export default function MyProfile() {
  const { user, userAttrs, isAdmin } = useAuth();
  const { persons, isLoading }       = useAllPersons();

  const myPerson = persons.find(p => p.cognitoUserId === user?.userId);

  const firstName = userAttrs['given_name']  ?? '';
  const lastName  = userAttrs['family_name'] ?? '';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen gap-2 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="section-heading text-3xl">My Profile</h1>
          <p className="text-gray-500">{user?.signInDetails?.loginId}</p>
        </div>
        <Link to="/setup-profile" className="btn-primary flex items-center gap-2 text-sm">
          <Edit className="w-4 h-4" />
          {myPerson ? 'Edit' : 'Find or create profile'}
        </Link>
      </div>

      {/* Account info */}
      <div className="card mb-6">
        <h2 className="font-serif text-lg font-semibold text-gray-800 mb-4">Account</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-400">First name</dt>
            <dd className="font-medium text-gray-800">{firstName || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Last name</dt>
            <dd className="font-medium text-gray-800">{lastName || '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Email</dt>
            <dd className="font-medium text-gray-800">{user?.signInDetails?.loginId}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Role</dt>
            <dd className="font-medium text-gray-800">{isAdmin ? '🛡️ Admin' : 'Member'}</dd>
          </div>
        </dl>
      </div>

      {/* Family tree entry */}
      {myPerson ? (
        <div className="mb-6">
          <h2 className="font-serif text-lg font-semibold text-gray-800 mb-3">My Family Tree Entry</h2>
          <PersonCard person={myPerson} />
          <div className="flex gap-3 mt-3">
            <Link to={`/add-sibling/${myPerson.id}`} className="btn-secondary text-sm flex items-center gap-1.5">
              <UserPlus className="w-4 h-4" />
              Add sibling
            </Link>
            <Link to="/family-tree" className="btn-secondary text-sm flex items-center gap-1.5">
              <TreePine className="w-4 h-4" />
              View in tree
            </Link>
          </div>
        </div>
      ) : (
        <div className="card border-dashed border-gray-300 bg-gray-50 text-center py-12">
          <TreePine className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">Find your existing family entry or create a new profile.</p>
          <Link to="/setup-profile" className="btn-primary text-sm">
            Find or create my profile
          </Link>
        </div>
      )}
    </div>
  );
}
