import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to get a signed URL for a private storage file
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket
 * @param expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
 */
export function useSignedUrl(
  bucket: string | null,
  path: string | null,
  expiresIn: number = 3600
) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bucket || !path) {
      setSignedUrl(null);
      return;
    }

    const getSignedUrl = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: signError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, expiresIn);

        if (signError) {
          setError(signError.message);
          setSignedUrl(null);
        } else {
          setSignedUrl(data.signedUrl);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get signed URL');
        setSignedUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    getSignedUrl();
  }, [bucket, path, expiresIn]);

  return { signedUrl, isLoading, error };
}

/**
 * Parse a storage URL to extract bucket and path
 * Example URL: https://cfywowsglaofecwopipw.supabase.co/storage/v1/object/public/avatars/user-id/photo.jpg
 * @param url - The full storage URL
 * @returns Object with bucket and path, or null values if not a valid storage URL
 */
export function parseStorageUrl(url: string | null): { bucket: string | null; path: string | null } {
  if (!url) return { bucket: null, path: null };

  // Match Supabase storage URL patterns
  const publicMatch = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  const signedMatch = url.match(/\/storage\/v1\/object\/sign\/([^/]+)\/(.+)\?/);
  
  if (publicMatch) {
    return { bucket: publicMatch[1], path: publicMatch[2] };
  }
  
  if (signedMatch) {
    return { bucket: signedMatch[1], path: signedMatch[2] };
  }

  // If it's just a path like "avatars/user-id/photo.jpg"
  const pathParts = url.split('/');
  if (pathParts.length >= 2 && ['avatars', 'certificates', 'documents'].includes(pathParts[0])) {
    return { bucket: pathParts[0], path: pathParts.slice(1).join('/') };
  }

  return { bucket: null, path: null };
}

/**
 * Hook that automatically parses a storage URL and returns a signed URL
 * @param storageUrl - The original storage URL (public or otherwise)
 * @param expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
 */
export function useAutoSignedUrl(storageUrl: string | null, expiresIn: number = 3600) {
  const { bucket, path } = parseStorageUrl(storageUrl);
  return useSignedUrl(bucket, path, expiresIn);
}

/**
 * Get a signed URL synchronously (for use in non-hook contexts)
 * Returns a promise that resolves to the signed URL
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      console.error('Failed to get signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('Failed to get signed URL:', err);
    return null;
  }
}

/**
 * Get a signed URL from a full storage URL
 */
export async function getSignedUrlFromStorageUrl(
  storageUrl: string | null,
  expiresIn: number = 3600
): Promise<string | null> {
  if (!storageUrl) return null;
  
  const { bucket, path } = parseStorageUrl(storageUrl);
  if (!bucket || !path) return storageUrl; // Return original if not parseable
  
  return getSignedUrl(bucket, path, expiresIn);
}
