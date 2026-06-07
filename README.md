# Jaguraga Family Tree

A full-stack family tracking website built with **AWS Amplify Gen 2**, **React**, **TypeScript**, and **Tailwind CSS**.

## Features

| Role   | Capabilities |
|--------|-------------|
| Admin  | Add/edit/delete ancestors (great-grandparents, grandparents, etc.), manage all members |
| Member | Create a profile, select parents from the ancestor list, add siblings, upload a photo |
| Public | Browse the family tree (read-only) |

---

## Prerequisites

- **Node.js 18+**
- **AWS account** with appropriate permissions
- **AWS CLI** configured (`aws configure`)
- **Amplify CLI** — installed via `npm install -g @aws-amplify/cli` (optional, Gen 2 uses `ampx`)

---

## Quick Start

### 1. Install dependencies

```bash
cd jaguraga-family
npm install
```

### 2. Deploy the backend (creates DynamoDB, Cognito, S3, AppSync)

```bash
npx ampx sandbox
```

This generates `amplify_outputs.json` in the project root. Keep this running in a terminal while developing — it watches for backend changes.

### 3. Run the frontend

```bash
npm run dev
```

Visit http://localhost:5173

---

## Make someone an Admin

After a user signs up, go to **AWS Console → Cognito → User Pools → your pool → Groups → Admin** and add them to the `Admin` group. They'll see the Admin menu item after their next sign-in.

---

## Deploy to production

### Option A — Amplify Hosting (recommended)

1. Push your code to GitHub / GitLab / Bitbucket
2. In the AWS Console, open **Amplify** → **New app** → connect your repo
3. Amplify auto-detects the Gen 2 backend and builds everything

### Option B — Manual

```bash
npx ampx pipeline-deploy --branch main --app-id <your-amplify-app-id>
npm run build
# Deploy dist/ to any static host (S3 + CloudFront, Netlify, etc.)
```

---

## Project structure

```
jaguraga-family/
├── amplify/
│   ├── auth/resource.ts       Cognito (email login, Admin group)
│   ├── data/resource.ts       AppSync + DynamoDB schema
│   ├── storage/resource.ts    S3 photo storage
│   └── backend.ts             Wires everything together
└── src/
    ├── pages/
    │   ├── Home.tsx            Public landing page
    │   ├── AuthPage.tsx        Amplify Authenticator (signup + login)
    │   ├── Dashboard.tsx       Post-login overview
    │   ├── FamilyTree.tsx      Visual tree + list view
    │   ├── MyProfile.tsx       Account overview
    │   ├── SetupProfile.tsx    Create/edit personal entry + lineage links
    │   ├── AddSibling.tsx      Link or create a sibling
    │   ├── PersonDetail.tsx    Full profile + relationships
    │   └── admin/
    │       ├── AdminDashboard.tsx  Member table with delete
    │       └── AddAncestor.tsx     Admin form for elders
    ├── components/
    │   ├── tree/               FamilyTreeView + PersonNode
    │   ├── Layout/             Navbar + Footer + Layout wrapper
    │   ├── PersonCard.tsx      Card used in lists
    │   ├── PhotoUpload.tsx     S3-backed photo uploader
    │   ├── ProtectedRoute.tsx  Redirects unauthenticated users
    │   └── AdminRoute.tsx      Redirects non-admin users
    ├── context/AuthContext.tsx Cognito session + isAdmin flag
    ├── hooks/useFamily.ts      CRUD helpers via Amplify data client
    ├── types/index.ts          Shared TypeScript types
    └── utils/helpers.ts        Date formatting, tree helpers
```

---

## Data model

```
Person
  firstName, lastName, middleName
  gender (MALE | FEMALE | OTHER)
  birthDate, birthPlace, deathDate
  bio, photoKey (S3 path)
  generation (GREAT_GRANDPARENT | GRANDPARENT | PARENT | CURRENT | CHILD)
  isAncestor  ← true if added by Admin
  isDeceased
  cognitoUserId ← links to a registered user account
  fatherId, motherId, spouseId ← IDs of other Person records

SiblingRelationship
  personId, siblingPersonId
  siblingType (FULL | HALF | STEP)
```
