# Soha — Start Here

Hi Soha! This package contains the files you own in the **SmartCanteen** project so you
can commit and push them to our shared GitHub repo **under your own GitHub account**.

## What's in this package
- `files/` — your actual source files, at their real project paths (e.g. `files/src/lib/mongo.ts` → `src/lib/mongo.ts` in the repo).
- `SOHA_CONTRIBUTION_MANIFEST.md` — every file, what it does, and its dependencies.
- `SOHA_LLM_PUSH_INSTRUCTIONS.md` — a self-contained prompt you can paste into your own LLM (ChatGPT/Claude) to help you inspect, integrate and push.
- `INTEGRATION_GUIDE.md` — which files already exist vs. which you review/add, env vars, and how to avoid conflicts.

## What to do (short version)
1. Clone our shared repo (Sreekar will send the URL) and open it in your editor.
2. Copy `.env.example` to `.env.local` and fill it in (see the integration guide). Make sure MySQL + MongoDB are running, then `npm install`, `npm run db:setup`, `npm run mongo:setup`, `npm run dev`.
3. Confirm the files in `files/` match the repo (they should already be integrated). If you're pushing to a fresh repo, these are the files attributed to you.
4. Create a branch `soha-contributions`, stage **only your files** (listed in the manifest), commit with your own Git identity, and open a PR / push.
5. Verify your commits show up on GitHub under your account.

Full, copy-paste steps are in `SOHA_LLM_PUSH_INSTRUCTIONS.md`.

## Important
- Use **your own** GitHub account — do not use Sreekar's identity.
- Do **not** recreate the project or overwrite Sreekar's files (schema, transactions, student pages, `data.ts`, `mysql.ts`).
- Never commit `.env.local` or any password.
