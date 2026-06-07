import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { TreePine } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const { user, refreshUser } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = (location.state as { from?: Location })?.from?.pathname ?? '/dashboard';

  useEffect(() => {
    if (user) navigate(from, { replace: true });
  }, [user, from, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #440a17 0%, #7c1a2e 60%, #2c1810 100%)' }}
    >
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <TreePine className="w-10 h-10 text-gold-400" />
          </div>
          <h1 className="font-serif text-3xl text-white font-bold">Jaguraga Family</h1>
          <p className="text-cream-300 text-sm mt-1">Sign in or create your account</p>
        </div>

        {/* Amplify Authenticator — handles signup, login, email verification */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
          <Authenticator
            signUpAttributes={['given_name', 'family_name']}
            components={{
              Header() {
                return null; // we have our own header above
              },
            }}
          >
            {({ signOut: _so, user: _u }) => {
              // After auth, refresh context then navigate
              refreshUser().then(() => navigate(from, { replace: true }));
              return <div className="p-6 text-center text-gray-600">Redirecting…</div>;
            }}
          </Authenticator>
        </div>
      </div>
    </div>
  );
}
