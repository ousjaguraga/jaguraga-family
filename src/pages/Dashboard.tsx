import { Link } from 'react-router-dom';
import { TreePine, Users, UserPlus, Shield, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAllPersons } from '../hooks/useFamily';
import PersonCard from '../components/PersonCard';
import { GENERATION_ORDER } from '../types';

export default function Dashboard() {
  const { userAttrs, isAdmin } = useAuth();
  const { persons, isLoading } = useAllPersons();

  const firstName = userAttrs['given_name'] ?? 'Family Member';

  // Quick stats
  const countByGen = GENERATION_ORDER.reduce<Record<string, number>>((acc, g) => {
    acc[g] = persons.filter(p => p.generation === g).length;
    return acc;
  }, {});
  const ancestors  = persons.filter(p => p.isAncestor);
  const recentlyAdded = [...persons]
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, 4);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-burgundy-900 font-bold">
          Welcome back, {firstName}
        </h1>
        <p className="text-gray-500 mt-1">Here's an overview of the Jaguraga family.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'Total Members',    value: persons.length,           color: 'text-burgundy-700' },
          { label: 'Great-Grandparents', value: countByGen['GREAT_GRANDPARENT'], color: 'text-purple-700' },
          { label: 'Grandparents',     value: countByGen['GRANDPARENT'], color: 'text-blue-700' },
          { label: 'Ancestors (Admin)', value: ancestors.length,        color: 'text-gold-700' },
        ].map(s => (
          <div key={s.label} className="card text-center">
            <p className={`text-3xl font-bold font-serif ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Link to="/family-tree" className="card hover:shadow-md transition-shadow flex items-center gap-3 group">
          <div className="bg-burgundy-100 p-2.5 rounded-lg group-hover:bg-burgundy-200 transition-colors">
            <TreePine className="w-5 h-5 text-burgundy-700" />
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">View Family Tree</p>
            <p className="text-xs text-gray-400">See all generations</p>
          </div>
        </Link>

        <Link to="/my-profile" className="card hover:shadow-md transition-shadow flex items-center gap-3 group">
          <div className="bg-blue-100 p-2.5 rounded-lg group-hover:bg-blue-200 transition-colors">
            <Users className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">My Profile</p>
            <p className="text-xs text-gray-400">View & edit your details</p>
          </div>
        </Link>

        <Link to="/setup-profile" className="card hover:shadow-md transition-shadow flex items-center gap-3 group">
          <div className="bg-green-100 p-2.5 rounded-lg group-hover:bg-green-200 transition-colors">
            <UserPlus className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">Add to Family</p>
            <p className="text-xs text-gray-400">Add yourself or siblings</p>
          </div>
        </Link>

        {isAdmin && (
          <Link to="/admin" className="card hover:shadow-md transition-shadow flex items-center gap-3 group border-gold-200 bg-gold-50">
            <div className="bg-gold-100 p-2.5 rounded-lg group-hover:bg-gold-200 transition-colors">
              <Shield className="w-5 h-5 text-gold-700" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">Admin Panel</p>
              <p className="text-xs text-gray-400">Manage ancestors & users</p>
            </div>
          </Link>
        )}
      </div>

      {/* Recently added */}
      <div>
        <h2 className="section-heading mb-4">Recently Added</h2>
        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-400 py-8">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading members…</span>
          </div>
        ) : recentlyAdded.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentlyAdded.map(p => (
              <PersonCard key={p.id} person={p} compact />
            ))}
          </div>
        ) : (
          <div className="card text-center py-12 text-gray-400">
            <TreePine className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p>No family members yet. The admin will add ancestors soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}
