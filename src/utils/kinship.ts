import type { Gender, Person } from '../types';
import { fullName } from './helpers';

/**
 * Relationship finder. Walks both people's ancestor trees, finds the closest
 * shared ancestor (or couple), and names the relationship in plain English:
 * father, great-grandmother, half-siblings, great-uncle, second cousins once
 * removed, … When no blood line exists it checks one marriage hop on either
 * side: uncle's wife → aunt by marriage, spouse's father → father-in-law,
 * parent's spouse → step-parent, and so on.
 */

export interface Relationship {
  kind: 'self' | 'spouse' | 'blood' | 'marriage' | 'none';
  /** Short headline, e.g. "Second cousins" or "Aunt by marriage". */
  label: string;
  /** Full sentence, e.g. "Mariama is married to Musa — Awa's great-uncle…". */
  sentence: string;
  /** Closest shared ancestors of the blood line — one person, or a couple. */
  ancestors: Person[];
  /** Blood chain from just below the shared ancestor down to side A's endpoint. */
  chainA: Person[];
  /** Same for side B. */
  chainB: Person[];
  /** Married-in person attached by ♥ to side A's blood endpoint (kind 'marriage'). */
  bridgeA?: Person | null;
  /** Same for side B. */
  bridgeB?: Person | null;
}

interface AncestorHit {
  depth: number;
  /** path[0] = self … path[depth] = the ancestor */
  path: Person[];
}

interface BloodCore {
  da: number;
  db: number;
  ancestors: Person[];
  chainA: Person[];
  chainB: Person[];
}

function ancestorMap(start: Person, byId: Map<string, Person>): Map<string, AncestorHit> {
  const out = new Map<string, AncestorHit>();
  const queue: AncestorHit[] = [{ depth: 0, path: [start] }];
  while (queue.length) {
    const cur = queue.shift()!;
    const person = cur.path[cur.path.length - 1];
    const existing = out.get(person.id);
    if (existing && existing.depth <= cur.depth) continue;
    out.set(person.id, cur);
    [person.fatherId, person.motherId].forEach(pid => {
      const parent = pid ? byId.get(pid) : null;
      if (parent && !cur.path.some(x => x.id === parent.id)) {
        queue.push({ depth: cur.depth + 1, path: [...cur.path, parent] });
      }
    });
  }
  return out;
}

/** Closest shared blood ancestor of a and b, or null when unrelated. */
function bloodCore(a: Person, b: Person, byId: Map<string, Person>): BloodCore | null {
  const mapA = ancestorMap(a, byId);
  const mapB = ancestorMap(b, byId);

  let best: { id: string; da: number; db: number } | null = null;
  for (const [id, ha] of mapA) {
    const hb = mapB.get(id);
    if (!hb) continue;
    const da = ha.depth, db = hb.depth;
    if (
      !best ||
      da + db < best.da + best.db ||
      (da + db === best.da + best.db && Math.max(da, db) < Math.max(best.da, best.db))
    ) {
      best = { id, da, db };
    }
  }
  if (!best) return null;

  const { da, db } = best;
  const anc = byId.get(best.id)!;
  const pathA = mapA.get(best.id)!.path; // [a, …, anc]
  const pathB = mapB.get(best.id)!.path;

  // Did both lines descend from the same COUPLE? (shared father and mother)
  let ancestors: Person[] = [anc];
  if (da > 0 && db > 0) {
    const childA = pathA[da - 1];
    const childB = pathB[db - 1];
    const otherA = childA.fatherId === anc.id ? childA.motherId : childA.fatherId;
    const otherB = childB.fatherId === anc.id ? childB.motherId : childB.fatherId;
    if (otherA && otherA === otherB) {
      const partner = byId.get(otherA);
      if (partner) {
        ancestors = anc.gender === 'MALE' ? [anc, partner] : [partner, anc];
      }
    }
  }

  return {
    da, db, ancestors,
    chainA: pathA.slice(0, da).reverse(), // child of the ancestor first, endpoint last
    chainB: pathB.slice(0, db).reverse(),
  };
}

// ── Naming ────────────────────────────────────────────────────────────────

const greats = (n: number) => 'great-'.repeat(Math.max(0, n));

const ORDINALS = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth'];
const ordinal = (n: number) => ORDINALS[n] ?? `${n}th`;

const removedTxt = (n: number) =>
  n === 0 ? '' : n === 1 ? ' once removed' : n === 2 ? ' twice removed' : ` ${n} times removed`;

function ancestorTerm(g: Gender, d: number): string {
  if (d === 1) return g === 'MALE' ? 'father' : g === 'FEMALE' ? 'mother' : 'parent';
  const base = g === 'MALE' ? 'grandfather' : g === 'FEMALE' ? 'grandmother' : 'grandparent';
  return `${greats(d - 2)}${base}`;
}

function descendantTerm(g: Gender, d: number): string {
  if (d === 1) return g === 'MALE' ? 'son' : g === 'FEMALE' ? 'daughter' : 'child';
  const base = g === 'MALE' ? 'grandson' : g === 'FEMALE' ? 'granddaughter' : 'grandchild';
  return `${greats(d - 2)}${base}`;
}

function uncleTerm(g: Gender, d: number): string {
  const base = g === 'MALE' ? 'uncle' : g === 'FEMALE' ? 'aunt' : 'uncle/aunt';
  return `${greats(d - 2)}${base}`;
}

function nephewTerm(g: Gender, d: number): string {
  const base = g === 'MALE' ? 'nephew' : g === 'FEMALE' ? 'niece' : 'nephew/niece';
  return `${greats(d - 2)}${base}`;
}

const siblingTerm = (g: Gender) =>
  g === 'MALE' ? 'brother' : g === 'FEMALE' ? 'sister' : 'sibling';

function siblingNoun(a: Gender, b: Gender): string {
  if (a === 'MALE' && b === 'MALE') return 'brothers';
  if (a === 'FEMALE' && b === 'FEMALE') return 'sisters';
  return 'siblings';
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "x is y's ___" where x is side A of the core and y is side B. */
function bloodPhrase(x: Person, core: BloodCore): string {
  const { da, db } = core;
  if (da === 0) return ancestorTerm(x.gender, db);
  if (db === 0) return descendantTerm(x.gender, da);
  if (da === 1 && db === 1) {
    return core.ancestors.length === 2 ? siblingTerm(x.gender) : `half-${siblingTerm(x.gender)}`;
  }
  if (da === 1) return uncleTerm(x.gender, db);
  if (db === 1) return nephewTerm(x.gender, da);
  return `${ordinal(Math.min(da, db) - 1)} cousin${removedTxt(Math.abs(da - db))}`;
}

function nameBlood(a: Person, b: Person, core: BloodCore): { label: string; sentence: string } {
  const { da, db, ancestors } = core;
  const nameA = fullName(a), nameB = fullName(b);
  const through = ancestors.length === 2
    ? ` — through ${fullName(ancestors[0])} & ${fullName(ancestors[1])}`
    : da > 0 && db > 0 ? ` — through ${fullName(ancestors[0])}` : '';

  if (da === 0) {
    const t = ancestorTerm(a.gender, db);
    return { label: cap(t), sentence: `${nameA} is ${nameB}'s ${t}.` };
  }
  if (db === 0) {
    return {
      label: cap(descendantTerm(a.gender, da)),
      sentence: `${nameB} is ${nameA}'s ${ancestorTerm(b.gender, da)}.`,
    };
  }
  if (da === 1 && db === 1) {
    const half = ancestors.length < 2;
    const noun = siblingNoun(a.gender, b.gender);
    return {
      label: half ? `Half-${noun}` : cap(noun),
      sentence: `${nameA} and ${nameB} are ${half ? `half-${noun}` : noun}${through}.`,
    };
  }
  if (da === 1 || db === 1) {
    const t = bloodPhrase(a, core);
    return { label: cap(t), sentence: `${nameA} is ${nameB}'s ${t}${through}.` };
  }
  const degree = Math.min(da, db) - 1;
  const removed = Math.abs(da - db);

  // "Once removed" confuses everyone — spell out whose cousin they really are:
  // the actual cousin pair sits at the same depth on both sides of the ancestor.
  let detail = '';
  if (removed > 0) {
    const deeper = da > db ? a : b;                       // the younger-generation person
    const shallower = da > db ? b : a;                    // the one in the older generation
    const deeperChain = da > db ? core.chainA : core.chainB;
    const trueCousin = deeperChain[Math.min(da, db) - 1]; // deeper side's ancestor at matching depth
    detail = ` ${fullName(shallower)} is the ${ordinal(degree)} cousin of ${fullName(trueCousin)}, ${fullName(deeper)}'s ${ancestorTerm(trueCousin.gender, removed)}.`;
  }

  return {
    label: `${cap(ordinal(degree))} cousins${removedTxt(removed)}`,
    sentence: `${nameA} and ${nameB} are ${ordinal(degree)} cousins${removedTxt(removed)}${through}.${detail}`,
  };
}

// ── Marriage (affinal) relationships ──────────────────────────────────────

/** Explicit spouse links (both directions) plus co-parents of a shared child. */
function partnersOf(p: Person, persons: Person[], byId: Map<string, Person>): Person[] {
  const ids = new Set<string>();
  if (p.spouseId && byId.has(p.spouseId)) ids.add(p.spouseId);
  persons.forEach(q => { if (q.spouseId === p.id && byId.has(q.id)) ids.add(q.id); });
  persons.forEach(c => {
    if (c.fatherId === p.id && c.motherId && byId.has(c.motherId)) ids.add(c.motherId);
    if (c.motherId === p.id && c.fatherId && byId.has(c.fatherId)) ids.add(c.fatherId);
  });
  ids.delete(p.id);
  return [...ids].map(id => byId.get(id)!);
}

/**
 * What is `a` to `b`, given the marriage hop?
 * side 'A': a is married to s, and s↔b is the blood line (core = bloodCore(s, b)).
 * side 'B': b is married to s, and a↔s is the blood line (core = bloodCore(a, s)).
 */
function affinalTerm(side: 'A' | 'B', g: Gender, core: BloodCore): string {
  const { da, db } = core;
  if (side === 'A') {
    // da = spouse's depth, db = b's depth
    if (da === 0) {
      return db === 1
        ? (g === 'MALE' ? 'stepfather' : g === 'FEMALE' ? 'stepmother' : 'step-parent')
        : `${ancestorTerm(g, db)} by marriage`;
    }
    if (db === 0) return `${descendantTerm(g, da)}${da === 1 ? '-in-law' : ' by marriage'}`;
    if (da === 1 && db === 1) return `${siblingTerm(g)}-in-law`;
    if (da === 1) return `${uncleTerm(g, db)} by marriage`;
    if (db === 1) return `${nephewTerm(g, da)} by marriage`;
  } else {
    // da = a's depth, db = spouse's depth
    if (da === 0) return `${ancestorTerm(g, db)}${db === 1 ? '-in-law' : ' by marriage'}`;
    if (db === 0) {
      return da === 1
        ? `step${descendantTerm(g, 1)}`
        : `${descendantTerm(g, da)} by marriage`;
    }
    if (da === 1 && db === 1) return `${siblingTerm(g)}-in-law`;
    if (da === 1) return `${uncleTerm(g, db)} by marriage`;
    if (db === 1) return `${nephewTerm(g, da)} by marriage`;
  }
  return `${ordinal(Math.min(da, db) - 1)} cousin${removedTxt(Math.abs(da - db))} by marriage`;
}

// ── Main entry ────────────────────────────────────────────────────────────

export function findRelationship(a: Person, b: Person, persons: Person[]): Relationship {
  if (a.id === b.id) {
    return {
      kind: 'self', label: 'Same person',
      sentence: `That's ${fullName(a)} — pick two different people.`,
      ancestors: [], chainA: [], chainB: [],
    };
  }

  const byId = new Map(persons.map(p => [p.id, p]));

  // Marriage outranks any distant blood tie.
  if (a.spouseId === b.id || b.spouseId === a.id) {
    const label = a.gender === 'MALE' && b.gender === 'FEMALE' ? 'Husband & wife'
      : a.gender === 'FEMALE' && b.gender === 'MALE' ? 'Wife & husband'
      : 'Spouses';
    return {
      kind: 'spouse', label,
      sentence: `${fullName(a)} and ${fullName(b)} are married.`,
      ancestors: [], chainA: [a], chainB: [b],
    };
  }

  // Direct blood line.
  const core = bloodCore(a, b, byId);
  if (core) {
    const { label, sentence } = nameBlood(a, b, core);
    return { kind: 'blood', label, sentence, ancestors: core.ancestors, chainA: core.chainA, chainB: core.chainB };
  }

  // One marriage hop: a's spouse related to b, or b's spouse related to a.
  let best: { side: 'A' | 'B'; spouse: Person; core: BloodCore } | null = null;
  const consider = (side: 'A' | 'B', spouse: Person, c: BloodCore | null) => {
    if (!c) return;
    if (!best || c.da + c.db < best.core.da + best.core.db) best = { side, spouse, core: c };
  };
  partnersOf(a, persons, byId).forEach(s => {
    if (s.id !== b.id) consider('A', s, bloodCore(s, b, byId));
  });
  partnersOf(b, persons, byId).forEach(s => {
    if (s.id !== a.id) consider('B', s, bloodCore(a, s, byId));
  });

  if (best) {
    const { side, spouse, core: c } = best as { side: 'A' | 'B'; spouse: Person; core: BloodCore };
    const term = affinalTerm(side, a.gender, c);
    const nameA = fullName(a), nameB = fullName(b), nameS = fullName(spouse);
    const sentence = side === 'A'
      ? `${nameA} is married to ${nameS} — ${nameB}'s ${bloodPhrase(spouse, c)}. That makes ${nameA} ${nameB}'s ${term}.`
      : `${nameA} is ${nameS}'s ${bloodPhrase(a, c)}, and ${nameS} is married to ${nameB}. That makes ${nameA} ${nameB}'s ${term}.`;
    return {
      kind: 'marriage',
      label: cap(term),
      sentence,
      ancestors: c.ancestors,
      chainA: c.chainA,
      chainB: c.chainB,
      bridgeA: side === 'A' ? a : null,
      bridgeB: side === 'B' ? b : null,
    };
  }

  return {
    kind: 'none',
    label: 'No recorded link',
    sentence: `No recorded connection between ${fullName(a)} and ${fullName(b)} — a parent or spouse link may be missing.`,
    ancestors: [], chainA: [], chainB: [],
  };
}
