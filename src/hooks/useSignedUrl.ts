import { useState, useEffect } from 'react';
import { getSignedMediaUrl, getSignedMediaUrls } from '@/utils/signedMediaUrl';

/**
 * Hook to get a signed URL for a single media file from private storage.
 */
export function useSignedUrl(urlOrPath: string | null | undefined, bucket = 'property-media') {
  const [signedUrl, setSignedUrl] = useState<string>('/placeholder.svg');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!urlOrPath) {
      setSignedUrl('/placeholder.svg');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getSignedMediaUrl(urlOrPath, bucket).then(url => {
      if (!cancelled) {
        setSignedUrl(url);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [urlOrPath, bucket]);

  return { signedUrl, loading };
}

/**
 * Hook to get signed URLs for multiple media files from private storage.
 */
export function useSignedUrls(urlsOrPaths: string[] | null | undefined, bucket = 'property-media') {
  const [signedUrls, setSignedUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!urlsOrPaths || urlsOrPaths.length === 0) {
      setSignedUrls([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getSignedMediaUrls(urlsOrPaths, bucket).then(urls => {
      if (!cancelled) {
        setSignedUrls(urls);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [urlsOrPaths?.join(','), bucket]);

  return { signedUrls, loading };
}
