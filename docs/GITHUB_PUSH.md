# GitHub push checklist

1. Confirm secrets are **not** staged:
   ```bash
   git status
   # Must NOT list: .env, .env.host, .env.local, .env.production, .env.staging, release/
   ```

2. First push:
   ```bash
   git init
   git add .
   git status
   git commit -m "Initial commit: SparowVault finance platform"
   git branch -M main
   git remote add origin https://github.com/YOUR_USER/SparowVault.git
   git push -u origin main
   ```

3. Hosting credentials stay only on the server in `.env.host` (never in git).

4. Required examples that **are** tracked:
   - `.env.example`
   - `.env.host.example`
   - `.env.test.example`
