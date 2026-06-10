export type Generation =
  | 'GREAT_GRANDPARENT'
  | 'GRANDPARENT'
  | 'PARENT'
  | 'CURRENT'
  | 'CHILD';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export type SiblingType = 'FULL' | 'HALF' | 'STEP';

export interface Person {
  id:            string;
  firstName:     string;
  lastName:      string;
  middleName?:   string | null;
  nickname?:     string | null;
  birthDate?:    string | null;
  birthPlace?:   string | null;
  deathDate?:    string | null;
  gender:        Gender;
  bio?:          string | null;
  photoKey?:     string | null;
  generation:    Generation;
  isAncestor?:   boolean | null;
  isDeceased?:   boolean | null;
  cognitoUserId?: string | null;
  fatherId?:     string | null;
  motherId?:     string | null;
  spouseId?:     string | null;
  createdAt?:    string;
  updatedAt?:    string;
  owner?:        string | null;
}

export type JoinRequestType   = 'LINK_EXISTING' | 'NEW_FAMILY';
export type JoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** Names proposed for parents who aren't in the tree yet. */
export interface NewFamilyProposal {
  father?: { firstName: string; lastName: string; nickname?: string };
  mother?: { firstName: string; lastName: string; nickname?: string };
  /** generation the new parents belong to */
  generation: Generation;
}

export interface JoinRequest {
  id:             string;
  personId:       string;
  requesterName?: string | null;
  type:           JoinRequestType;
  fatherId?:      string | null;
  motherId?:      string | null;
  spouseId?:      string | null;
  newFamilyJson?: string | null;
  message?:       string | null;
  status:         JoinRequestStatus;
  adminNote?:     string | null;
  createdAt?:     string;
  updatedAt?:     string;
  owner?:         string | null;
}

export interface SiblingRelationship {
  id:               string;
  personId:         string;
  siblingPersonId:  string;
  siblingType?:     SiblingType | null;
}

export const GENERATION_LABELS: Record<Generation, string> = {
  GREAT_GRANDPARENT: 'Great-Grandparent',
  GRANDPARENT:       'Grandparent',
  PARENT:            'Parent',
  CURRENT:           'Current Generation',
  CHILD:             'Child',
};

export const GENERATION_ORDER: Generation[] = [
  'GREAT_GRANDPARENT',
  'GRANDPARENT',
  'PARENT',
  'CURRENT',
  'CHILD',
];
