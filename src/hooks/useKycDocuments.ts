import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SignedUrls {
  idFrontUrl: string | null;
  idBackUrl: string | null;
  selfieUrl: string | null;
}

/**
 * Hook for securely accessing KYC documents using signed URLs
 * Signed URLs expire after a short period (1 hour by default) for security
 */
export function useKycDocuments() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Generate signed URLs for KYC documents
   * @param filePaths - Object containing file paths (not full URLs)
   * @param expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
   */
  const getSignedUrls = useCallback(async (
    filePaths: {
      id_front_url: string | null;
      id_back_url: string | null;
      selfie_url: string | null;
    },
    expiresIn: number = 3600
  ): Promise<SignedUrls> => {
    setLoading(true);
    setError(null);

    const result: SignedUrls = {
      idFrontUrl: null,
      idBackUrl: null,
      selfieUrl: null,
    };

    try {
      // Helper to extract file path from URL or use path directly
      const extractPath = (urlOrPath: string | null): string | null => {
        if (!urlOrPath) return null;
        
        // If it's already a path (not a full URL), return it
        if (!urlOrPath.startsWith('http')) {
          return urlOrPath;
        }
        
        // Extract path from full URL
        const match = urlOrPath.match(/kyc-documents\/(.+)$/);
        return match ? match[1] : null;
      };

      const frontPath = extractPath(filePaths.id_front_url);
      const backPath = extractPath(filePaths.id_back_url);
      const selfiePath = extractPath(filePaths.selfie_url);

      // Generate signed URLs in parallel
      const [frontResult, backResult, selfieResult] = await Promise.all([
        frontPath 
          ? supabase.storage.from('kyc-documents').createSignedUrl(frontPath, expiresIn)
          : Promise.resolve({ data: null, error: null }),
        backPath
          ? supabase.storage.from('kyc-documents').createSignedUrl(backPath, expiresIn)
          : Promise.resolve({ data: null, error: null }),
        selfiePath
          ? supabase.storage.from('kyc-documents').createSignedUrl(selfiePath, expiresIn)
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (frontResult.data?.signedUrl) {
        result.idFrontUrl = frontResult.data.signedUrl;
      }
      if (backResult.data?.signedUrl) {
        result.idBackUrl = backResult.data.signedUrl;
      }
      if (selfieResult.data?.signedUrl) {
        result.selfieUrl = selfieResult.data.signedUrl;
      }

      // Log errors but don't fail completely
      if (frontResult.error) console.warn('Error getting front ID signed URL:', frontResult.error);
      if (backResult.error) console.warn('Error getting back ID signed URL:', backResult.error);
      if (selfieResult.error) console.warn('Error getting selfie signed URL:', selfieResult.error);

    } catch (err) {
      console.error('Error generating signed URLs:', err);
      setError('فشل في الحصول على روابط المستندات');
    } finally {
      setLoading(false);
    }

    return result;
  }, []);

  return {
    getSignedUrls,
    loading,
    error,
  };
}
