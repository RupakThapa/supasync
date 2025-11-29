#!/usr/bin/env node

/**
 * Cron script to ping all Supabase accounts
 * This can be run daily via cron job
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '..', '.env');
config({ path: envPath });

const TEST_TABLE_NAME = '_keepalive_ping';

// Create substantial test data for activity
const createTestData = () => ({
  ping_id: crypto.randomUUID(),
  timestamp: new Date().toISOString(),
  ping_type: 'keepalive',
  metadata: JSON.stringify({
    source: 'supabase-keepalive-cron',
    version: '1.0.0',
    randomData: Array.from({ length: 50 }, () => Math.random().toString(36).substring(2)),
    timestamp: Date.now(),
  }),
});

function getSupabaseAccounts() {
  const accounts = [];
  
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

async function pingAccount(account) {
  const client = createClient(account.url, account.key, {
    auth: { persistSession: false },
  });

  const testData = createTestData();
  let insertedId = null;

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

    return { success: true, account: account.name, message: 'All operations completed' };
  } catch (error) {
    // Cleanup on error
    if (insertedId) {
      try {
        await client.from(TEST_TABLE_NAME).delete().eq('id', insertedId);
      } catch {}
    }

    return { 
      success: false, 
      account: account.name, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

async function main() {
  const accounts = getSupabaseAccounts();
  
  if (accounts.length === 0) {
    console.error('❌ No Supabase accounts configured in .env file');
    process.exit(1);
  }

  console.log(`🚀 Starting keep-alive ping for ${accounts.length} account(s)...\n`);
  
  const results = [];
  let successCount = 0;
  let errorCount = 0;

  for (const account of accounts) {
    console.log(`⏳ Pinging ${account.name}...`);
    const result = await pingAccount(account);
    results.push(result);
    
    if (result.success) {
      successCount++;
      console.log(`✅ ${account.name}: ${result.message}`);
    } else {
      errorCount++;
      console.log(`❌ ${account.name}: ${result.message}`);
    }
  }

  console.log(`\n📊 Summary: ${successCount} succeeded, ${errorCount} failed out of ${accounts.length} total`);
  
  // Exit with error code if any failed
  if (errorCount > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});

