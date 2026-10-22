# Enjoy Life — Inline contact form (Formspree)

The home page `/#contact` embeds an AJAX contact form in the dark-green contact section. Header and footer both link to that anchor; legacy `/contact` redirects to `/#contact`.

## Current configuration

- Form endpoint: `https://formspree.io/f/meaeydne` (form ID is **public by design** and is not a password or API key).
- The form sends `name`, `email`, `topic`, and `message`; `_gotcha` is a hidden spam-trap field.
- It posts the browser's FormData directly to Formspree with `Accept: application/json`, avoiding a local mail server or storage of visitor messages in PostgreSQL.
- The button stays disabled while sending; success and failure states are shown in Vietnamese without leaving the homepage. Validation checks name, email and message lengths. Rate-limit errors remain visible to customers.
- No extra npm dependencies or Docker environment variables are required.

## Important Formspree account steps

1. Open the form named **EnjoyLife Contact** in your Formspree dashboard.
2. Confirm its **Target Email** or Workflow Email destination is the verified private email address you selected in Formspree. Formspree controls mail delivery, not the website code.
3. Submit **one manual test message** from the running website in Microsoft Edge; verify it appears in the Formspree Submissions page and the email inbox (also check Spam/Junk).
4. Enable Formspree spam protection and, on production, configure its domain restrictions for the real published domain.
5. Never put Formspree management API tokens in frontend code. Do not run load tests against the live form endpoint.

## Test scope

The repository CI verifies the Formspree action URL, input names, rendered homepage form, removal of the old contact button and redirect from `/contact`. CI does **not** send any message to the live Formspree service, so a green CI run is not proof of external email delivery.

Run locally:

```powershell
git switch main
git pull origin main
docker compose up -d --build --force-recreate web
```

Visit `http://localhost:3000/#contact`. No backend migration or Docker data reset is necessary.
