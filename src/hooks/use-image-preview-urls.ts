// src/hooks/use-image-preview-urls.ts
"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ProductImageItem } from "@/types/catalog";

/**
 * Produces a stable, parallel array of preview URLs for a list of
 * ProductImageItem:
 *   - existing (backend) images  → resolve to `item.url` directly
 *   - new uploads (`item.file`)  → resolve to a cached object URL
 *
 * Object URLs are created once per File instance — not once per
 * render — and revoked automatically the moment that File is no
 * longer present in `images`, or on unmount. Backend URLs are never
 * passed to `URL.revokeObjectURL`.
 *
 * Used identically by ProductImageUpload and ProductPreview so there
 * is exactly one place preview logic lives.
 */
export function useImagePreviewUrls(images: ProductImageItem[]): string[] {
  const cacheRef = useRef<Map<File, string>>(new Map());

  const urls = useMemo(() => {
    const cache = cacheRef.current;
    const filesInUse = new Set<File>();

    const next = images.map((item) => {
      if (item.file) {
        filesInUse.add(item.file);

        const cached = cache.get(item.file);
        if (cached) return cached;

        const objectUrl = URL.createObjectURL(item.file);
        cache.set(item.file, objectUrl);
        return objectUrl;
      }

      return item.url;
    });

    cache.forEach((url, file) => {
      if (!filesInUse.has(file)) {
        URL.revokeObjectURL(url);
        cache.delete(file);
      }
    });

    return next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  useEffect(() => {
    const cache = cacheRef.current;
    return () => {
      cache.forEach((url) => URL.revokeObjectURL(url));
      cache.clear();
    };
  }, []);

  return urls;
}