import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, Shield, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import HunterLogo from '../HunterLogo';

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

  useEffect(() => {
    if (!userMenu) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as Element).closest('[data-user-menu]')) setUserMenu(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [userMenu]);

  async function handleSignOut() {
    setOpen(false);
    setUserMenu(false);
    await signOut();
    navigate('/');
  }

  const first    = userAttrs['given_name']  ?? '';
  const last     = userAttrs['family_name'] ?? '';
  const initials = `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase() || '?';

  const link = ({ isActive }: { isActive: boolean }) =>
    `relative text-sm font-medium transition-all duration-200 py-1
     ${isActive
       ? 'text-gold-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-gold-400 after:rounded-full'
       : 'text-white/75 hover:text-white'}`;

  return (
    <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300
      ${scrolled ? 'bg-burgundy-900 shadow-xl shadow-black/20' : 'bg-burgundy-900/95 backdrop-blur-md'}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ── */}
          <Link to="/" className="flex items-center gap-3 group flex-shrink-0">
            <div className="relative">
              <div className="absolute inset-0 bg-gold-500 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity scale-150" />
              <HunterLogo size={32} className="text-gold-400 group-hover:text-gold-300 transition-colors" />
            </div>
            <div className="leading-none">
              <p className="font-serif text-[18px] tracking-wide text-white font-bold">Jaguraga</p>
              <p className="text-[9px] uppercase tracking-[0.2em] text-gold-400/80 font-medium mt-0.5">Family Tree</p>
            </div>
          </Link>

          {/* ── Desktop links ── */}
          {user && (
            <div className="hidden md:flex items-center gap-8">
              <NavLink to="/dashboard"   className={link}>Dashboard</NavLink>
              <NavLink to="/family-tree" className={link}>Family Tree</NavLink>
              <NavLink to="/join-family" className={link}>Join</NavLink>
              <NavLink to="/my-profile"  className={link}>My Profile</NavLink>
              {isAdmin && (
                <NavLink to="/admin" className={link}>
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />Admin
                  </span>
                </NavLink>
              )}
            </div>
          )}

          {/* ── Right ── */}
          <div className="hidden md:flex items-center">
            {user ? (
              <div className="relative" data-user-menu>
                <button
                  onClick={() => setUserMenu(m => !m)}
                  className="flex items-center gap-2.5 hover:bg-white/10 rounded-xl px-2.5 py-2 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0
                    bg-gradient-to-br from-gold-400 to-gold-600 ring-2 ring-gold-400/30">
                    {initials}
                  </div>
                  <span className="text-sm text-white/80 hidden lg:block max-w-[100px] truncate">{first || 'Account'}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-white/50 transition-transform duration-200 ${userMenu ? 'rotate-180' : ''}`} />
                </button>

                {userMenu && (
                  <div className="absolute right-0 top-[calc(100%+8px)] w-52 bg-white rounded-2xl
                    shadow-[0_20px_60px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden z-50">
                    <div className="px-4 py-3.5 bg-gradient-to-br from-burgundy-50 to-white border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900">{first} {last}</p>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{user.signInDetails?.loginId}</p>
                    </div>
                    <div className="py-1.5">
                      <Link to="/my-profile" onClick={() => setUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        My Profile
                      </Link>
                      {isAdmin && (
                        <Link to="/admin" onClick={() => setUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <Shield className="w-4 h-4 text-gold-500" />
                          Admin Panel
                        </Link>
                      )}
                      <div className="mx-3 my-1 border-t border-gray-100" />
                      <button onClick={handleSignOut}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors w-full text-left">
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
                  px-5 py-2.5 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-gold-500/20">
                Sign In
              </Link>
            )}
          </div>

          {/* ── Mobile burger ── */}
          <button
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-white hover:bg-white/10 transition-colors"
            onClick={() => setOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      <div className={`md:hidden transition-all duration-300 overflow-hidden ${open ? 'max-h-[500px]' : 'max-h-0'}`}>
        <div className="bg-[#071e14] border-t border-white/10 px-4 pt-4 pb-8 space-y-1">
          {user ? (
            <>
              <div className="flex items-center gap-3 p-3.5 mb-3 bg-white/5 rounded-2xl">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-400 to-gold-600
                  flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{first} {last}</p>
                  <p className="text-xs text-white/40 truncate">{user.signInDetails?.loginId}</p>
                </div>
              </div>

              {[
                { to: '/dashboard',   label: 'Dashboard' },
                { to: '/family-tree', label: 'Family Tree' },
                { to: '/join-family', label: 'Join the Family' },
                { to: '/my-profile',  label: 'My Profile' },
                ...(isAdmin ? [{ to: '/admin', label: 'Admin Panel' }] : []),
              ].map(item => (
                <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `block px-4 py-3 rounded-xl text-sm font-medium transition-colors
                     ${isActive ? 'bg-white/10 text-gold-400' : 'text-white/70 hover:bg-white/5 hover:text-white'}`
                  }>
                  {item.label}
                </NavLink>
              ))}

              <div className="pt-3 mt-2 border-t border-white/10">
                <button onClick={handleSignOut}
                  className="flex items-center gap-2.5 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 rounded-xl w-full">
                  <LogOut className="w-4 h-4" />Sign out
                </button>
              </div>
            </>
          ) : (
            <Link to="/auth" onClick={() => setOpen(false)}
              className="block bg-gold-500 text-white text-center text-sm font-semibold px-5 py-3.5 rounded-xl hover:bg-gold-400 transition-colors">
              Sign In / Sign Up
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
