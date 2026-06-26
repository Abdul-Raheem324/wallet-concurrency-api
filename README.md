# Wallet Concurrency API

A high-velocity REST API that handles concurrent writes to a shared wallet balance without data loss or corruption.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (via Prisma ORM)
- **Concurrency Strategy**: Optimistic Locking with retry

---

## Concurrency Strategy

### What I used: Optimistic Locking with version field

Each wallet has a `version` column. When applying a delta:

1. Read the wallet and note its current `version`
2. Update only if `version` still matches (no one else updated in between)
3. If 0 rows updated → someone else won the race → retry with backoff
4. Retry up to 15 times with random backoff (50–150ms) to avoid thundering herd

```sql
UPDATE wallets
SET balance = newBalance, version = version + 1
WHERE id = $id AND version = $expectedVersion
```

If the version has changed, the update silently affects 0 rows — we detect this and retry.

### Why not Pessimistic Locking (SELECT FOR UPDATE)?

| | Optimistic | Pessimistic |
|---|---|---|
| How it works | Retry on conflict | Block until lock released |
| Best for | Low-medium contention | Very high contention |
| Risk | Retries under high load | Deadlocks, long waits |
| DB connections held | Short | Long (lock held during transaction) |

For a wallet API where conflicts are occasional, optimistic locking gives better throughput. At very high contention (500 workers, same record), a small number of retries may exhaust — but zero data corruption occurs.

### Why not raw `UPDATE balance = balance + delta`?

A simple atomic update works for pure increments but does not let us enforce business rules like minimum balance checks before the update. Optimistic locking lets us read, validate, then write safely.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/wallet` | Create a new wallet |
| GET | `/api/wallet/:id` | Read wallet balance |
| PATCH | `/api/wallet/:id` | Apply a delta (+/-) |

# API Endpoints

### 1. Create Wallet

**POST** `/api/wallet`

**Request Body**

```json
{
  "owner": "John Doe",
  "balance": 1000
}
```

---

### 2. Get Wallet

**GET** `/api/wallet/:id`

**Example**

```http
GET /api/wallet/2c4d8f95-8c91-4a7e-a64d-5a7d4fdfb2f7
```

---

### 3. Apply Balance Delta

**PATCH** `/api/wallet/:id`

Use a **positive** delta to credit the wallet and a **negative** delta to debit it.

**Request Body**

```json
{
  "delta": 50
}
```

**Example**

Credit ₹50

```json
{
  "delta": 50
}
```

Debit ₹100

```json
{
  "delta": -100
}
```

---

# How to Run

## Prerequisites

- Node.js **18+**
- PostgreSQL installed and running
- A database named **wallet_db**

---

## 1. Clone the Repository

```bash
git clone https://github.com/Abdul-Raheem324/wallet-concurrency-api.git

cd wallet-concurrency-api
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Configure Environment Variables

Create a `.env` file in the project root.

```env
DATABASE_URL="postgresql://<USERNAME>:<PASSWORD>@localhost:<PORT>/wallet_db?schema=public"

PORT=5000
```

**Example**

```env
DATABASE_URL="postgresql://postgres:admin123@localhost:5433/wallet_db?schema=public"

PORT=5000
```

Replace:

- `<USERNAME>` with your PostgreSQL username
- `<PASSWORD>` with your PostgreSQL password
- `<PORT>` with your PostgreSQL port (typically **5432** or **5433**)

---

## 4. Run Database Migrations

```bash
npx prisma migrate dev
```

This will create the required database tables.

---

## 5. Start the Server

Development mode

```bash
npm run dev
```

or

```bash
node src/server.js
```

The server will start on:

```text
http://localhost:5000
```
---

## Running the Tests

### Load Harness (concurrent workers)
```bash
# 50 workers
node src/scripts/loadTest.js 50

# 500 workers
node src/scripts/loadTest.js 500
```

### Correctness Test
```bash
node src/tests/correctness.test.js
```

---

## Test Results

### 50 Workers
- Succeeded: 50/50
- Failed: 0
- Duration: ~724ms
- Final balance: 500 ✅

### 500 Workers
- Succeeded: 497/500
- Failed: 3 (MAX_RETRIES_EXCEEDED, no data corruption)
- Duration: ~2099ms
- Final balance: 4970 ✅

### Correctness Test
- Initial: 1000
- Operations: +200, -150, +500, -300, +100
- Expected: 1350
- Actual: 1350 ✅