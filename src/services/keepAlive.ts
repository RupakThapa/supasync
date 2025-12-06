import { createClient } from '@supabase/supabase-js';
import type { SupabaseAccount } from '../config/supabaseAccounts';

const TEST_TABLE_NAME = '_keepalive_ping';

// Create substantial test data for activity
const createTestData = () => ({
  ping_id: crypto.randomUUID(),
  timestamp: new Date().toISOString(),
  ping_type: 'keepalive',
  metadata: JSON.stringify({
    source: 'supabase-keepalive',
    version: '1.0.0',
    randomData: Array.from({ length: 50 }, () => Math.random().toString(36).substring(2)),
    timestamp: Date.now(),
  }),
});

export interface PingStatus {
  accountId: number;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
}

export async function pingAccount(account: SupabaseAccount): Promise<PingStatus> {
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

    return {
      accountId: account.id,
      status: 'success',
      message: '2 inserts, 1 delete completed - 1 record remains',
    };
  } catch (error) {
    // Cleanup on error
    if (insertedIds.length > 0) {
      try {
        await client.from(TEST_TABLE_NAME).delete().in('id', insertedIds);
      } catch {}
    }

    return {
      accountId: account.id,
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

