export async function isSupabaseReachable(): Promise<boolean> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url) return false;
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 3000);
    await fetch(`${url}/rest/v1/`, { signal: controller.signal });
    return true;
  } catch {
    return false;
  }
}
