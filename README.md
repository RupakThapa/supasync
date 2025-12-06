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

## Daily Cron Job Setup ⏰

### Option 1: Local Cron (Recommended for Mac/Linux)

This is the simplest way to run daily pings automatically.

1. **Test the cron script first:**
   ```bash
   npm run cron
   ```

2. **Set up a daily cron job (automatic):**
   ```bash
   # Run at 8:00 AM daily (default)
   ./scripts/setup-cron.sh
   
   # Or specify a custom time (e.g., 9:30 AM)
   ./scripts/setup-cron.sh "30 9"
   ```

3. **Or set up manually:**
   ```bash
   crontab -e
   ```
   
   Add this line (runs daily at 8:00 AM):
   ```bash
   0 8 * * * cd /Users/rupakthapa/SamIT/supasync && npm run cron >> /tmp/supabase-keepalive.log 2>&1
   ```
   
   **Time examples:**
   - `0 0 * * *` - Midnight (12:00 AM) every day
   - `0 12 * * *` - Noon (12:00 PM) every day
   - `0 */6 * * *` - Every 6 hours
   - `0 8 * * 1-5` - 8 AM on weekdays only

4. **Verify your cron job:**
   ```bash
   crontab -l
   ```

5. **Check logs:**
   ```bash
   tail -f /tmp/supabase-keepalive.log
   ```

### Option 2: Vercel Cron (Recommended for Vercel Deployments) ⭐

**Automatic daily cron job built-in!**

1. **Deploy to Vercel:**
   ```bash
   # Install Vercel CLI if needed
   npm i -g vercel
   
   # Deploy
   vercel
   ```

2. **Add Environment Variables in Vercel Dashboard:**
   - Go to your project settings → Environment Variables
   - Add all your Supabase credentials:
     ```
     VITE_SUPABASE_1_NAME=breifly unko
     VITE_SUPABASE_1_URL=https://xxx.supabase.co
     VITE_SUPABASE_1_KEY=your-key
     VITE_SUPABASE_2_NAME=...
     VITE_SUPABASE_2_URL=...
     VITE_SUPABASE_2_KEY=...
     # ... add all 5 accounts
     ```
   - (Optional) Add `CRON_SECRET` for extra security

3. **Redeploy after adding environment variables:**
   ```bash
   vercel --prod
   ```

4. **Verify Cron Job:**
   - Go to Vercel Dashboard → Your Project → Settings → Cron Jobs
   - You should see a cron job scheduled for `0 8 * * *` (8 AM daily)
   - You can manually trigger it from the dashboard to test

5. **Test the API endpoint manually:**
   ```bash
   # Test locally (if you have Vercel CLI)
   vercel dev
   # Then visit: http://localhost:3000/api/cron
   
   # Or test on production
   curl https://your-app.vercel.app/api/cron
   ```

6. **Check Logs:**
   - Go to Vercel Dashboard → Your Project → Functions → `/api/cron`
   - View execution logs to see if it's running successfully
   - Check the "Cron Jobs" tab to see execution history

**The cron job will automatically run daily at 8:00 AM UTC!**

**Note:** Vercel Cron requires your project to be deployed. Free tier includes cron jobs, but with some limitations. For production use, consider upgrading to Pro plan.

### Option 3: n8n Webhook (Recommended for n8n Users) 🔗

**Use the dedicated API endpoint for automation tools like n8n!**

1. **Deploy to Vercel** (see Option 2 above)

2. **Add Environment Variables in Vercel:**
   - Add all your `VITE_SUPABASE_*` credentials (see Option 2)
   - (Optional) Add `API_SECRET_KEY` for authentication:
     ```
     API_SECRET_KEY=your-secret-key-here
     ```

3. **Set up n8n Workflow:**
   - **Quick Start:** Import the example workflow from `n8n-workflow-example.json`
   - Or create manually:
     - Add an **HTTP Request** node
     - Method: `GET` or `POST`
     - URL: `https://your-app.vercel.app/api/sync`
     - If you set `API_SECRET_KEY`, add Authentication:
       - Type: `Header Auth`
       - Name: `Authorization`
       - Value: `Bearer your-secret-key-here`

4. **Test the endpoint:**
   ```bash
   # Without authentication
   curl https://your-app.vercel.app/api/sync
   
   # With authentication
   curl -H "Authorization: Bearer your-secret-key-here" \
        https://your-app.vercel.app/api/sync
   ```

5. **Response format:**
   ```json
   {
     "success": true,
     "message": "Sync executed",
     "timestamp": "2025-12-06T19:00:00.000Z",
     "summary": {
       "total": 5,
       "succeeded": 5,
       "failed": 0
     },
     "results": [
       {
         "success": true,
         "accountId": 1,
         "accountName": "My Project",
         "message": "2 inserts, 1 delete completed - 1 record remains"
       }
     ]
   }
   ```

**Benefits:**
- ✅ Dedicated endpoint for external automation
- ✅ CORS enabled for web requests
- ✅ Optional API key authentication
- ✅ Detailed response with per-account results
- ✅ Works with n8n, Zapier, Make.com, or any HTTP client

### Option 4: External Cron Service

1. Deploy to Vercel/Netlify/Railway
2. Set up a cron service (cron-job.org, EasyCron, etc.) to visit:
   ```
   https://your-app.vercel.app/?run=true
   ```
   The app will automatically run when `?run=true` is in the URL.

### Option 5: GitHub Actions

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
      - run: npm run cron
        env:
          VITE_SUPABASE_1_NAME: ${{ secrets.SUPABASE_1_NAME }}
          VITE_SUPABASE_1_URL: ${{ secrets.SUPABASE_1_URL }}
          VITE_SUPABASE_1_KEY: ${{ secrets.SUPABASE_1_KEY }}
          # Add more secrets for accounts 2-5, etc.
```

**Note:** Make sure to add all your Supabase credentials as GitHub Secrets.

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
