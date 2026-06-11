import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { ArrowLeft, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import HunterLogo from '../components/HunterLogo';

export default function AuthPage() {
  const { user, refreshUser } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = (location.state as { from?: Location })?.from?.pathname ?? '/dashboard';

  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, from, navigate]);

  return (
    <div
      className="auth-page relative flex min-h-[calc(100vh-64px)] items-center justify-center overflow-hidden bg-burgundy-950 px-4 py-10 sm:px-6 sm:py-14"
      style={{ background: 'linear-gradient(155deg, #071e14 0%, #0d3225 48%, #17543d 100%)' }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="relative z-10 w-full max-w-[460px]">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-white/60 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="overflow-hidden rounded-lg border border-white/15 bg-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
          <div className="border-b border-burgundy-900/10 bg-cream-50 px-6 py-6 text-center sm:px-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-burgundy-900 text-gold-400 shadow-sm">
              <HunterLogo size={42} />
            </div>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-gold-700">
              Suduwol, Gambia
            </p>
            <h1 className="mt-1 font-serif text-3xl font-bold text-burgundy-950">
              Jaguraga Family
            </h1>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Sign in to connect with your family and preserve our history.
            </p>
          </div>

          <div className="auth-page-form bg-white">
            <Authenticator
              signUpAttributes={['given_name', 'family_name']}
              components={{
                Header() {
                  return null;
                },
              }}
            >
              {({ signOut: _so, user: _u }) => {
                refreshUser().then(() => navigate(from, { replace: true }));
                return <div className="p-6 text-center text-gray-600">Redirecting...</div>;
              }}
            </Authenticator>
          </div>

          <div className="flex items-center justify-center gap-2 border-t border-gray-100 bg-white px-6 py-4 text-xs font-medium text-gray-400">
            <Shield className="h-3.5 w-3.5 text-burgundy-600" />
            Family records are kept private and secure
          </div>
        </div>
      </div>
    </div>
  );
}
