import { useState, useEffect, useCallback } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';
import {
  type Generation,
  type JoinRequest,
  type JoinRequestStatus,
  type JoinRequestType,
  type NewFamilyProposal,
} from '../types';
import { claimPersonForAccount, createPerson, updatePerson } from './useFamily';

const client = generateClient<Schema>();

type RawRequest = Schema['JoinRequest']['type'];

/** False until `npx ampx sandbox` has deployed the JoinRequest model. */
function backendReady(): boolean {
  return Boolean((client.models as Record<string, unknown>).JoinRequest);
}

const BACKEND_HINT = 'The join-request backend isn’t deployed yet. Run `npx ampx sandbox` and try again.';

function mapRequest(raw: RawRequest): JoinRequest {
  return {
    id:            raw.id,
    personId:      raw.personId,
    requesterName: raw.requesterName ?? null,
    type:          (raw.type as JoinRequestType) ?? 'LINK_EXISTING',
    fatherId:      raw.fatherId ?? null,
    motherId:      raw.motherId ?? null,
    spouseId:      raw.spouseId ?? null,
    newFamilyJson: raw.newFamilyJson ?? null,
    message:       raw.message ?? null,
    status:        (raw.status as JoinRequestStatus) ?? 'PENDING',
    adminNote:     raw.adminNote ?? null,
    createdAt:     raw.createdAt ?? undefined,
    updatedAt:     raw.updatedAt ?? undefined,
    owner:         raw.owner ?? null,
  };
}

/**
 * Lists join requests. Owners see their own; Admins see everyone's
 * (enforced by the model's authorization rules).
 */
export function useJoinRequests() {
  const [requests,  setRequests]  = useState<JoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!backendReady()) { setRequests([]); return; }
      const { data, errors } = await client.models.JoinRequest.list();
      if (errors?.length) throw new Error(errors[0].message);
      const mapped = (data ?? []).map(mapRequest).sort((a, b) =>
        new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
      setRequests(mapped);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { requests, isLoading, error, refresh: load };
}

export async function createJoinRequest(
  input: Omit<JoinRequest, 'id' | 'status' | 'adminNote' | 'createdAt' | 'updatedAt' | 'owner'>,
): Promise<JoinRequest> {
  if (!backendReady()) throw new Error(BACKEND_HINT);
  const { data, errors } = await client.models.JoinRequest.create(
    { ...input, status: 'PENDING' } as Parameters<typeof client.models.JoinRequest.create>[0],
  );
  if (errors?.length) throw new Error(errors[0].message);
  return mapRequest(data!);
}

export async function cancelJoinRequest(id: string): Promise<void> {
  const { errors } = await client.models.JoinRequest.delete({ id });
  if (errors?.length) throw new Error(errors[0].message);
}

/**
 * Admin approval — claims an existing profile or applies requested family links.
 * For NEW_FAMILY requests the proposed parents are created first (as
 * admin-managed ancestors), then linked.
 */
export async function approveJoinRequest(req: JoinRequest): Promise<void> {
  if (req.type === 'CLAIM_PROFILE') {
    if (!req.owner) throw new Error('This claim request is missing its account owner.');
    const cognitoUserId = req.owner.split('::')[0];
    if (!cognitoUserId) throw new Error('Unable to identify the account making this claim.');
    await claimPersonForAccount(req.personId, cognitoUserId);

    const { errors } = await client.models.JoinRequest.update({ id: req.id, status: 'APPROVED' });
    if (errors?.length) throw new Error(errors[0].message);
    return;
  }

  let fatherId = req.fatherId ?? null;
  let motherId = req.motherId ?? null;

  if (req.type === 'NEW_FAMILY' && req.newFamilyJson) {
    const proposal = JSON.parse(req.newFamilyJson) as NewFamilyProposal;
    const generation: Generation = proposal.generation ?? 'PARENT';
    if (proposal.father?.firstName) {
      const father = await createPerson({
        firstName:  proposal.father.firstName,
        lastName:   proposal.father.lastName || 'Jaguraga',
        nickname:   proposal.father.nickname || null,
        gender:     'MALE',
        generation,
        isAncestor: true,
        isDeceased: false,
      });
      fatherId = father.id;
    }
    if (proposal.mother?.firstName) {
      const mother = await createPerson({
        firstName:  proposal.mother.firstName,
        lastName:   proposal.mother.lastName || 'Jaguraga',
        nickname:   proposal.mother.nickname || null,
        gender:     'FEMALE',
        generation,
        isAncestor: true,
        isDeceased: false,
      });
      motherId = mother.id;
    }
    // Marry the new parents to each other so they form a couple in the tree.
    if (fatherId && motherId) {
      await updatePerson(fatherId, { spouseId: motherId });
      await updatePerson(motherId, { spouseId: fatherId });
    }
  }

  await updatePerson(req.personId, {
    ...(fatherId       ? { fatherId } : {}),
    ...(motherId       ? { motherId } : {}),
    ...(req.spouseId   ? { spouseId: req.spouseId } : {}),
  });

  const { errors } = await client.models.JoinRequest.update({ id: req.id, status: 'APPROVED' });
  if (errors?.length) throw new Error(errors[0].message);
}

export async function rejectJoinRequest(id: string, adminNote?: string): Promise<void> {
  const { errors } = await client.models.JoinRequest.update({
    id,
    status: 'REJECTED',
    adminNote: adminNote?.trim() || null,
  });
  if (errors?.length) throw new Error(errors[0].message);
}
