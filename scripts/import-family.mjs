import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { parse } from 'csv-parse/sync';

const REGION = process.env.AWS_REGION ?? 'eu-west-1';
const TABLE =
  process.env.PERSON_TABLE ?? 'Person-5m2j6yumy5de7hw6maqw4ms55y-NONE';
const FAMILY_UNION_TABLE =
  process.env.FAMILY_UNION_TABLE ?? 'FamilyUnion-5m2j6yumy5de7hw6maqw4ms55y-NONE';
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const unionsOnly = args.includes('--unions-only');
const csvPath = args.find(arg => !arg.startsWith('--'));

if (!csvPath) {
  console.error('Usage: node scripts/import-family.mjs <family.csv> [--apply]');
  process.exit(1);
}

function aws(args) {
  return JSON.parse(
    execFileSync('aws', [...args, '--region', REGION, '--output', 'json'], {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    }),
  );
}

function stableId(sourceId) {
  const hex = createHash('sha256')
    .update(`jaguraga-family:${sourceId}`)
    .digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function tableExists(tableName) {
  try {
    execFileSync(
      'aws',
      ['dynamodb', 'describe-table', '--table-name', tableName, '--region', REGION],
      { stdio: 'ignore' },
    );
    return true;
  } catch {
    return false;
  }
}

function value(attribute) {
  if (!attribute || attribute.NULL) return null;
  if ('S' in attribute) return attribute.S;
  if ('BOOL' in attribute) return attribute.BOOL;
  if ('N' in attribute) return Number(attribute.N);
  return null;
}

function unmarshall(item) {
  return Object.fromEntries(
    Object.entries(item).map(([key, attribute]) => [key, value(attribute)]),
  );
}

function attribute(valueToStore) {
  if (valueToStore === null || valueToStore === undefined || valueToStore === '') {
    return { NULL: true };
  }
  if (typeof valueToStore === 'boolean') return { BOOL: valueToStore };
  return { S: String(valueToStore) };
}

function signature(person) {
  return [
    person.firstName,
    person.lastName,
    person.gender,
    person.generation,
    person.nickname ?? '',
  ]
    .join('|')
    .toLocaleLowerCase();
}

function basicSignature(person) {
  return [person.firstName, person.lastName, person.gender]
    .join('|')
    .toLocaleLowerCase();
}

function parseSections(text) {
  const rows = parse(text, { skip_empty_lines: true, relax_column_count: true });
  const people = [];
  const marriages = [];
  const children = [];
  let section = '';

  for (const row of rows) {
    if (['Place', 'Person', 'Marriage', 'Family'].includes(row[0])) {
      section = row[0];
      continue;
    }

    if (section === 'Person') {
      people.push({
        sourceId: row[0],
        surname: row[1] || '',
        given: row[2] || '',
        call: row[3] || '',
        nickname: row[4] || '',
        prefix: row[6] || '',
        gender: (row[8] || '').toLowerCase(),
        birthDate: row[9] || '',
        birthPlace: row[10] || '',
        deathDate: row[15] || '',
        note: row[21] || '',
      });
    } else if (section === 'Marriage') {
      marriages.push({
        familyId: row[0],
        husband: row[1],
        wife: row[2],
      });
    } else if (section === 'Family') {
      children.push({ familyId: row[0], child: row[1] });
    }
  }

  return { people, marriages, children };
}

function normalize({ people, marriages, children }) {
  const sourceById = new Map(people.map(person => [person.sourceId, person]));
  const marriageByFamily = new Map(
    marriages.map(marriage => [marriage.familyId, marriage]),
  );
  const parentsByChild = new Map();
  const spouseByPerson = new Map();

  for (const marriage of marriages) {
    spouseByPerson.set(marriage.husband, marriage.wife);
    spouseByPerson.set(marriage.wife, marriage.husband);
  }

  for (const relation of children) {
    const marriage = marriageByFamily.get(relation.familyId);
    if (!marriage) throw new Error(`Missing marriage for family ${relation.familyId}`);
    parentsByChild.set(relation.child, [marriage.husband, marriage.wife]);
  }

  // Married people belong to the same generation. Rank the resulting family
  // groups from oldest to youngest using the parent-child edges.
  const parent = new Map(people.map(person => [person.sourceId, person.sourceId]));
  const find = id => {
    let root = parent.get(id);
    while (root !== parent.get(root)) root = parent.get(root);
    let current = id;
    while (parent.get(current) !== root) {
      const next = parent.get(current);
      parent.set(current, root);
      current = next;
    }
    return root;
  };
  const union = (a, b) => {
    if (!parent.has(a) || !parent.has(b)) return;
    const aRoot = find(a);
    const bRoot = find(b);
    if (aRoot !== bRoot) parent.set(bRoot, aRoot);
  };

  for (const marriage of marriages) union(marriage.husband, marriage.wife);

  const groups = new Set(people.map(person => find(person.sourceId)));
  const edges = new Map();
  for (const [child, parents] of parentsByChild) {
    const childGroup = find(child);
    for (const parentId of parents) {
      if (!parent.has(parentId)) continue;
      const parentGroup = find(parentId);
      if (parentGroup === childGroup) continue;
      if (!edges.has(parentGroup)) edges.set(parentGroup, new Set());
      edges.get(parentGroup).add(childGroup);
    }
  }

  const ranks = new Map();
  const visiting = new Set();
  const rank = group => {
    if (ranks.has(group)) return ranks.get(group);
    if (visiting.has(group)) return 0;
    visiting.add(group);
    let result = 0;
    for (const [parentGroup, childGroups] of edges) {
      if (childGroups.has(group)) result = Math.max(result, rank(parentGroup) + 1);
    }
    visiting.delete(group);
    ranks.set(group, result);
    return result;
  };
  for (const group of groups) rank(group);

  const generationByRank = [
    'GREAT_GRANDPARENT',
    'GRANDPARENT',
    'PARENT',
    'CURRENT',
    'CHILD',
  ];

  return people.map(person => {
    const lastName = (person.surname || person.prefix || 'Jaguraga').trim();
    const lastNamePattern = lastName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rawFirstName = (person.given || person.call || person.nickname || 'Unknown')
      .trim()
      .replace(/\s+/g, ' ');
    const firstName =
      rawFirstName.replace(new RegExp(`\\s+${lastNamePattern}$`, 'i'), '').trim() ||
      rawFirstName;
    const parentIds = parentsByChild.get(person.sourceId) ?? [];
    const fatherSourceId =
      parentIds.find(id => sourceById.get(id)?.gender === 'male') ?? null;
    const motherSourceId =
      parentIds.find(id => sourceById.get(id)?.gender === 'female') ?? null;
    const personRank = ranks.get(find(person.sourceId)) ?? 0;

    return {
      sourceId: person.sourceId,
      firstName,
      lastName,
      middleName: null,
      nickname: person.nickname || null,
      birthDate: person.birthDate || null,
      birthPlace: person.birthPlace || null,
      deathDate: person.deathDate || null,
      gender:
        person.gender === 'male'
          ? 'MALE'
          : person.gender === 'female'
            ? 'FEMALE'
            : 'OTHER',
      bio: person.note || null,
      photoKey: null,
      generation: generationByRank[Math.min(personRank, generationByRank.length - 1)],
      isAncestor: true,
      isDeceased: Boolean(person.deathDate),
      cognitoUserId: null,
      fatherSourceId,
      motherSourceId,
      spouseSourceId: spouseByPerson.get(person.sourceId) ?? null,
    };
  });
}

function buildItems(people, existingItems) {
  const existingById = new Map(existingItems.map(item => [item.id, item]));
  const existingBySignature = new Map();
  const existingByBasicSignature = new Map();
  for (const existing of existingItems) {
    const key = signature(existing);
    if (!existingBySignature.has(key)) existingBySignature.set(key, []);
    existingBySignature.get(key).push(existing);
    const basicKey = basicSignature(existing);
    if (!existingByBasicSignature.has(basicKey)) existingByBasicSignature.set(basicKey, []);
    existingByBasicSignature.get(basicKey).push(existing);
  }

  const reusedExistingIds = new Set();
  const idBySource = new Map();
  const unmatchedPeople = [];
  for (const person of people) {
    const deterministicId = stableId(person.sourceId);
    const deterministicMatch = existingById.get(deterministicId);
    const matches = existingBySignature.get(signature(person)) ?? [];
    const basicMatches = existingByBasicSignature.get(basicSignature(person)) ?? [];
    const reusable = deterministicMatch ??
      matches.find(match => !reusedExistingIds.has(match.id)) ??
      basicMatches.find(match => !reusedExistingIds.has(match.id));
    if (reusable) {
      reusedExistingIds.add(reusable.id);
      idBySource.set(person.sourceId, reusable.id);
    } else {
      idBySource.set(person.sourceId, deterministicId);
      unmatchedPeople.push(`${person.sourceId} ${person.firstName} ${person.lastName}`);
    }
  }

  const now = new Date().toISOString();
  const items = people.map(person => {
    const id = idBySource.get(person.sourceId);
    const existing = existingById.get(id);
    const fields = {
      id,
      __typename: 'Person',
      firstName: person.firstName,
      lastName: person.lastName,
      middleName: person.middleName,
      nickname: person.nickname,
      birthDate: person.birthDate,
      birthPlace: person.birthPlace,
      deathDate: person.deathDate,
      gender: person.gender,
      bio: person.bio,
      photoKey: person.photoKey,
      generation: person.generation,
      isAncestor: person.isAncestor,
      isDeceased: person.isDeceased,
      cognitoUserId: person.cognitoUserId,
      fatherId: person.fatherSourceId
        ? idBySource.get(person.fatherSourceId) ?? null
        : null,
      motherId: person.motherSourceId
        ? idBySource.get(person.motherSourceId) ?? null
        : null,
      spouseId: person.spouseSourceId
        ? idBySource.get(person.spouseSourceId) ?? null
        : null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    if (existing?.owner) fields.owner = existing.owner;

    return Object.fromEntries(
      Object.entries(fields).map(([key, fieldValue]) => [key, attribute(fieldValue)]),
    );
  });

  return {
    items,
    idBySource,
    reusedCount: reusedExistingIds.size,
    unmatchedPeople,
    unusedExistingPeople: existingItems
      .filter(item => !reusedExistingIds.has(item.id))
      .map(item => `${item.id} ${item.firstName} ${item.lastName}`),
  };
}

function batchWrite(tableName, items) {
  const workDir = mkdtempSync(join(tmpdir(), 'jaguraga-import-'));
  try {
    for (let index = 0; index < items.length; index += 25) {
      let requests = items.slice(index, index + 25).map(Item => ({ PutRequest: { Item } }));
      let attempt = 0;

      while (requests.length) {
        attempt += 1;
        if (attempt > 10) throw new Error('Too many DynamoDB batch-write retries.');
        const requestFile = join(workDir, `batch-${index}-${attempt}.json`);
        writeFileSync(requestFile, JSON.stringify({ [tableName]: requests }));
        const result = aws([
          'dynamodb',
          'batch-write-item',
          '--request-items',
          `file://${requestFile}`,
        ]);
        requests = result.UnprocessedItems?.[tableName] ?? [];
      }
    }
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

const sections = parseSections(readFileSync(csvPath, 'utf8'));
const normalizedPeople = normalize(sections);
const scan = aws(['dynamodb', 'scan', '--table-name', TABLE]);
const existingItems = (scan.Items ?? []).map(unmarshall);
const {
  items,
  idBySource,
  reusedCount,
  unmatchedPeople,
  unusedExistingPeople,
} = buildItems(normalizedPeople, existingItems);
const familyUnionTableReady = tableExists(FAMILY_UNION_TABLE);
const now = new Date().toISOString();
const existingPersonIds = new Set(existingItems.map(item => item.id));
const unionPersonIds = unionsOnly
  ? existingPersonIds
  : new Set(items.map(item => value(item.id)));
const familyUnionItems = sections.marriages
  .filter(marriage =>
    unionPersonIds.has(idBySource.get(marriage.husband)) &&
    unionPersonIds.has(idBySource.get(marriage.wife)))
  .map(marriage => ({
    id:         attribute(stableId(`family:${marriage.familyId}`)),
    __typename: attribute('FamilyUnion'),
    partner1Id: attribute(idBySource.get(marriage.husband)),
    partner2Id: attribute(idBySource.get(marriage.wife)),
    startDate:  attribute(null),
    endDate:    attribute(null),
    status:     attribute('UNKNOWN'),
    notes:      attribute(null),
    createdAt:  attribute(now),
    updatedAt:  attribute(now),
  }));

const generationCounts = normalizedPeople.reduce((counts, person) => {
  counts[person.generation] = (counts[person.generation] ?? 0) + 1;
  return counts;
}, {});
const knownIds = new Set(items.map(item => value(item.id)));
const brokenLinks = items.flatMap(item =>
  ['fatherId', 'motherId', 'spouseId']
    .map(field => ({ person: value(item.id), field, linkedId: value(item[field]) }))
    .filter(link => link.linkedId && !knownIds.has(link.linkedId)),
);

console.log(`Source: ${basename(csvPath)}`);
console.log(
  JSON.stringify(
    {
      targetTable: TABLE,
      familyUnionTable: FAMILY_UNION_TABLE,
      familyUnionTableReady,
      people: normalizedPeople.length,
      marriages: sections.marriages.length,
      familyUnionsReadyToWrite: familyUnionItems.length,
      childLinks: sections.children.length,
      generationCounts,
      existingItems: existingItems.length,
      reusedExistingRecords: reusedCount,
      unmatchedPeople,
      unusedExistingPeople,
      brokenLinks,
      mode: apply ? (unionsOnly ? 'apply-unions-only' : 'apply') : 'dry-run',
    },
    null,
    2,
  ),
);

if (brokenLinks.length) throw new Error('Import contains broken relationship links.');

if (!apply) {
  console.log('Dry run complete. Add --apply to write the records.');
  process.exit(0);
}

if (!unionsOnly) batchWrite(TABLE, items);
if (familyUnionTableReady) batchWrite(FAMILY_UNION_TABLE, familyUnionItems);

const verification = aws([
  'dynamodb',
  'scan',
  '--table-name',
  TABLE,
  '--select',
  'COUNT',
]);
console.log(`Import complete. Target table now contains ${verification.Count} people.`);
if (familyUnionTableReady) {
  const unionVerification = aws([
    'dynamodb',
    'scan',
    '--table-name',
    FAMILY_UNION_TABLE,
    '--select',
    'COUNT',
  ]);
  console.log(`Family-union table now contains ${unionVerification.Count} recorded families.`);
}
