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

  const testData = createTestData();
  let insertedId: string | null = null;

  try {
    // INSERT
    const { data: insertData, error: insertError } = await client
      .from(TEST_TABLE_NAME)
      .insert(testData)
      .select('id')
      .single();

    if (insertError) throw new Error(`Insert: ${insertError.message}`);
    insertedId = insertData?.id;

    // READ
    const { error: readError } = await client
      .from(TEST_TABLE_NAME)
      .select('*')
      .eq('id', insertedId)
      .single();

    if (readError) throw new Error(`Read: ${readError.message}`);

    // UPDATE
    const { error: updateError } = await client
      .from(TEST_TABLE_NAME)
      .update({ metadata: JSON.stringify({ updated: true, timestamp: Date.now() }) })
      .eq('id', insertedId);

    if (updateError) throw new Error(`Update: ${updateError.message}`);

    // DELETE
    const { error: deleteError } = await client
      .from(TEST_TABLE_NAME)
      .delete()
      .eq('id', insertedId);

    if (deleteError) throw new Error(`Delete: ${deleteError.message}`);

    // Cleanup old entries
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await client.from(TEST_TABLE_NAME).delete().lt('timestamp', oneHourAgo);

    return {
      accountId: account.id,
      status: 'success',
      message: 'All operations completed',
    };
  } catch (error) {
    // Cleanup on error
    if (insertedId) {
      try {
        await client.from(TEST_TABLE_NAME).delete().eq('id', insertedId);
      } catch {}
    }

    return {
      accountId: account.id,
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

