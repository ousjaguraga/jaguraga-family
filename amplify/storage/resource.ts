import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'jaguragaFamilyPhotos',
  access: allow => ({
    'photos/*': [
      allow.authenticated.to(['read', 'write', 'delete']),
      allow.guest.to(['read']),
    ],
  }),
});
