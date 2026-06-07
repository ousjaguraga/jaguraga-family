import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  getCurrentUser,
  fetchUserAttributes,
  fetchAuthSession,
  signOut as amplifySignOut,
  type AuthUser,
} from 'aws-amplify/auth';

interface AuthContextValue {
  user:        AuthUser | null;
  userAttrs:   Record<string, string>;
  isAdmin:     boolean;
  isLoading:   boolean;
  signOut:     () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<AuthUser | null>(null);
  const [userAttrs, setUserAttrs] = useState<Record<string, string>>({});
  const [isAdmin,   setIsAdmin]   = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshUser() {
    try {
      const current = await getCurrentUser();
      setUser(current);

      const attrs = await fetchUserAttributes();
      setUserAttrs(attrs as Record<string, string>);

      const session = await fetchAuthSession();
      const groups  = (session.tokens?.idToken?.payload['cognito:groups'] ?? []) as string[];
      setIsAdmin(groups.includes('Admin'));
    } catch {
      setUser(null);
      setUserAttrs({});
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { refreshUser(); }, []);

  async function signOut() {
    await amplifySignOut();
    setUser(null);
    setUserAttrs({});
    setIsAdmin(false);
  }

  return (
    <AuthContext.Provider value={{ user, userAttrs, isAdmin, isLoading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
