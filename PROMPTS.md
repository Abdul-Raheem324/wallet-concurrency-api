# PROMPTS.md — AI Interaction Log

---

## 1. The Architecture Prompt

> I have a 24-hour SDE intern challenge. I need to build a REST API that handles 
> concurrent writes to a shared resource without data loss. I picked wallet balance 
> as my domain. My stack is Node.js, Express.js, and PostgreSQL with Prisma ORM. 
> I need: create wallet, update balance with a delta, read balance, a load harness 
> with 50+ concurrent workers, and a correctness test. What should I build and what 
> concurrency strategy should I use?

---

## 2. The Refinement Loop

### Flaw 1 — Read-then-write race condition

**AI's original suggestion:**
```js
const wallet = await prisma.wallet.findUnique({ where: { id } });
const newBalance = wallet.balance + delta;
await prisma.wallet.update({
  where: { id },
  data: { balance: newBalance }
});
```

**What was wrong:**

This is a classic read-modify-write race condition. If two workers both read 
balance=1000 at the same time, both compute 1000+10=1010, and both write 1010 — 
one update is completely lost. Under 50 concurrent workers this causes massive 
data corruption.

**My fix:**

Added a `version` field to the schema and used `updateMany` with a version check:
```js
const updated = await prisma.wallet.updateMany({
  where: { id, version: wallet.version },
  data: { balance: newBalance, version: wallet.version + 1 }
});
if (updated.count === 0) // retry — someone else updated first
```

This is optimistic locking. The update only succeeds if the version matches 
what we read. Zero rows updated means conflict — we retry.

---

### Flaw 2 — MAX_RETRIES too low

**AI's original suggestion:**
```js
const MAX_RETRIES = 5;
await new Promise((res) => setTimeout(res, Math.random() * 50));
```

**What was wrong:**

With 50 workers all retrying within a 50ms window, they keep colliding with 
each other. 5 retries is not enough — 8 out of 50 workers failed in testing.

**My fix:**
```js
const MAX_RETRIES = 15;
await new Promise((res) => setTimeout(res, Math.random() * 100 + 50));
```

Increasing retries to 15 and spreading backoff between 50–150ms (instead of 
0–50ms) gave all 50 workers enough room to eventually succeed. Result: 50/50 
succeeded.

---

## 3. The AI Blindspot Note

The AI consistently struggled with the gap between "logically correct" and 
"concurrency safe." Its first instinct on every update operation was a 
read-then-write pattern — which looks perfectly fine in single-threaded code 
but silently corrupts data under concurrency. It took explicit prompting about 
race conditions to get it to suggest version-based locking. Even then, it 
underestimated the retry parameters needed for high contention — it suggested 
MAX_RETRIES=5 which failed under load. The AI also did not spontaneously suggest 
testing at N=500; it needed to be pushed to think beyond the happy path. In 
general, the AI is good at structure and boilerplate but does not naturally 
think about failure modes, contention, or edge cases unless directly challenged.