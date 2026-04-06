# Promo Codes REST API

Test task implementation: REST API for promo codes with activation tracking.

## Stack

- Node.js
- TypeScript
- PostgreSQL
- Express
- `pg` + raw SQL

## Features

- Promo code CRUD:
  - create
  - get by id
  - list
  - update
  - delete
- Activation by email:
  - one email can activate a specific promo code only once
  - promo code cannot be activated over the limit
  - expired promo code cannot be activated
- Concurrency-safe activation using SQL transactions and row locking (`FOR UPDATE`)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and configure PostgreSQL:

```bash
cp .env.example .env
```

3. Create database tables:

```bash
npm run db:init
```

4. Start in dev mode:

```bash
npm run dev
```

Server runs on `http://localhost:3000` by default.

## Scripts

- `npm run dev` - run server with TSX
- `npm run db:init` - initialize database schema
- `npm run check` - TypeScript check
- `npm run build` - compile to `dist`
- `npm run start` - run compiled build

## API

### Health

- `GET /health`

### Promo codes

- `POST /promo-codes`
- `GET /promo-codes`
- `GET /promo-codes/:id`
- `PUT /promo-codes/:id`
- `DELETE /promo-codes/:id`

Create/update payload:

```json
{
  "code": "SPRING25",
  "discountPercent": 25,
  "activationLimit": 100,
  "expiresAt": "2026-12-31T23:59:59.000Z"
}
```

### Activations

- `POST /activations`

Payload:

```json
{
  "code": "SPRING25",
  "email": "user@example.com"
}
```

Common errors:

- `404` promo code not found
- `409` already activated by this email
- `409` activation limit reached
- `409` promo code expired
