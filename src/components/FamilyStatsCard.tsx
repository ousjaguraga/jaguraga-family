import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Baby, Cake, Crown, Heart, MapPin, Sparkles, Users, type LucideIcon } from 'lucide-react';
import { buildFamilies } from './tree/FamilyGraph';
import { fullName, getAge } from '../utils/helpers';
import type { Person } from '../types';

interface Fact {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string;
  /** link to a person profile when the fact is about one person */
  personId?: string;
  accent: string; // tailwind classes for the icon chip
}

function birthTime(p: Person): number | null {
  if (!p.birthDate) return null;
  const t = new Date(p.birthDate).getTime();
  return Number.isNaN(t) ? null : t;
}

function mostCommon(values: string[]): { value: string; count: number } | null {
  const counts = new Map<string, number>();
  values.forEach(v => counts.set(v, (counts.get(v) ?? 0) + 1));
  let best: { value: string; count: number } | null = null;
  for (const [value, count] of counts) {
    if (!best || count > best.count) best = { value, count };
  }
  return best && best.count > 1 ? best : null;
}

export default function FamilyStatsCard({ persons }: { persons: Person[] }) {
  const facts = useMemo<Fact[]>(() => {
    if (persons.length === 0) return [];
    const out: Fact[] = [];
    const dated = persons.filter(p => birthTime(p) !== null);

    // Oldest known ancestor — earliest recorded birth.
    const oldest = dated.reduce<Person | null>(
      (acc, p) => (!acc || birthTime(p)! < birthTime(acc)! ? p : acc), null);
    if (oldest) {
      out.push({
        icon: Crown,
        label: 'Earliest recorded birth',
        value: fullName(oldest),
        detail: `Born ${new Date(oldest.birthDate!).getFullYear()}`,
        personId: oldest.id,
        accent: 'bg-gold-100 text-gold-700',
      });
    }

    // Eldest living member.
    const living = dated.filter(p => !p.isDeceased);
    const eldest = living.reduce<Person | null>(
      (acc, p) => (!acc || birthTime(p)! < birthTime(acc)! ? p : acc), null);
    if (eldest) {
      out.push({
        icon: Cake,
        label: 'Eldest living member',
        value: fullName(eldest),
        detail: `${getAge(eldest.birthDate)} years old`,
        personId: eldest.id,
        accent: 'bg-burgundy-100 text-burgundy-700',
      });
    }

    // Youngest member.
    const youngest = living.reduce<Person | null>(
      (acc, p) => (!acc || birthTime(p)! > birthTime(acc)! ? p : acc), null);
    if (youngest && youngest.id !== eldest?.id) {
      out.push({
        icon: Baby,
        label: 'Youngest member',
        value: fullName(youngest),
        detail: `Born ${new Date(youngest.birthDate!).getFullYear()}`,
        personId: youngest.id,
        accent: 'bg-sky-100 text-sky-700',
      });
    }

    // Biggest family + couples recorded.
    const families = buildFamilies(persons);
    const biggest = families.reduce<typeof families[number] | null>(
      (acc, f) => (!acc || f.childIds.length > acc.childIds.length ? f : acc), null);
    if (biggest && biggest.childIds.length > 0) {
      out.push({
        icon: Users,
        label: 'Biggest family',
        value: biggest.label,
        detail: `${biggest.childIds.length} children`,
        accent: 'bg-emerald-100 text-emerald-700',
      });
    }
    const couples = families.filter(f => f.parentIds.length === 2).length;
    if (couples > 0) {
      out.push({
        icon: Heart,
        label: 'Couples recorded',
        value: String(couples),
        detail: couples === 1 ? 'family pair' : 'family pairs',
        accent: 'bg-rose-100 text-rose-600',
      });
    }

    // Most common first name.
    const name = mostCommon(persons.map(p => p.firstName.trim()).filter(Boolean));
    if (name) {
      out.push({
        icon: Sparkles,
        label: 'Most common first name',
        value: name.value,
        detail: `shared by ${name.count} members`,
        accent: 'bg-violet-100 text-violet-700',
      });
    }

    // Most common birthplace.
    const place = mostCommon(
      persons.map(p => (p.birthPlace ?? '').trim()).filter(Boolean),
    );
    if (place) {
      out.push({
        icon: MapPin,
        label: 'Family heartland',
        value: place.value,
        detail: `birthplace of ${place.count} members`,
        accent: 'bg-amber-100 text-amber-700',
      });
    }

    return out.slice(0, 6);
  }, [persons]);

  if (facts.length === 0) return null;

  return (
    <div>
      <h2 className="font-serif text-xl font-bold text-gray-900 mb-4">Family Facts</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {facts.map(fact => {
          const Icon = fact.icon;
          const body = (
            <>
              <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${fact.accent}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{fact.label}</p>
                <p className="mt-0.5 truncate font-serif text-base font-bold text-gray-900">{fact.value}</p>
                {fact.detail && <p className="mt-0.5 text-xs text-gray-500">{fact.detail}</p>}
              </div>
            </>
          );
          const cls = 'flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4';
          return fact.personId ? (
            <Link
              key={fact.label}
              to={`/person/${fact.personId}`}
              className={`${cls} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]`}
            >
              {body}
            </Link>
          ) : (
            <div key={fact.label} className={cls}>{body}</div>
          );
        })}
      </div>
    </div>
  );
}
