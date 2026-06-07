import { TreePine } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-burgundy-950 text-cream-200 py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <TreePine className="w-5 h-5 text-gold-500" />
          <span className="font-serif text-lg">Jaguraga Family Tree</span>
        </div>
        <p className="text-sm text-burgundy-300">
          Preserving our heritage, connecting our generations.
        </p>
        <p className="text-xs text-burgundy-400">
          &copy; {new Date().getFullYear()} Jaguraga Family
        </p>
      </div>
    </footer>
  );
}
