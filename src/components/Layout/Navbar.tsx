import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { TreePine, Menu, X, LogOut, Settings, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate  = useNavigate();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm font-medium transition-colors ${
      isActive ? 'text-gold-500' : 'text-cream-100 hover:text-white'
    }`;

  return (
    <nav className="bg-burgundy-900 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <TreePine className="w-7 h-7 text-gold-400 group-hover:text-gold-300 transition-colors" />
            <span className="font-serif text-xl text-white font-semibold tracking-wide">
              Jaguraga Family
            </span>
          </Link>

          {/* Desktop nav */}
          {user && (
            <div className="hidden md:flex items-center gap-6">
              <NavLink to="/dashboard"    className={navLinkClass}>Dashboard</NavLink>
              <NavLink to="/family-tree"  className={navLinkClass}>Family Tree</NavLink>
              <NavLink to="/my-profile"   className={navLinkClass}>My Profile</NavLink>
              {isAdmin && (
                <NavLink to="/admin" className={navLinkClass}>Admin</NavLink>
              )}
            </div>
          )}

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <NavLink to="/my-profile" className="flex items-center gap-1.5 text-cream-100 hover:text-white text-sm">
                  <User className="w-4 h-4" />
                </NavLink>
                {isAdmin && (
                  <NavLink to="/admin" className="flex items-center gap-1.5 text-cream-100 hover:text-white text-sm">
                    <Settings className="w-4 h-4" />
                  </NavLink>
                )}
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 text-cream-100 hover:text-white text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </>
            ) : (
              <Link to="/auth" className="btn-gold text-sm py-2 px-4 rounded-lg font-semibold
                bg-gold-500 text-white hover:bg-gold-400 transition-colors">
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-white"
            onClick={() => setOpen(o => !o)}
            aria-label="Toggle menu"
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-burgundy-950 border-t border-burgundy-800 px-4 py-4 space-y-3">
          {user ? (
            <>
              <NavLink to="/dashboard"   className="block text-cream-100 hover:text-white text-sm py-1" onClick={() => setOpen(false)}>Dashboard</NavLink>
              <NavLink to="/family-tree" className="block text-cream-100 hover:text-white text-sm py-1" onClick={() => setOpen(false)}>Family Tree</NavLink>
              <NavLink to="/my-profile"  className="block text-cream-100 hover:text-white text-sm py-1" onClick={() => setOpen(false)}>My Profile</NavLink>
              {isAdmin && (
                <NavLink to="/admin" className="block text-cream-100 hover:text-white text-sm py-1" onClick={() => setOpen(false)}>Admin Panel</NavLink>
              )}
              <button
                onClick={() => { setOpen(false); handleSignOut(); }}
                className="block text-cream-100 hover:text-white text-sm py-1 w-full text-left"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link to="/auth" onClick={() => setOpen(false)} className="block text-gold-400 font-semibold text-sm py-1">
              Sign In / Sign Up
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
