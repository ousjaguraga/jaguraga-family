import { a, defineData, type ClientSchema } from '@aws-amplify/backend';

const schema = a.schema({
  Person: a
    .model({
      firstName:     a.string().required(),
      lastName:      a.string().required(),
      middleName:    a.string(),
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
      allow.group('Admin'),
      allow.authenticated().to(['read']),
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
