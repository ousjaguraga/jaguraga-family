import { Link } from 'react-router-dom';
import { TreePine, UserPlus, Shield, ArrowRight, Users, Clock, CheckCircle2, XCircle, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAllPersons } from '../hooks/useFamily';
import { useJoinRequests } from '../hooks/useRequests';
import PersonCard from '../components/PersonCard';
import HunterLogo from '../components/HunterLogo';
import { GENERATION_ORDER } from '../types';

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className={`rounded-2xl p-5 flex flex-col gap-1 border border-white/60 ${color}`}>
      <p className="font-serif text-4xl font-bold tabular-nums">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
    </div>
  );
}

function ActionCard({ to, icon, title, desc, accent }: {
  to: string; icon: React.ReactNode; title: string; desc: string; accent: string;
}) {
  return (
    <Link to={to}
      className="group flex items-center gap-4 bg-white rounded-2xl p-5 border border-gray-100
        hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-200">
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${accent}
        group-hover:scale-105 transition-transform duration-200`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 text-sm">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{desc}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
    </Link>
  );
}

export default function Dashboard() {
  const { user, userAttrs, isAdmin } = useAuth();
  const { persons, isLoading } = useAllPersons();
  const { requests } = useJoinRequests();

  const me = persons.find(p => p.cognitoUserId === user?.userId) ?? null;
  const myLatestRequest = requests.find(r => !me || r.personId === me.id) ?? null;

  const firstName = userAttrs['given_name'] ?? 'Family Member';
  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const countByGen = GENERATION_ORDER.reduce<Record<string, number>>((acc, g) => {
    acc[g] = persons.filter(p => p.generation === g).length;
    return acc;
  }, {});
  const ancestors     = persons.filter(p => p.isAncestor);
  const recentlyAdded = [...persons]
    .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-[#f7f5f0]">
      {/* ── Welcome banner ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0d3225 0%, #17543d 60%, #124231 100%)' }}>
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="absolute right-0 top-0 bottom-0 w-64 opacity-5 flex items-center justify-end pr-8">
          <HunterLogo size={180} className="text-white" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <p className="text-white/50 text-sm font-medium mb-1">{greeting},</p>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-2">{firstName}</h1>
          <p className="text-white/50 text-sm">Here's your family overview — Jaguraga, Suduwol.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ── Join request status ────────────────────────────────────────── */}
        {myLatestRequest && (
          <Link to="/join-family" className={`flex items-center gap-3 rounded-2xl border px-5 py-4 transition hover:shadow-sm ${
            myLatestRequest.status === 'PENDING'  ? 'border-gold-200 bg-gold-50' :
            myLatestRequest.status === 'APPROVED' ? 'border-emerald-200 bg-emerald-50' :
                                                    'border-red-200 bg-red-50'
          }`}>
            {myLatestRequest.status === 'PENDING'  && <Clock className="h-5 w-5 flex-shrink-0 text-gold-600" />}
            {myLatestRequest.status === 'APPROVED' && <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" />}
            {myLatestRequest.status === 'REJECTED' && <XCircle className="h-5 w-5 flex-shrink-0 text-red-500" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">
                {myLatestRequest.status === 'PENDING'  && 'Your join request is waiting for admin approval'}
                {myLatestRequest.status === 'APPROVED' && 'Your join request was approved — you’re in the tree!'}
                {myLatestRequest.status === 'REJECTED' && 'Your join request was declined'}
              </p>
              {myLatestRequest.status === 'REJECTED' && myLatestRequest.adminNote && (
                <p className="mt-0.5 truncate text-xs text-gray-500">Admin: “{myLatestRequest.adminNote}” — tap to try again</p>
              )}
            </div>
            <ArrowRight className="h-4 w-4 flex-shrink-0 text-gray-300" />
          </Link>
        )}

        {/* ── Stats ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard value={persons.length}              label="Total members"      color="bg-burgundy-700 text-white" />
          <StatCard value={countByGen['GREAT_GRANDPARENT'] ?? 0} label="Great-grandparents" color="bg-purple-600 text-white" />
          <StatCard value={countByGen['GRANDPARENT'] ?? 0}        label="Grandparents"       color="bg-blue-600 text-white" />
          <StatCard value={ancestors.length}            label="Ancestors"          color="bg-gold-500 text-white" />
        </div>

        {/* ── Quick actions ───────────────────────────────────────────────── */}
        <div>
          <h2 className="font-serif text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <ActionCard
              to="/family-tree"
              icon={<TreePine className="w-5 h-5 text-burgundy-700" />}
              accent="bg-burgundy-100"
              title="View Family Tree"
              desc="See all generations"
            />
            <ActionCard
              to="/my-profile"
              icon={<Users className="w-5 h-5 text-blue-700" />}
              accent="bg-blue-100"
              title="My Profile"
              desc="View & edit your details"
            />
            <ActionCard
              to="/setup-profile"
              icon={<UserPlus className="w-5 h-5 text-emerald-700" />}
              accent="bg-emerald-100"
              title="Find Yourself"
              desc="Link or create your tree entry"
            />
            <ActionCard
              to="/join-family"
              icon={<Heart className="w-5 h-5 text-rose-600" />}
              accent="bg-rose-100"
              title="Join the Family"
              desc="Link yourself to your parents"
            />
            {isAdmin && (
              <ActionCard
                to="/admin"
                icon={<Shield className="w-5 h-5 text-gold-600" />}
                accent="bg-gold-100"
                title="Admin Panel"
                desc="Manage ancestors"
              />
            )}
          </div>
        </div>

        {/* ── Recently added ──────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-bold text-gray-900">Recently Added</h2>
            <Link to="/family-tree" className="text-sm text-burgundy-700 hover:text-burgundy-600 font-medium flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-100" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-4 bg-gray-100 rounded-lg w-3/4" />
                      <div className="h-3 bg-gray-100 rounded-lg w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : recentlyAdded.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentlyAdded.map(p => <PersonCard key={p.id} person={p} compact />)}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
              <HunterLogo size={48} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium text-sm">No family members yet.</p>
              <p className="text-gray-300 text-xs mt-1">The admin will add ancestors to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
