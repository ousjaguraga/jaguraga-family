import { useState, useEffect, useCallback } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import type { Person, SiblingRelationship } from '../types';
import outputs from '../../amplify_outputs.json';

const client = generateClient<Schema>();

// Fields the DEPLOYED backend actually knows about. Newer code may add fields
// (e.g. nickname) before `npx ampx sandbox` redeploys — sending those would
// fail every mutation with "field not defined for input object type".
const deployedPersonFields: Set<string> | null = (() => {
  try {
    const fields = (outputs as {
      data?: { model_introspection?: { models?: { Person?: { fields?: Record<string, unknown> } } } };
    }).data?.model_introspection?.models?.Person?.fields;
    return fields ? new Set(Object.keys(fields)) : null;
  } catch {
    return null;
  }
})();

function sanitizePersonInput<T extends Record<string, unknown>>(input: T): T {
  if (!deployedPersonFields) return input;
  const dropped = Object.keys(input).filter(k => !deployedPersonFields.has(k));
  if (dropped.length) {
    console.warn(
      `Backend schema is out of date — dropping unsupported field(s): ${dropped.join(', ')}. ` +
      'Run `npx ampx sandbox` to deploy the latest schema.',
    );
  }
  return Object.fromEntries(
    Object.entries(input).filter(([k]) => deployedPersonFields.has(k)),
  ) as T;
}

function mapPerson(raw: Schema['Person']['type']): Person {
  return {
    id:            raw.id,
    firstName:     raw.firstName,
    lastName:      raw.lastName,
    middleName:    raw.middleName ?? null,
    nickname:      raw.nickname ?? null,
    birthDate:     raw.birthDate ?? null,
    birthPlace:    raw.birthPlace ?? null,
    deathDate:     raw.deathDate ?? null,
    gender:        (raw.gender as Person['gender']) ?? 'OTHER',
    bio:           raw.bio ?? null,
    photoKey:      raw.photoKey ?? null,
    generation:    (raw.generation as Person['generation']) ?? 'CURRENT',
    isAncestor:    raw.isAncestor ?? null,
    isDeceased:    raw.isDeceased ?? null,
    cognitoUserId: raw.cognitoUserId ?? null,
    fatherId:      raw.fatherId ?? null,
    motherId:      raw.motherId ?? null,
    spouseId:      raw.spouseId ?? null,
    createdAt:     raw.createdAt ?? undefined,
    updatedAt:     raw.updatedAt ?? undefined,
    owner:         raw.owner ?? null,
  };
}

export function useAllPersons() {
  const [persons,   setPersons]   = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, errors } = await client.models.Person.list();
      if (errors?.length) throw new Error(errors[0].message);
      setPersons((data ?? []).map(mapPerson));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { persons, isLoading, error, refresh: load };
}

export function usePersonById(id: string | undefined) {
  const [person,    setPerson]    = useState<Person | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setIsLoading(false); return; }
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const { data, errors } = await client.models.Person.get({ id });
        if (errors?.length) throw new Error(errors[0].message);
        if (!cancelled) setPerson(data ? mapPerson(data) : null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  return { person, isLoading, error };
}

async function tryGetPerson(id: string): Promise<Person | null> {
  try {
    const { data, errors } = await client.models.Person.get({ id });
    if (errors?.length || !data) return null;
    return mapPerson(data);
  } catch {
    return null;
  }
}

/**
 * Keep spouse links reciprocal.
 * The `spouseId` field acts as the current spouse pointer; historical/parallel
 * partner relationships are still inferred via shared children in UI/graph.
 * Best-effort only: failures here should never block the main save flow.
 */
async function trySetMutualSpouse(aId: string, bId: string): Promise<void> {
  if (!aId || !bId || aId === bId) return;

  try {
    const [a, b] = await Promise.all([tryGetPerson(aId), tryGetPerson(bId)]);
    if (!a || !b) return;

    const updates: Promise<unknown>[] = [];
    if (a.spouseId !== bId) {
      updates.push(client.models.Person.update({ id: aId, spouseId: bId } as Parameters<typeof client.models.Person.update>[0]));
    }
    if (b.spouseId !== aId) {
      updates.push(client.models.Person.update({ id: bId, spouseId: aId } as Parameters<typeof client.models.Person.update>[0]));
    }
    if (updates.length) await Promise.all(updates);
  } catch {
    // best-effort; no-op
  }
}

async function tryAutoLinkSpouses(person: Pick<Person, 'id' | 'spouseId' | 'fatherId' | 'motherId'>): Promise<void> {
  if (person.spouseId) {
    await trySetMutualSpouse(person.id, person.spouseId);
  }
  if (person.fatherId && person.motherId) {
    await trySetMutualSpouse(person.fatherId, person.motherId);
  }
}

export async function createPerson(input: Omit<Person, 'id' | 'createdAt' | 'updatedAt' | 'owner'>): Promise<Person> {
  const safe = sanitizePersonInput(input as Record<string, unknown>);
  const { data, errors } = await client.models.Person.create(safe as Parameters<typeof client.models.Person.create>[0]);
  if (errors?.length) throw new Error(errors[0].message);
  const saved = mapPerson(data!);
  await tryAutoLinkSpouses(saved);
  return saved;
}

export async function updatePerson(id: string, input: Partial<Omit<Person, 'id' | 'createdAt' | 'updatedAt' | 'owner'>>): Promise<Person> {
  const safe = sanitizePersonInput({ id, ...input } as Record<string, unknown>);
  const { data, errors } = await client.models.Person.update(safe as Parameters<typeof client.models.Person.update>[0]);
  if (errors?.length) throw new Error(errors[0].message);
  const saved = mapPerson(data!);
  const latest = (await tryGetPerson(id)) ?? saved;
  await tryAutoLinkSpouses(latest);
  return saved;
}

export async function deletePerson(id: string): Promise<void> {
  const { errors } = await client.models.Person.delete({ id });
  if (errors?.length) throw new Error(errors[0].message);
}

export async function addSibling(
  personId: string,
  siblingPersonId: string,
  siblingType: SiblingRelationship['siblingType'] = 'FULL',
): Promise<void> {
  const { errors } = await client.models.SiblingRelationship.create({ personId, siblingPersonId, siblingType });
  if (errors?.length) throw new Error(errors[0].message);
  // Add reverse edge so both see each other
  await client.models.SiblingRelationship.create({ personId: siblingPersonId, siblingPersonId: personId, siblingType });
}

export async function getSiblings(personId: string): Promise<SiblingRelationship[]> {
  const { data, errors } = await client.models.SiblingRelationship.list({
    filter: { personId: { eq: personId } },
  });
  if (errors?.length) throw new Error(errors[0].message);
  return (data ?? []).map(r => ({
    id:              r.id,
    personId:        r.personId,
    siblingPersonId: r.siblingPersonId,
    siblingType:     (r.siblingType as SiblingRelationship['siblingType']) ?? null,
  }));
}
