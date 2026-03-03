import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook for securely accessing payment proof documents using signed URLs.
 * Payment proofs are stored in a private bucket and must be accessed via signed URLs.
 */
export function usePaymentProofUrl() {
  const [loading, setLoading] = useState(false);

  /**
   * Extract the file path from a stored URL or path
   */
  const extractPath = (urlOrPath: string | null): string | null => {
    if (!urlOrPath) return null;
    if (!urlOrPath.startsWith('http')) return urlOrPath;
    const match = urlOrPath.match(/payment-proofs\/(.+)$/);
    return match ? match[1] : null;
  };

  /**
   * Generate a signed URL for a payment proof document
   * @param urlOrPath - The stored URL or file path
   * @param expiresIn - Expiration in seconds (default: 300 = 5 minutes)
   */
  const getSignedProofUrl = useCallback(async (
    urlOrPath: string | null,
    expiresIn: number = 300
  ): Promise<string | null> => {
    const path = extractPath(urlOrPath);
    if (!path) return null;

    const { data, error } = await supabase.storage
      .from('payment-proofs')
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.warn('Error getting payment proof signed URL:', error);
      return null;
    }

    return data?.signedUrl || null;
  }, []);

  /**
   * Generate signed URLs for multiple payment proofs
   */
  const getSignedProofUrls = useCallback(async (
    urlsOrPaths: (string | null)[],
    expiresIn: number = 300
  ): Promise<(string | null)[]> => {
    setLoading(true);
    try {
      const results = await Promise.all(
        urlsOrPaths.map(u => getSignedProofUrl(u, expiresIn))
      );
      return results;
    } finally {
      setLoading(false);
    }
  }, [getSignedProofUrl]);

  return { getSignedProofUrl, getSignedProofUrls, loading };
}
