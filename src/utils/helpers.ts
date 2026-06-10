import { Person, Generation, GENERATION_ORDER } from '../types';

export function fullName(p: Pick<Person, 'firstName' | 'lastName' | 'middleName'>): string {
  return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ');
}

export function initials(p: Pick<Person, 'firstName' | 'lastName'>): string {
  return `${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}`.toUpperCase();
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function getAge(birthDate?: string | null, deathDate?: string | null): string {
  if (!birthDate) return '—';
  const end  = deathDate ? new Date(deathDate) : new Date();
  const born = new Date(birthDate);
  const age  = Math.floor((end.getTime() - born.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return isNaN(age) ? '—' : String(age);
}

/** Build a map from parentId → children, so we can render the tree. */
export function buildChildrenMap(persons: Person[]): Map<string, Person[]> {
  const map = new Map<string, Person[]>();
  for (const p of persons) {
    if (p.fatherId) {
      if (!map.has(p.fatherId)) map.set(p.fatherId, []);
      map.get(p.fatherId)!.push(p);
    }
    if (p.motherId) {
      if (!map.has(p.motherId)) map.set(p.motherId, []);
      // avoid duplicates if same person listed under both parents
      if (!map.get(p.motherId)!.find(c => c.id === p.id)) {
        map.get(p.motherId)!.push(p);
      }
    }
  }
  return map;
}

/** Persons with no parent records in the dataset — they are tree roots. */
export function findRoots(persons: Person[]): Person[] {
  const ids = new Set(persons.map(p => p.id));
  return persons.filter(p => {
    const fatherInSet = p.fatherId && ids.has(p.fatherId);
    const motherInSet = p.motherId && ids.has(p.motherId);
    return !fatherInSet && !motherInSet;
  });
}

export function generationIndex(gen: Generation): number {
  return GENERATION_ORDER.indexOf(gen);
}

/** One generation older (where a person's parents live), or null at the top. */
export function generationAbove(gen: Generation): Generation | null {
  const idx = generationIndex(gen);
  return idx > 0 ? GENERATION_ORDER[idx - 1] : null;
}

/** One generation younger (where a person's children live), or null at the bottom. */
export function generationBelow(gen: Generation): Generation | null {
  const idx = generationIndex(gen);
  return idx < GENERATION_ORDER.length - 1 ? GENERATION_ORDER[idx + 1] : null;
}

export function sortByGeneration(persons: Person[]): Person[] {
  return [...persons].sort((a, b) => generationIndex(a.generation) - generationIndex(b.generation));
}

export function groupByGeneration(persons: Person[]): Map<Generation, Person[]> {
  const map = new Map<Generation, Person[]>();
  for (const gen of GENERATION_ORDER) map.set(gen, []);
  for (const p of persons) {
    map.get(p.generation)?.push(p);
  }
  return map;
}
