import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const TEST_TABLE_NAME = '_keepalive_ping';

interface SupabaseAccount {
  id: number;
  name: string;
  url: string;
  key: string;
}

// Create substantial test data for activity
const createTestData = () => ({
  ping_id: crypto.randomUUID(),
  timestamp: new Date().toISOString(),
  ping_type: 'keepalive',
  metadata: JSON.stringify({
    source: 'supabase-keepalive-vercel',
    version: '1.0.0',
    randomData: Array.from({ length: 50 }, () => Math.random().toString(36).substring(2)),
    timestamp: Date.now(),
  }),
});

function getSupabaseAccounts(): SupabaseAccount[] {
  const accounts: SupabaseAccount[] = [];
  
  for (let i = 1; i <= 20; i++) {
    const name = process.env[`VITE_SUPABASE_${i}_NAME`];
    const url = process.env[`VITE_SUPABASE_${i}_URL`];
    const key = process.env[`VITE_SUPABASE_${i}_KEY`];
    
    if (url && key && url.trim() && key.trim()) {
      accounts.push({
        id: i,
        name: name || `Account ${i}`,
        url: url.trim(),
        key: key.trim(),
      });
    }
  }
  
  return accounts;
}

async function pingAccount(account: SupabaseAccount) {
  const client = createClient(account.url, account.key, {
    auth: { persistSession: false },
  });

  const testData1 = createTestData();
  const testData2 = createTestData();
  let insertedIds: string[] = [];

  try {
    // INSERT 2 records
    const { data: insertData, error: insertError } = await client
      .from(TEST_TABLE_NAME)
      .insert([testData1, testData2])
      .select('id');

    if (insertError) throw new Error(`Insert: ${insertError.message}`);
    if (!insertData || insertData.length !== 2) {
      throw new Error(`Insert: Expected 2 records, got ${insertData?.length || 0}`);
    }
    insertedIds = insertData.map(record => record.id);

    // READ both records
    const { data: readData, error: readError } = await client
      .from(TEST_TABLE_NAME)
      .select('*')
      .in('id', insertedIds);

    if (readError) throw new Error(`Read: ${readError.message}`);
    if (!readData || readData.length !== 2) {
      throw new Error(`Read: Expected 2 records, got ${readData?.length || 0}`);
    }

    // UPDATE both records
    const { error: updateError } = await client
      .from(TEST_TABLE_NAME)
      .update({ metadata: JSON.stringify({ updated: true, timestamp: Date.now() }) })
      .in('id', insertedIds);

    if (updateError) throw new Error(`Update: ${updateError.message}`);

    // DELETE 1 record (the first one, keeping the second one visible)
    const { error: deleteError } = await client
      .from(TEST_TABLE_NAME)
      .delete()
      .eq('id', insertedIds[0]);

    if (deleteError) throw new Error(`Delete: ${deleteError.message}`);

    // Cleanup old entries (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await client.from(TEST_TABLE_NAME).delete().lt('timestamp', oneHourAgo);

    return { success: true, account: account.name, message: '2 inserts, 1 delete completed - 1 record remains' };
  } catch (error) {
    // Cleanup on error
    if (insertedIds.length > 0) {
      try {
        await client.from(TEST_TABLE_NAME).delete().in('id', insertedIds);
      } catch {}
    }

    return { 
      success: false, 
      account: account.name, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  // Verify it's a cron job request (Vercel sends Authorization header automatically)
  // You can set CRON_SECRET in Vercel environment variables for extra security
  const authHeader = request.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return response.status(401).json({ error: 'Unauthorized' });
  }

  const accounts = getSupabaseAccounts();
  
  if (accounts.length === 0) {
    return response.status(500).json({ 
      error: 'No Supabase accounts configured',
      message: 'Please add VITE_SUPABASE_* environment variables in Vercel'
    });
  }

  const results = [];
  let successCount = 0;
  let errorCount = 0;

  for (const account of accounts) {
    const result = await pingAccount(account);
    results.push(result);
    
    if (result.success) {
      successCount++;
    } else {
      errorCount++;
    }
  }

  return response.status(200).json({
    success: true,
    timestamp: new Date().toISOString(),
    summary: {
      total: accounts.length,
      succeeded: successCount,
      failed: errorCount,
    },
    results,
  });
}

