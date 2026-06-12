import { findRelationship } from '../src/utils/kinship';
import type { Person } from '../src/types';

let n = 0;
const P = (firstName: string, gender: Person['gender'], extra: Partial<Person> = {}): Person => ({
  id: `p${++n}`, firstName, lastName: 'Test', gender,
  generation: 'CURRENT', ...extra,
});

// Generation 0: founding couple
const grandpa = P('Grandpa', 'MALE');
const grandma = P('Grandma', 'FEMALE');
// Their children
const father = P('Father', 'MALE',  { fatherId: grandpa.id, motherId: grandma.id });
const uncle  = P('Uncle',  'MALE',  { fatherId: grandpa.id, motherId: grandma.id });
const auntW  = P('AuntByMarriage', 'FEMALE', { spouseId: uncle.id }); // uncle's wife
// My parents + me + sibling
const mother = P('Mother', 'FEMALE', { spouseId: father.id });
const me     = P('Me',     'MALE',   { fatherId: father.id, motherId: mother.id });
const sister = P('Sister', 'FEMALE', { fatherId: father.id, motherId: mother.id });
// My wife and her father
const wife    = P('Wife',    'FEMALE', { spouseId: me.id });
const wifeDad = P('WifeDad', 'MALE');
wife.fatherId = wifeDad.id;
// Father's second wife (no children)
const stepmom = P('Stepmom', 'FEMALE', { spouseId: father.id });
// Uncle's son (my cousin) and the cousin's wife
const cousin  = P('Cousin', 'MALE', { fatherId: uncle.id, motherId: auntW.id });
const cousinW = P('CousinWife', 'FEMALE', { spouseId: cousin.id });

// Father's first cousin: great-grandpa → grandpa + granduncle; granduncle's son
// is father's first cousin (they share the same grandfather… from me: great-grandfather)
const greatGrandpa = P('GreatGrandpa', 'MALE');
grandpa.fatherId = greatGrandpa.id;
const grandUncle = P('GrandUncle', 'MALE', { fatherId: greatGrandpa.id });
const fatherCousin = P('FatherCousin', 'MALE', { fatherId: grandUncle.id });

const all = [grandpa, grandma, father, uncle, auntW, mother, me, sister, wife, wifeDad, stepmom, cousin, cousinW, greatGrandpa, grandUncle, fatherCousin];

const check = (a: Person, b: Person, expectLabel: string) => {
  const r = findRelationship(a, b, all);
  const ok = r.label === expectLabel;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${a.firstName} → ${b.firstName}: "${r.label}" ${ok ? '' : `(expected "${expectLabel}")`}`);
  if (!ok) console.log(`      ${r.sentence}`);
};

// Blood
check(grandpa, me, 'Grandfather');
check(me, grandpa, 'Grandson');
check(me, sister, 'Brother and sister' === '' ? '' : 'Siblings');
check(uncle, me, 'Uncle');
check(me, cousin, 'First cousins');
// Marriage
check(me, wife, 'Husband & wife');
check(auntW, me, 'Aunt by marriage');
check(me, auntW, 'Nephew by marriage');
check(wifeDad, me, 'Father-in-law');
check(stepmom, me, 'Stepmother');
check(me, stepmom, 'Stepson');
check(wife, sister, 'Sister-in-law');
check(cousinW, me, 'First cousin by marriage');
// Father's first cousin = my first cousin once removed
check(me, fatherCousin, 'First cousins once removed');
check(fatherCousin, me, 'First cousins once removed');
check(father, fatherCousin, 'First cousins');
console.log('  →', findRelationship(me, fatherCousin, all).sentence);
// Sanity
const rNone = findRelationship(wifeDad, grandpa, all);
console.log(`${rNone.kind === 'none' ? 'PASS' : 'FAIL'}  WifeDad → Grandpa: kind=${rNone.kind} (expected none)`);
