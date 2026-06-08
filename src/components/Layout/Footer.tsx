import { Link } from 'react-router-dom';
import { TreePine } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-burgundy-950 text-white/70 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="bg-gold-500/20 p-2 rounded-xl">
              <TreePine className="w-5 h-5 text-gold-400" />
            </div>
            <div>
              <p className="font-serif text-lg text-white font-bold">Jaguraga Family</p>
              <p className="text-xs text-white/40 uppercase tracking-widest">Suduwol, Gambia</p>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-sm">
            <Link to="/family-tree" className="hover:text-white transition-colors">Family Tree</Link>
            <Link to="/dashboard"   className="hover:text-white transition-colors">Dashboard</Link>
            <Link to="/my-profile"  className="hover:text-white transition-colors">My Profile</Link>
          </div>

          {/* Copyright */}
          <p className="text-xs text-white/30 text-center md:text-right">
            &copy; {new Date().getFullYear()} Jaguraga Family.<br />
            Preserving our heritage.
          </p>
        </div>
      </div>
    </footer>
  );
}
