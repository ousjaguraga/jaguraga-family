import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Cake, Calendar, Heart } from 'lucide-react';
import { fullName, initials } from '../utils/helpers';
import type { Person } from '../types';

const WINDOW_DAYS = 14;

export interface FamilyEvent {
  person: Person;
  type: 'birthday' | 'remembrance';
  /** 0 = today */
  daysAway: number;
  /** age being turned, or years since passing */
  years: number;
  date: Date;
}

function parseYMD(iso: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
}

export function collectEvents(persons: Person[], now = new Date()): FamilyEvent[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const events: FamilyEvent[] = [];

  const push = (person: Person, type: FamilyEvent['type'], iso: string) => {
    const p = parseYMD(iso);
    if (!p) return;
    let occ = new Date(today.getFullYear(), p.m - 1, p.d);
    if (occ < today) occ = new Date(today.getFullYear() + 1, p.m - 1, p.d);
    const daysAway = Math.round((occ.getTime() - today.getTime()) / 86_400_000);
    if (daysAway > WINDOW_DAYS) return;
    const years = occ.getFullYear() - p.y;
    if (years <= 0) return;
    events.push({ person, type, daysAway, years, date: occ });
  };

  persons.forEach(p => {
    const deceased = Boolean(p.isDeceased || p.deathDate);
    if (p.birthDate && !deceased) push(p, 'birthday', p.birthDate);
    if (p.deathDate) push(p, 'remembrance', p.deathDate);
  });

  return events.sort((a, b) =>
    a.daysAway - b.daysAway ||
    (a.type === b.type ? 0 : a.type === 'remembrance' ? -1 : 1) ||
    fullName(a.person).localeCompare(fullName(b.person)),
  );
}

const rahma = (p: Person) => (p.gender === 'FEMALE' ? 'رحمها الله' : 'رحمه الله');
const himHer = (p: Person) => (p.gender === 'MALE' ? 'him' : p.gender === 'FEMALE' ? 'her' : 'them');

function dateLabel(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function PersonChip({ person }: { person: Person }) {
  return (
    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-burgundy-100 text-xs font-bold text-burgundy-700">
      {initials(person)}
    </div>
  );
}

function TodayRow({ ev }: { ev: FamilyEvent }) {
  const p = ev.person;
  const isBirthday = ev.type === 'birthday';
  return (
    <Link
      to={`/person/${p.id}`}
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition hover:shadow-sm ${
        isBirthday ? 'border-gold-200 bg-gold-50' : 'border-emerald-200 bg-emerald-50/60'
      }`}
    >
      <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
        isBirthday ? 'bg-gold-100 text-gold-700' : 'bg-emerald-100 text-emerald-700'
      }`}>
        {isBirthday ? <Cake className="h-4 w-4" /> : <Heart className="h-4 w-4" />}
      </span>
      <PersonChip person={p} />
      <div className="min-w-0 flex-1">
        {isBirthday ? (
          <>
            <p className="text-sm font-bold text-gray-900">{fullName(p)} turns {ev.years} today 🎉</p>
            <p className="mt-0.5 text-xs text-gray-500">Wish {himHer(p)} a blessed year.</p>
          </>
        ) : (
          <>
            <p className="text-sm font-bold text-gray-900">
              {ev.years} {ev.years === 1 ? 'year' : 'years'} today since {fullName(p)} passed away
              <span className="ml-2 font-serif text-emerald-800">{rahma(p)}</span>
            </p>
            <p className="mt-0.5 text-xs text-gray-500">Remember {himHer(p)} in your du'ās today.</p>
          </>
        )}
      </div>
    </Link>
  );
}

function UpcomingRow({ ev }: { ev: FamilyEvent }) {
  const p = ev.person;
  const isBirthday = ev.type === 'birthday';
  return (
    <Link
      to={`/person/${p.id}`}
      className="flex items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-gray-50"
    >
      <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md ${
        isBirthday ? 'bg-gold-50 text-gold-600' : 'bg-emerald-50 text-emerald-600'
      }`}>
        {isBirthday ? <Cake className="h-3.5 w-3.5" /> : <Heart className="h-3.5 w-3.5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-800">{fullName(p)}</p>
        <p className="text-xs text-gray-400">
          {isBirthday
            ? `Turns ${ev.years}`
            : `Remembrance — ${ev.years} ${ev.years === 1 ? 'year' : 'years'} ${rahma(p)}`}
        </p>
      </div>
      <p className="flex-shrink-0 text-xs font-semibold text-gray-500">
        {ev.daysAway === 1 ? 'Tomorrow' : `${dateLabel(ev.date)} · in ${ev.daysAway} days`}
      </p>
    </Link>
  );
}

export default function OnThisDay({ persons }: { persons: Person[] }) {
  const events = useMemo(() => collectEvents(persons), [persons]);
  if (events.length === 0) return null;

  const todays = events.filter(e => e.daysAway === 0);
  const upcoming = events.filter(e => e.daysAway > 0);

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-burgundy-100 text-burgundy-700">
          <Calendar className="h-4 w-4" />
        </span>
        <div>
          <h2 className="font-serif text-xl font-bold text-gray-900">On This Day</h2>
          <p className="mt-0.5 text-xs leading-5 text-gray-500">
            Birthdays and remembrance days — keep the family in your du'ās.
          </p>
        </div>
      </div>

      {todays.length > 0 && (
        <div className="space-y-2">
          {todays.map(ev => <TodayRow key={`${ev.type}-${ev.person.id}`} ev={ev} />)}
        </div>
      )}

      {upcoming.length > 0 && (
        <div className={todays.length > 0 ? 'mt-4 border-t border-gray-100 pt-3' : ''}>
          <p className="mb-1 px-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Coming up
          </p>
          <div className="space-y-0.5">
            {upcoming.map(ev => <UpcomingRow key={`${ev.type}-${ev.person.id}`} ev={ev} />)}
          </div>
        </div>
      )}
    </div>
  );
}
