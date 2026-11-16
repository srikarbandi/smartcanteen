# LLM Instructions for Soha (paste this whole file into your coding LLM)

You are helping **Soha Rafiq (PES1UG24AM278)** contribute her part of a two-person
university database project to a shared GitHub repository, using **her own GitHub
account**. Follow these rules strictly.

## Project context
- **Project:** SmartCanteen — Campus Meal Pre-Ordering and Pickup Management System (DBMS Level 3, PES University).
- **Team:** Sreekar Bandi (PES1UG24AM282) and Soha Rafiq (PES1UG24AM278). One shared codebase, one GitHub repo.
- **Stack:** Next.js 14 (App Router, TypeScript), Tailwind CSS, MySQL 8+ (`mysql2`), MongoDB (official driver), bcrypt, zod.
- **Architecture:** MySQL is the authoritative transactional database (orders, inventory, slots, money). MongoDB stores `order_activity_logs` and `feedback` and computes feedback analytics via an aggregation pipeline. Next.js Route Handlers (`src/app/api/*`) are the backend; credentials come only from `.env.local`.

## Soha's responsibilities (what she owns)
- MongoDB implementation: `db/mongo-init.mjs`, `src/lib/mongo.ts`.
- Authentication & authorization: `src/lib/auth.ts`, `src/app/api/auth/*`, `src/lib/validation.ts`, `src/lib/http.ts`.
- Feedback + activity logging: `src/app/api/feedback/route.ts` (and logging inside order flows).
- Vendor dashboard & management: `src/app/vendor/*`, `src/app/api/vendor/*`, `src/components/NavBar.tsx`.
(Full list with descriptions: `SOHA_CONTRIBUTION_MANIFEST.md`.)

## Files she received
A folder `files/` containing those source files at their real repo paths — e.g.
`files/src/lib/mongo.ts` corresponds to `src/lib/mongo.ts` in the repository.

## Existing project structure (for reference)
```
db/            schema.sql, seed.sql, reset.sql, queries.sql, mongo-init.mjs
scripts/       db-setup.mjs, db-reset.mjs, test-db.mjs, test-api.mjs
src/lib/       mysql.ts, mongo.ts, auth.ts, validation.ts, http.ts, orders.ts, data.ts, client.ts, format.ts
src/app/api/   auth/*, canteens, menu, slots, orders/*, feedback, student/*, vendor/*
src/app/       page.tsx, login, register, student/*, vendor/*
src/components/ ui.tsx, NavBar.tsx
docs/          documentation + screenshots
```

## Her dependencies on Sreekar's modules (DO NOT overwrite these)
`src/lib/mysql.ts`, `src/lib/data.ts`, `src/lib/orders.ts`, `src/components/ui.tsx`,
`src/lib/client.ts`, `src/lib/format.ts`, everything in `src/app/student/*`, and all of
`db/*.sql`. Her files import these; they must stay as they are in the repo.

## Your tasks (do them in order)
1. **Inspect the repo first.** Run `git status`, `git log --oneline -n 10`, `git remote -v`, and `git branch`. Understand the current state before changing anything.
2. **Verify received files.** Compare each file under `files/` with the same path in the repo:
   `for f in $(cd files && find . -type f); do diff -q "files/$f" "$f" || echo "DIFFERS: $f"; done`
   If the repo already contains them identically, there is nothing to re-add — her work is integrated; proceed to verify authorship/commits.
3. **If files are missing or differ** and the repo should take her version, copy only her files in:
   `rsync -a files/ ./` (this preserves paths and does not touch unrelated files). Never copy `.env*`, `node_modules`, or `.next`.
4. **Do not recreate the project, reset it, or modify unrelated Sreekar-owned files.**
5. **Run tests** to confirm nothing is broken: ensure MySQL + MongoDB are running, then
   `npm install`, `npm run db:setup`, `npm run mongo:setup`, `npm run dev` (in one terminal), `npm run test:api` (in another). Also `npm run test:db`.
6. **Configure Git with Soha's OWN identity** (do not impersonate anyone):
   `git config user.name "Soha Rafiq"` and `git config user.email "<Soha's GitHub email>"`.
7. **Create a feature branch:** `git checkout -b soha-contributions`.
8. **Stage ONLY her assigned files** (from the manifest), e.g.:
   `git add db/mongo-init.mjs src/lib/mongo.ts src/lib/auth.ts src/lib/validation.ts src/lib/http.ts src/app/api/auth src/app/api/feedback src/app/api/vendor src/app/vendor src/components/NavBar.tsx`
9. **Commit as herself:**
   `git commit -m "Add MongoDB layer, auth/authorization and vendor dashboard (Soha Rafiq)"`
10. **Push and open a PR:** `git push -u origin soha-contributions`, then open a pull request into the main branch on GitHub.
11. **Verify on GitHub** that the commits appear under Soha's account and the PR shows her files.

## Hard rules
- Use Soha's own authenticated GitHub account. **Never change the Git author identity to impersonate another person.**
- Do not fabricate commits or contribution history.
- Do not overwrite the entire repository or unrelated Sreekar-owned files.
- Inspect the existing repository before making changes.
- Preserve the shared application's functionality; run the tests before pushing.
- Never commit `.env.local`, passwords, or tokens.
