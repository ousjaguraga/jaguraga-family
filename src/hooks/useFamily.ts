import { useState, useEffect, useCallback } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import type { Person, SiblingRelationship } from '../types';

const client = generateClient<Schema>();

function mapPerson(raw: Schema['Person']['type']): Person {
  return {
    id:            raw.id,
    firstName:     raw.firstName,
    lastName:      raw.lastName,
    middleName:    raw.middleName ?? null,
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

export async function createPerson(input: Omit<Person, 'id' | 'createdAt' | 'updatedAt' | 'owner'>): Promise<Person> {
  const { data, errors } = await client.models.Person.create(input as Parameters<typeof client.models.Person.create>[0]);
  if (errors?.length) throw new Error(errors[0].message);
  return mapPerson(data!);
}

export async function updatePerson(id: string, input: Partial<Omit<Person, 'id' | 'createdAt' | 'updatedAt' | 'owner'>>): Promise<Person> {
  const { data, errors } = await client.models.Person.update({ id, ...input } as Parameters<typeof client.models.Person.update>[0]);
  if (errors?.length) throw new Error(errors[0].message);
  return mapPerson(data!);
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
