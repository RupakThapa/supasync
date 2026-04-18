export interface SupabaseAccount {
  id: number;
  name: string;
  url: string;
  key: string;
}

export function getSupabaseAccounts(): SupabaseAccount[] {
  const accountsMap = new Map<number, Partial<SupabaseAccount>>();

  // Safely iterate over all environment variables.
  // This allows infinite scalability for any number of accounts.
  Object.keys(import.meta.env).forEach((key) => {
    const match = key.match(/^VITE_SUPABASE_(\d+)_(NAME|URL|KEY)$/);
    if (match) {
      const id = parseInt(match[1], 10);
      const field = match[2].toLowerCase() as 'name' | 'url' | 'key';
      
      if (!accountsMap.has(id)) {
        accountsMap.set(id, { id });
      }
      
      accountsMap.get(id)![field] = import.meta.env[key];
    }
  });

  const accounts: SupabaseAccount[] = [];
  
  for (const [id, account] of accountsMap.entries()) {
    if (account.url && account.key && account.url.trim() && account.key.trim()) {
      accounts.push({
        id,
        name: account.name || `Account ${id}`,
        url: account.url.trim(),
        key: account.key.trim(),
      });
    }
  }
  
  // Return sorted by ID to maintain logical order
  return accounts.sort((a, b) => a.id - b.id);
}

