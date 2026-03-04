import { supabase } from '@/integrations/supabase/client';

const SIGNED_URL_CACHE = new Map<string, { url: string; expiresAt: number }>();
const SIGNED_URL_DURATION = 3600; // 1 hour
const CACHE_BUFFER = 300; // refresh 5 min before expiry

/**
 * Extract the storage path from a full Supabase public URL or return as-is if already a path.
 */
function extractStoragePath(urlOrPath: string, bucket: string): string | null {
  if (!urlOrPath) return null;
  
  // Already a relative path (no http)
  if (!urlOrPath.startsWith('http')) return urlOrPath;
  
  // Extract path from Supabase storage URL
  // Format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
  const publicPattern = `/storage/v1/object/public/${bucket}/`;
  const signedPattern = `/storage/v1/object/sign/${bucket}/`;
  
  let idx = urlOrPath.indexOf(publicPattern);
  if (idx !== -1) {
    return decodeURIComponent(urlOrPath.substring(idx + publicPattern.length).split('?')[0]);
  }
  
  idx = urlOrPath.indexOf(signedPattern);
  if (idx !== -1) {
    return decodeURIComponent(urlOrPath.substring(idx + signedPattern.length).split('?')[0]);
  }
  
  // External URL - return as-is
  return null;
}

/**
 * Get a signed URL for a private storage object.
 * Uses caching to avoid repeated API calls.
 */
export async function getSignedMediaUrl(urlOrPath: string, bucket = 'property-media'): Promise<string> {
  if (!urlOrPath) return '/placeholder.svg';
  
  const path = extractStoragePath(urlOrPath, bucket);
  
  // External URL or unrecognized format - return as-is
  if (path === null) return urlOrPath;
  
  // Check cache
  const cached = SIGNED_URL_CACHE.get(`${bucket}/${path}`);
  if (cached && cached.expiresAt > Date.now() / 1000 + CACHE_BUFFER) {
    return cached.url;
  }
  
  // Generate signed URL
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_DURATION);
  
  if (error || !data?.signedUrl) {
    console.error('Failed to get signed URL:', error);
    return '/placeholder.svg';
  }
  
  // Cache it
  SIGNED_URL_CACHE.set(`${bucket}/${path}`, {
    url: data.signedUrl,
    expiresAt: Date.now() / 1000 + SIGNED_URL_DURATION,
  });
  
  return data.signedUrl;
}

/**
 * Get signed URLs for multiple media items in batch.
 */
export async function getSignedMediaUrls(urlsOrPaths: string[], bucket = 'property-media'): Promise<string[]> {
  const results = await Promise.all(
    urlsOrPaths.map(u => getSignedMediaUrl(u, bucket))
  );
  return results;
}
