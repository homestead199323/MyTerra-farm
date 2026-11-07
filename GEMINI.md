# MyTerra — rules for Gemini CLI

MyTerra is a React 19 + Vite PWA for beginner growers (live at https://www.myterra.farm).
The owner is not a developer: explain in plain words, make the changes yourself.
Other AI agents (Claude, Codex) work on this same repo. Follow these rules.

## Git — the important part
- NEVER commit or push to `main`. Every push to `main` deploys to production automatically (Vercel).
- Before starting: `git checkout main && git pull`, then `git checkout -b gemini/<short-task-name>`.
- Commit and push only to your `gemini/...` branch: `git push -u origin gemini/<short-task-name>`.
- Stage files by name. NEVER `git add .` or `git add -A` — this folder contains untracked files that must not be committed.
- One feature per branch. Never force-push. Never rewrite history.
- When done, tell the owner the branch name. Merging into `main` is done after review, not by you.

## Secrets
- Never print, commit or paste `.env` contents, API keys or tokens.
- Never put a token in a git remote URL.

## Build and check
- Prefix every npm install: `NODE_ENV=development npm install` (the environment injects NODE_ENV=production, which drops devDependencies).
- Before committing: `npm run lint`, `npm test`, `NODE_ENV=development npm run build`. All must pass.
- Never say something works unless you ran it and saw it work. If you could not check, say so.

## Where things are
- Status of the work: `ARCHITECTURE_PLAN.md`, `DESIGN_PLAN.md`, `LAUNCH_PLAN.md` (read first).
- Screens: `src/features/`. Navigation/state: `src/app/`. Data: `src/data/`. Logic: `src/lib/`.
- Persistence only through `src/lib/storage.js`; cloud sync in `src/lib/sync.js` (Supabase).
- Content defaults to Western Europe climate. Yield numbers are deliberately conservative — do not "correct" them.
- Canning safety: pH must be below 4.6.
