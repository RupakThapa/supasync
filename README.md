# Supabase Keep-Alive ⚡

A simple React app to keep your Supabase free-tier projects active by performing periodic database operations.

## Quick Start

### 1. Add Your Supabase Credentials

Edit the `.env` file with your Supabase project details:

```env
# Account 1
VITE_SUPABASE_1_NAME=My First Project
VITE_SUPABASE_1_URL=https://xxxxx.supabase.co
VITE_SUPABASE_1_KEY=your-anon-key-here

# Account 2
VITE_SUPABASE_2_NAME=My Second Project
VITE_SUPABASE_2_URL=https://yyyyy.supabase.co
VITE_SUPABASE_2_KEY=another-anon-key

# Add more accounts (3, 4, 5, etc.)
```

### 2. Create the Table in Each Supabase Project

Run this SQL in each project's SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS _keepalive_ping (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ping_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  ping_type TEXT DEFAULT 'keepalive',
  metadata JSONB
);

ALTER TABLE _keepalive_ping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all" ON _keepalive_ping 
  FOR ALL TO anon USING (true) WITH CHECK (true);
```

### 3. Run the App

```bash
npm install
npm run dev
```

Open http://localhost:5173 and click **"Ping All Accounts"**

## Daily Cron Job Setup

### Option 1: Deploy & Use URL Parameter

1. Deploy to Vercel/Netlify
2. Set up a cron job (cron-job.org, Railway, etc.) to hit:
   ```
   https://your-app.vercel.app/?run=true
   ```
   The app will automatically run when `?run=true` is in the URL.

### Option 2: Local Cron (Mac/Linux)

Add to crontab (`crontab -e`):

```bash
# Run daily at 8 AM
0 8 * * * cd /path/to/syncproj && npm run build && npx serve -s dist &
```

### Option 3: GitHub Actions

Create `.github/workflows/keepalive.yml`:

```yaml
name: Keep Supabase Alive
on:
  schedule:
    - cron: '0 8 * * *'  # Daily at 8 AM UTC
  workflow_dispatch:

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npm run ping
        env:
          VITE_SUPABASE_1_URL: ${{ secrets.SUPABASE_1_URL }}
          VITE_SUPABASE_1_KEY: ${{ secrets.SUPABASE_1_KEY }}
          # Add more secrets as needed
```

## How It Works

Each ping performs a full CRUD cycle:
1. **INSERT** - Creates a test record
2. **READ** - Reads the record back
3. **UPDATE** - Modifies the record
4. **DELETE** - Removes the record

This ensures real database activity to prevent Supabase from pausing your project.

## Tech Stack

- React 18 + TypeScript + Vite
- Supabase JS Client

## License

MIT
