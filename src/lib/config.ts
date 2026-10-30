export function validSupabaseConfig(url: string, key: string): boolean {
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url) || /YOUR_PROJECT/i.test(url)) return false;
  if (key.startsWith('sb_publishable_') && key.length > 20) return true;
  if (!key.startsWith('eyJ')) return false;
  try {
    const payload = key.split('.')[1];
    if (!payload) return false;
    return (
      (JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { role?: string })
        .role === 'anon'
    );
  } catch {
    return false;
  }
}
