# Security Policy

## Reporting a vulnerability

Please do not disclose security vulnerabilities in public issues or discussions.

Use GitHub's **Report a vulnerability** option in the repository's Security tab to send a private report. Include the affected component, impact, reproduction steps, and any relevant logs with secrets and personal data removed.

## Credential handling

- Never commit Supabase service-role or secret keys, bot tokens, SMTP credentials, or private API keys.
- Treat any credential ever committed to Git history as compromised. Revoke or rotate it at its provider; deleting the file is not sufficient.
- Keep administrative operations server-side and protect them with Supabase Auth, server-side authorization, and least-privilege database grants.

## Response

Reports will be reviewed privately. Please allow time for investigation and a coordinated fix before public disclosure.
