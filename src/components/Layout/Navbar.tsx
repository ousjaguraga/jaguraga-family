import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { TreePine, Menu, X, LogOut, Shield, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, userAttrs, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [open,     setOpen]     = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenu) return;
    const close = () => setUserMenu(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [userMenu]);

  async function handleSignOut() {
    setOpen(false);
    setUserMenu(false);
    await signOut();
    navigate('/');
  }

  const firstName = userAttrs['given_name'] ?? '';
  const lastName  = userAttrs['family_name'] ?? '';
  const initials  = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || '?';

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `relative text-sm font-medium transition-colors duration-200 pb-0.5
     ${isActive
       ? 'text-gold-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-gold-400 after:rounded-full'
       : 'text-white/80 hover:text-white'
     }`;

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300
      ${scrolled
        ? 'bg-burgundy-900 shadow-lg shadow-burgundy-950/30'
        : 'bg-burgundy-900/98 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ──────────────────────────────────────────────────── */}
          <Link to="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="bg-gold-500/20 p-1.5 rounded-lg group-hover:bg-gold-500/30 transition-colors">
              <TreePine className="w-5 h-5 text-gold-400" />
            </div>
            <div className="leading-tight">
              <span className="font-serif text-lg text-white font-bold tracking-wide block leading-none">
                Jaguraga
              </span>
              <span className="text-[10px] text-white/50 uppercase tracking-widest font-medium">
                Family Tree
              </span>
            </div>
          </Link>

          {/* ── Desktop links ─────────────────────────────────────────── */}
          {user && (
            <div className="hidden md:flex items-center gap-7">
              <NavLink to="/dashboard"   className={linkClass}>Dashboard</NavLink>
              <NavLink to="/family-tree" className={linkClass}>Family Tree</NavLink>
              <NavLink to="/my-profile"  className={linkClass}>My Profile</NavLink>
              {isAdmin && (
                <NavLink to="/admin" className={linkClass}>
                  <span className="flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5" />
                    Admin
                  </span>
                </NavLink>
              )}
            </div>
          )}

          {/* ── Right side ────────────────────────────────────────────── */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="relative" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setUserMenu(m => !m)}
                  className="flex items-center gap-2 hover:bg-white/10 rounded-xl px-2 py-1.5 transition-colors"
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-400 to-gold-600
                    flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {initials}
                  </div>
                  <span className="text-sm text-white/80 max-w-[90px] truncate hidden lg:block">
                    {firstName || 'Account'}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-white/60 transition-transform ${userMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {userMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-card-lg
                    border border-gray-100 overflow-hidden animate-fade-in">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900 truncate">{firstName} {lastName}</p>
                      <p className="text-xs text-gray-400 truncate">{user.signInDetails?.loginId}</p>
                    </div>
                    <div className="py-1">
                      <Link to="/my-profile" onClick={() => setUserMenu(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                        My Profile
                      </Link>
                      {isAdmin && (
                        <Link to="/admin" onClick={() => setUserMenu(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                          <Shield className="w-4 h-4 text-gold-600" />
                          Admin Panel
                        </Link>
                      )}
                      <button onClick={handleSignOut}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full text-left">
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/auth"
                className="bg-gold-500 hover:bg-gold-400 text-white text-sm font-semibold
                  px-5 py-2 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md">
                Sign In
              </Link>
            )}
          </div>

          {/* ── Mobile burger ─────────────────────────────────────────── */}
          <button
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl
              text-white hover:bg-white/10 transition-colors"
            onClick={() => setOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ───────────────────────────────────────────────── */}
      <div className={`md:hidden overflow-hidden transition-all duration-300
        ${open ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="bg-burgundy-950 border-t border-white/10 px-4 pt-4 pb-6 space-y-1">
          {user ? (
            <>
              {/* Mobile user info */}
              <div className="flex items-center gap-3 p-3 mb-3 bg-white/5 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-600
                  flex items-center justify-center text-sm font-bold text-white">
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{firstName} {lastName}</p>
                  <p className="text-xs text-white/50 truncate max-w-[180px]">{user.signInDetails?.loginId}</p>
                </div>
              </div>
              {[
                { to: '/dashboard',   label: 'Dashboard' },
                { to: '/family-tree', label: 'Family Tree' },
                { to: '/my-profile',  label: 'My Profile' },
                ...(isAdmin ? [{ to: '/admin', label: 'Admin Panel' }] : []),
              ].map(item => (
                <NavLink key={item.to} to={item.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `block px-4 py-2.5 rounded-xl text-sm font-medium transition-colors
                     ${isActive ? 'bg-white/10 text-gold-400' : 'text-white/80 hover:bg-white/5 hover:text-white'}`
                  }>
                  {item.label}
                </NavLink>
              ))}
              <div className="pt-3 mt-3 border-t border-white/10">
                <button onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-xl w-full">
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <Link to="/auth" onClick={() => setOpen(false)}
              className="block bg-gold-500 text-white text-center text-sm font-semibold
                px-5 py-3 rounded-xl hover:bg-gold-400 transition-colors">
              Sign In / Sign Up
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
