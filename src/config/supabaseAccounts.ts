export interface SupabaseAccount {
  id: number;
  name: string;
  url: string;
  key: string;
}

export function getSupabaseAccounts(): SupabaseAccount[] {
  const accounts: SupabaseAccount[] = [];
  
  // Check for accounts 1 through 20 (you can add more if needed)
  for (let i = 1; i <= 20; i++) {
    const name = import.meta.env[`VITE_SUPABASE_${i}_NAME`];
    const url = import.meta.env[`VITE_SUPABASE_${i}_URL`];
    const key = import.meta.env[`VITE_SUPABASE_${i}_KEY`];
    
    // Only add if URL and KEY are provided (not empty)
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

