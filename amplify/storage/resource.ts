import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'jaguragaFamilyPhotos',
  access: allow => ({
    'photos/*': [
      // Admin group members may assume a dedicated IAM role, so grant the
      // group explicitly in addition to generic authenticated access.
      allow.groups(['Admin']).to(['read', 'write', 'delete']),
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.guest.to(['read']),
    ],
  }),
});
