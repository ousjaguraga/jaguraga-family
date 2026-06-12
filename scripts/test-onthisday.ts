import { collectEvents } from '../src/components/OnThisDay';
import type { Person } from '../src/types';

let n = 0;
const P = (firstName: string, extra: Partial<Person> = {}): Person => ({
  id: `p${++n}`, firstName, lastName: 'Test', gender: 'MALE',
  generation: 'CURRENT', ...extra,
});

// Fixed "today" for deterministic tests
const now = new Date(2026, 5, 12); // 12 June 2026

const people = [
  P('BirthdayToday',    { birthDate: '1980-06-12' }),                          // turns 46 today
  P('BirthdayTomorrow', { birthDate: '1990-06-13' }),                          // turns 36 tomorrow
  P('BirthdayFar',      { birthDate: '1990-08-01' }),                          // outside window
  P('RememberToday',    { birthDate: '1930-01-01', deathDate: '2010-06-12', isDeceased: true }), // 16 yrs today
  P('RememberSoon',     { deathDate: '2020-06-20', isDeceased: true }),        // in 8 days
  P('DeceasedBirthday', { birthDate: '1950-06-12', isDeceased: true }),        // no birthday for deceased
  P('NoDates'),
];

const events = collectEvents(people, now);
const got = events.map(e => `${e.person.firstName}:${e.type}:d${e.daysAway}:y${e.years}`);
const expect = [
  'RememberToday:remembrance:d0:y16',
  'BirthdayToday:birthday:d0:y46',
  'BirthdayTomorrow:birthday:d1:y36',
  'RememberSoon:remembrance:d8:y6',
];

const ok = JSON.stringify(got) === JSON.stringify(expect);
console.log(ok ? 'PASS' : 'FAIL');
console.log(' got:   ', got);
if (!ok) console.log(' expect:', expect);
