import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { TreePine, Users, Image, BookOpen, ArrowRight, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import HunterLogo from '../components/HunterLogo';

/* ── Animated counter ───────────────────────────────────────────────────── */
function Counter({ to, label, suffix = '' }: { to: number; label: string; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref           = useRef<HTMLDivElement>(null);
  const started       = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || started.current) return;
      started.current = true;
      const duration = 1400;
      const start    = performance.now();
      function step(now: number) {
        const progress = Math.min((now - start) / duration, 1);
        const eased    = 1 - Math.pow(1 - progress, 3);
        setVal(Math.round(eased * to));
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [to]);

  return (
    <div ref={ref} className="flex flex-col items-center gap-1">
      <span className="font-serif text-5xl sm:text-6xl font-bold text-white tabular-nums">
        {val}{suffix}
      </span>
      <span className="text-sm text-white/50 font-medium uppercase tracking-widest">{label}</span>
    </div>
  );
}

/* ── Feature card ───────────────────────────────────────────────────────── */
function Feature({ icon, title, desc, accent }: { icon: React.ReactNode; title: string; desc: string; accent: string }) {
  return (
    <div className={`group relative overflow-hidden rounded-3xl p-7 border border-white/60 bg-white
      hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.10)] transition-all duration-300`}>
      <div className={`inline-flex p-3 rounded-2xl mb-4 ${accent}`}>
        {icon}
      </div>
      <h3 className="font-serif text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
      <div className="absolute bottom-0 right-0 w-24 h-24 rounded-tl-full opacity-5 -mr-4 -mb-4"
        style={{ background: 'currentColor' }} />
    </div>
  );
}

/* ── Step ───────────────────────────────────────────────────────────────── */
function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex gap-5">
      <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-burgundy-700 flex items-center justify-center
        text-white text-sm font-bold font-serif shadow-md shadow-burgundy-700/30">
        {n}
      </div>
      <div className="pt-1.5">
        <h4 className="font-serif text-lg font-bold text-gray-900 mb-1">{title}</h4>
        <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">

      {/* ══════════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #071e14 0%, #0d3225 35%, #17543d 65%, #071e14 100%)' }}
      >
        {/* Background circles (decorative) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full
            border border-white/5 opacity-60" />
          <div className="absolute -top-20 -right-20 w-[400px] h-[400px] rounded-full
            border border-white/5 opacity-60" />
          <div className="absolute top-1/2 -left-64 w-[500px] h-[500px] rounded-full
            bg-gold-500/5 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] rounded-full
            bg-burgundy-500/10 blur-3xl" />
          {/* Subtle dot grid */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
              backgroundSize: '36px 36px',
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-4xl mx-auto">
          {/* Hunter Logo — large centrepiece */}
          <div className="relative mb-8">
            <div className="absolute inset-0 blur-3xl bg-gold-400/20 rounded-full scale-150" />
            <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 shadow-2xl">
              <HunterLogo size={80} className="text-gold-400" />
            </div>
          </div>

          {/* Tagline chip */}
          <div className="inline-flex items-center gap-2 bg-white/8 border border-white/12
            rounded-full px-4 py-1.5 mb-6 backdrop-blur-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse" />
            <span className="text-xs font-medium text-white/70 uppercase tracking-widest">
              Suduwol, Gambia
            </span>
          </div>

          {/* Main heading */}
          <h1 className="font-serif font-bold text-white tracking-tight leading-[1.08]
            text-5xl sm:text-6xl lg:text-7xl mb-4">
            The
            <span className="relative inline-block mx-3">
              <span className="text-gold-400">Jaguraga</span>
              <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gold-400/40 rounded-full" />
            </span>
            Family
          </h1>

          <p className="text-white/60 text-lg sm:text-xl max-w-xl mx-auto leading-relaxed mb-10">
            Generations of strength, honour, and heritage — preserved forever.
            Connect with your roots and discover where you belong.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-16">
            {user ? (
              <>
                <Link to="/dashboard"
                  className="group flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-white
                    font-semibold px-7 py-3.5 rounded-2xl transition-all duration-200
                    shadow-lg shadow-gold-500/30 hover:shadow-gold-400/40 hover:-translate-y-0.5 text-sm">
                  Open Dashboard
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link to="/family-tree"
                  className="flex items-center gap-2 bg-white/8 hover:bg-white/14 border border-white/20
                    text-white font-semibold px-7 py-3.5 rounded-2xl transition-all duration-200 text-sm backdrop-blur-sm">
                  <TreePine className="w-4 h-4" />
                  View Tree
                </Link>
              </>
            ) : (
              <>
                <Link to="/auth"
                  className="group flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-white
                    font-semibold px-7 py-3.5 rounded-2xl transition-all duration-200
                    shadow-lg shadow-gold-500/30 hover:shadow-gold-400/40 hover:-translate-y-0.5 text-sm">
                  Join the Family
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link to="/family-tree"
                  className="flex items-center gap-2 bg-white/8 hover:bg-white/14 border border-white/20
                    text-white font-semibold px-7 py-3.5 rounded-2xl transition-all duration-200 text-sm backdrop-blur-sm">
                  <TreePine className="w-4 h-4" />
                  Browse Tree
                </Link>
              </>
            )}
          </div>

          {/* Scroll cue */}
          <div className="flex flex-col items-center gap-2 animate-bounce opacity-40">
            <ChevronDown className="w-5 h-5 text-white" />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          STATS STRIP
      ══════════════════════════════════════════════════════════════════ */}
      <section className="bg-burgundy-800 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <p className="text-center text-xs uppercase tracking-widest text-white/40 font-medium mb-10">
            Our Family in Numbers
          </p>
          <div className="grid grid-cols-3 gap-8 divide-x divide-white/10">
            <Counter to={5}   label="Generations" />
            <Counter to={100} label="Members" suffix="+" />
            <Counter to={1}   label="Hometown" suffix="" />
          </div>
          <p className="text-center text-white/30 text-sm mt-10 font-medium">
            Suduwol, Gambia — our roots, our home.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          FEATURES
      ══════════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-4 max-w-6xl mx-auto w-full">
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-widest text-burgundy-600 font-semibold mb-3">
            What you can do
          </p>
          <h2 className="font-serif text-4xl sm:text-5xl font-bold text-gray-900 leading-tight">
            Everything your family<br />needs in one place
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Feature
            accent="bg-burgundy-100 text-burgundy-700"
            icon={<TreePine className="w-6 h-6" />}
            title="Family Tree"
            desc="A visual tree spanning every generation — from great-grandparents to children."
          />
          <Feature
            accent="bg-amber-100 text-amber-700"
            icon={<Users className="w-6 h-6" />}
            title="Sibling Links"
            desc="Connect brothers and sisters within each generation with a single click."
          />
          <Feature
            accent="bg-emerald-100 text-emerald-700"
            icon={<Image className="w-6 h-6" />}
            title="Rich Profiles"
            desc="Photos, birthplaces, dates, and life stories — preserved for generations."
          />
          <Feature
            accent="bg-purple-100 text-purple-700"
            icon={<BookOpen className="w-6 h-6" />}
            title="Admin Control"
            desc="Family admins add and verify ancestors, keeping the lineage accurate."
          />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════════════════════════════════ */}
      {!user && (
        <section className="bg-white py-24 px-4">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: steps */}
            <div>
              <p className="text-xs uppercase tracking-widest text-burgundy-600 font-semibold mb-3">
                Getting started
              </p>
              <h2 className="font-serif text-4xl font-bold text-gray-900 mb-10 leading-tight">
                Find your place<br />in the tree
              </h2>
              <div className="space-y-8">
                <Step n={1} title="Create your account"
                  desc="Sign up with your email. It takes less than a minute." />
                <Step n={2} title="Select your ancestors"
                  desc="Find your grandparents or great-grandparents from the admin-added list." />
                <Step n={3} title="Add your family"
                  desc="Enter your details and link your siblings, children, or parents." />
              </div>
              <div className="mt-10">
                <Link to="/auth"
                  className="inline-flex items-center gap-2 bg-burgundy-700 hover:bg-burgundy-600
                    text-white font-semibold px-6 py-3 rounded-2xl transition-all duration-200
                    shadow-md shadow-burgundy-700/20 hover:-translate-y-0.5 text-sm">
                  Get started now
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right: decorative card */}
            <div className="relative hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-br from-burgundy-100 to-gold-50 rounded-3xl" />
              <div className="relative p-10 flex flex-col items-center justify-center gap-6 min-h-[360px]">
                <HunterLogo size={96} className="text-burgundy-700/30" />
                <p className="font-serif text-2xl font-bold text-burgundy-800 text-center italic leading-snug">
                  "A family without a<br />history is like a tree<br />without roots."
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          CTA BANNER
      ══════════════════════════════════════════════════════════════════ */}
      {!user && (
        <section className="relative overflow-hidden py-24 px-4"
          style={{ background: 'linear-gradient(135deg, #071e14 0%, #17543d 100%)' }}>
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
          <div className="relative z-10 max-w-2xl mx-auto text-center">
            <HunterLogo size={48} className="text-gold-400/40 mx-auto mb-6" />
            <h2 className="font-serif text-4xl sm:text-5xl font-bold text-white mb-4 leading-tight">
              You belong here.
            </h2>
            <p className="text-white/60 text-lg mb-10 leading-relaxed">
              Join your relatives online and help us complete the full Jaguraga family history.
            </p>
            <Link to="/auth"
              className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-400
                text-white font-bold px-8 py-4 rounded-2xl text-base
                transition-all duration-200 shadow-xl shadow-gold-500/30 hover:-translate-y-0.5">
              Join the Jaguraga Family
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
