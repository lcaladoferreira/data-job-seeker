# Worldwide Data Jobs Monitor

A production-ready web-based job monitoring system that finds remote Data Engineering / Data Analytics / Data Science jobs, strictly filtered to only accept jobs that are explicitly **WORLDWIDE remote**.

## Core Rule: WORLDWIDE ONLY
A job is accepted **ONLY** if the job text explicitly proves that candidates can apply from anywhere in the world. **"Remote" is not enough.**

### Accepted Evidence Examples:
- Remote Worldwide / Worldwide Remote
- Work from anywhere / Anywhere in the world
- Open to candidates worldwide / Applicants worldwide
- Global remote / Remote globally
- No location restrictions / Location: Worldwide

### Rejected Examples (False Positive Prevention):
- US only, US/Canada only, North America only
- Europe only, EU only, UK only, EMEA only
- APAC only, India only, Australia only
- LATAM only, Brazil only, Americas only
- Must be located in... / Must reside in...
- Authorized to work in... / Work authorization required
- Eligible locations: ...

## Tech Stack
- **Next.js 15+** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Prisma ORM**
- **PostgreSQL** (Compatible with Neon/Supabase)
- **Resend** (Email notifications)
- **Slack Incoming Webhooks** (Slack notifications)

## Features
- **Strict WORLDWIDE filter**: Custom regex-based engine to prevent false positives.
- **Modular Adapters**: Isolated adapters for RemoteOK, Remotive, WWR, Jobicy, Arbeitnow, and Hacker News.
- **Automated Ingestion**: Scheduled via Vercel Cron or manual trigger.
- **Dashboard**: Password-protected dashboard to manage accepted and rejected jobs.
- **Alert Logs**: Track Slack and Email notification status for every job.
- **Filter Tester**: Dedicated page to test job descriptions against the filter logic.

## Environment Variables
Create a `.env` file with:
\`\`\`bash
DATABASE_URL=           # PostgreSQL connection string
APP_PASSWORD=           # Dashboard access password
CRON_SECRET=            # Secret for Vercel Cron /api/cron/ingest
SLACK_WEBHOOK_URL=      # Slack Incoming Webhook URL
RESEND_API_KEY=         # Resend API Key
EMAIL_FROM=             # From email address
EMAIL_TO=               # To email address
\`\`\`

## Setup & Deployment

### Local Development
1. Install dependencies: \`npm install\`
2. Generate Prisma client: \`npx prisma generate\`
3. Run migrations: \`npx prisma db push\`
4. Start dev server: \`npm run dev\`

### Database Setup (Neon/Supabase)
1. Create a new PostgreSQL database.
2. Copy the connection string to \`DATABASE_URL\`.

### Vercel Deployment
1. Connect repository to Vercel.
2. Add all environment variables.
3. Vercel will automatically run \`npm run build\`.
4. Configure Vercel Cron by adding \`vercel.json\`:
\`\`\`json
{
  "crons": [{
    "path": "/api/cron/ingest",
    "schedule": "0 * * * *"
  }]
}
\`\`\`

## Known Limitations
- **Source Rate Limits**: Some adapters (like Hacker News) fetch a limited number of items to avoid rate limits.
- **Description Length**: Some sources provide truncated descriptions; the filter is only as good as the text provided.
- **Dynamic Content**: Sources that require Javascript execution (like LinkedIn) are not supported to maintain stability.

## How the filter avoids false positives
The filter follows a "Deny by Default" strategy:
1. It first scans for **any** restrictive patterns (e.g., "US only", "Authorized to work in"). If found, it's an immediate **REJECT**.
2. It then looks for explicit worldwide evidence. If none is found, it's a **REJECT**.
3. Only if worldwide evidence is present **AND** no restrictions are found is a job **ACCEPTED**.
