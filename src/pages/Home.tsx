import { Link } from 'react-router-dom';
import { TreePine, Users, Heart, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <section
        className="relative flex items-center justify-center min-h-[80vh] overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #440a17 0%, #7c1a2e 40%, #8b1a33 70%, #2c1810 100%)',
        }}
      >
        {/* Decorative overlay pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg, #fff 0px, #fff 1px, transparent 1px, transparent 20px
            )`,
          }}
        />

        <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
          <div className="flex justify-center mb-6">
            <div className="bg-white/10 p-4 rounded-full backdrop-blur-sm">
              <TreePine className="w-14 h-14 text-gold-400" />
            </div>
          </div>

          <h1 className="font-serif text-5xl sm:text-6xl font-bold text-white leading-tight mb-4">
            The Jaguraga
            <span className="block text-gold-400">Family Tree</span>
          </h1>

          <p className="text-cream-200 text-lg sm:text-xl mb-10 max-w-xl mx-auto leading-relaxed">
            Discover your roots, connect with relatives, and preserve our shared heritage for generations to come.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              <>
                <Link to="/dashboard" className="btn-gold w-full sm:w-auto text-center text-base px-8 py-3
                  bg-gold-500 text-white rounded-lg font-semibold hover:bg-gold-400 transition-colors">
                  Go to Dashboard
                </Link>
                <Link to="/family-tree" className="btn-secondary w-full sm:w-auto text-center text-base px-8 py-3
                  border-2 border-white text-white rounded-lg font-semibold hover:bg-white/10 transition-colors">
                  View Family Tree
                </Link>
              </>
            ) : (
              <>
                <Link to="/auth" className="bg-gold-500 text-white w-full sm:w-auto text-center text-base
                  px-8 py-3 rounded-lg font-semibold hover:bg-gold-400 transition-colors">
                  Join the Family
                </Link>
                <Link to="/family-tree" className="border-2 border-white text-white w-full sm:w-auto
                  text-center text-base px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors">
                  View Tree
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <h2 className="font-serif text-3xl text-burgundy-900 text-center mb-12">
          Everything you need to map your family
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              icon: <TreePine className="w-7 h-7 text-burgundy-600" />,
              title: 'Family Tree',
              desc:  'A beautiful visual tree spanning generations — from great-grandparents to today.',
            },
            {
              icon: <Users className="w-7 h-7 text-burgundy-600" />,
              title: 'Sibling Links',
              desc:  'Add your siblings and see how everyone connects within each generation.',
            },
            {
              icon: <Heart className="w-7 h-7 text-burgundy-600" />,
              title: 'Rich Profiles',
              desc:  'Store birthplaces, birth dates, photos, and life stories for every member.',
            },
            {
              icon: <BookOpen className="w-7 h-7 text-burgundy-600" />,
              title: 'Heritage Preserved',
              desc:  'Admins can add ancestors so the full lineage is always accurate and complete.',
            },
          ].map(f => (
            <div key={f.title} className="card flex flex-col items-center text-center gap-4 hover:shadow-md transition-shadow">
              <div className="bg-burgundy-50 p-3 rounded-xl">
                {f.icon}
              </div>
              <h3 className="font-serif text-lg font-semibold text-gray-900">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section className="bg-burgundy-900 text-white py-16 px-6 text-center">
          <h2 className="font-serif text-3xl font-bold mb-4">Ready to connect?</h2>
          <p className="text-cream-200 mb-8 max-w-md mx-auto">
            Create your account, find your grandparents in the tree, and help us complete the Jaguraga family history.
          </p>
          <Link to="/auth" className="bg-gold-500 text-white px-10 py-3 rounded-lg font-semibold
            hover:bg-gold-400 transition-colors inline-block text-base">
            Get Started — It's Free
          </Link>
        </section>
      )}
    </div>
  );
}
