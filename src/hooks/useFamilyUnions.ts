import { useCallback, useEffect, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import type { FamilyUnion, FamilyUnionStatus } from '../types';

const client = generateClient<Schema>();

type RawUnion = Schema['FamilyUnion']['type'];

function backendReady(): boolean {
  return Boolean((client.models as Record<string, unknown>).FamilyUnion);
}

function mapUnion(raw: RawUnion): FamilyUnion {
  return {
    id:         raw.id,
    partner1Id: raw.partner1Id,
    partner2Id: raw.partner2Id,
    startDate:  raw.startDate ?? null,
    endDate:    raw.endDate ?? null,
    status:     (raw.status as FamilyUnionStatus) ?? 'UNKNOWN',
    notes:      raw.notes ?? null,
    createdAt:  raw.createdAt ?? undefined,
    updatedAt:  raw.updatedAt ?? undefined,
    owner:      raw.owner ?? null,
  };
}

export function useFamilyUnions() {
  const [unions, setUnions] = useState<FamilyUnion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!backendReady()) {
        setUnions([]);
        return;
      }
      const { data, errors } = await client.models.FamilyUnion.list();
      if (errors?.length) throw new Error(errors[0].message);
      setUnions((data ?? []).map(mapUnion));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { unions, isLoading, error, refresh: load };
}

export async function createFamilyUnion(
  input: Omit<FamilyUnion, 'id' | 'createdAt' | 'updatedAt' | 'owner'>,
): Promise<FamilyUnion> {
  if (!backendReady()) {
    throw new Error('The family-union backend has not been deployed yet.');
  }
  if (input.partner1Id === input.partner2Id) {
    throw new Error('A family must contain two different people.');
  }
  const { data, errors } = await client.models.FamilyUnion.create(
    input as Parameters<typeof client.models.FamilyUnion.create>[0],
  );
  if (errors?.length) throw new Error(errors[0].message);
  return mapUnion(data!);
}

export async function deleteFamilyUnion(id: string): Promise<void> {
  if (!backendReady()) return;
  const { errors } = await client.models.FamilyUnion.delete({ id });
  if (errors?.length) throw new Error(errors[0].message);
}
