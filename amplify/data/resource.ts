import { a, defineData, type ClientSchema } from '@aws-amplify/backend';

const schema = a.schema({
  Person: a
    .model({
      firstName:     a.string().required(),
      lastName:      a.string().required(),
      middleName:    a.string(),
      nickname:      a.string(),
      birthDate:     a.string(),
      birthPlace:    a.string(),
      deathDate:     a.string(),
      gender:        a.string().required(),     // MALE | FEMALE | OTHER
      bio:           a.string(),
      photoKey:      a.string(),
      generation:    a.string().required(),     // GREAT_GRANDPARENT | GRANDPARENT | PARENT | CURRENT | CHILD
      isAncestor:    a.boolean(),              // true = added by admin as a root ancestor
      isDeceased:    a.boolean(),
      cognitoUserId: a.string(),               // Cognito sub of linked user account

      // Parent references (stored as string IDs to avoid self-referential schema issues)
      fatherId:  a.string(),
      motherId:  a.string(),
      spouseId:  a.string(),

      // Sibling edges from this node
      siblings: a.hasMany('SiblingRelationship', 'personId'),
    })
    .authorization(allow => [
      allow.owner(),
      allow.ownerDefinedIn('cognitoUserId'),
      allow.group('Admin'),
      allow.authenticated().to(['read']),
    ]),

  // A signed-up member asking to join / link themselves into the tree.
  // Created by the member (owner), reviewed by an Admin.
  JoinRequest: a
    .model({
      personId:      a.string().required(),  // requester's Person record
      requesterName: a.string(),             // denormalized for easy admin display
      type:          a.string().required(),  // LINK_EXISTING | NEW_FAMILY
      // link to people already in the tree
      fatherId:      a.string(),
      motherId:      a.string(),
      spouseId:      a.string(),
      // proposal for a family not in the tree yet (JSON NewFamilyProposal)
      newFamilyJson: a.string(),
      message:       a.string(),
      status:        a.string().required(),  // PENDING | APPROVED | REJECTED
      adminNote:     a.string(),
    })
    .authorization(allow => [
      allow.owner(),
      allow.group('Admin'),
    ]),

  SiblingRelationship: a
    .model({
      personId:         a.id().required(),
      siblingPersonId:  a.id().required(),
      siblingType:      a.string(),            // FULL | HALF | STEP
      person: a.belongsTo('Person', 'personId'),
    })
    .authorization(allow => [
      allow.owner(),
      allow.group('Admin'),
      allow.authenticated().to(['read']),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
