# Supabase Account Setup Guide

Every time you add a new Supabase project to your `.env` file, you must run the following SQL script in that project's SQL Editor to create the necessary table for the keep-alive script to function.

## SQL Instructions

1. Go to your [Supabase Dashboard](https://app.supabase.com/).
2. Select your new project.
3. On the left sidebar, click on **SQL Editor**.
4. Click **New query**.
5. Paste the following SQL code and run it:

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

## Next Steps
Once the table is created successfully, make sure you restart your Vite development server (`npm run dev`) so that your newly added credentials in the `.env` file are picked up correctly!
