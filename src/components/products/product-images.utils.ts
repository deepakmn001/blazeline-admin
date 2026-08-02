// src/components/products/product-images.utils.ts
import type { ProductImage, ProductImageItem } from "@/types/catalog";

/**
 * Converts backend `ProductImage[]` into unified working state.
 * Pure data mapping — never creates a File or an object URL.
 */
export function hydrateProductImages(
  images: ProductImage[] | undefined
): ProductImageItem[] {
  if (!images || images.length === 0) return [];

  return [...images]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((image) => ({
      id: image.id,
      url: image.image_url ?? image.image,
      featured: image.featured,
      sort_order: image.sort_order,
      existing: true,
    }));
}

export function createImageItemsFromFiles(
  files: File[],
  startIndex: number
): ProductImageItem[] {
  return files.map((file, offset) => ({
    file,
    url: "",
    featured: false,
    sort_order: startIndex + offset,
    existing: false,
  }));
}

/**
 * Re-derives `sort_order` from array position and enforces the
 * cover-image invariant: index 0 is always the only featured image.
 * Called after every mutation (add / remove / reorder) so state can
 * never drift out of sync.
 */
export function reindexImages(images: ProductImageItem[]): ProductImageItem[] {
  return images.map((image, index) => ({
    ...image,
    sort_order: index,
    featured: index === 0,
  }));
}

export function appendFiles(
  images: ProductImageItem[],
  files: File[]
): ProductImageItem[] {
  return reindexImages([
    ...images,
    ...createImageItemsFromFiles(files, images.length),
  ]);
}

export function removeImageAt(
  images: ProductImageItem[],
  index: number
): ProductImageItem[] {
  return reindexImages(images.filter((_, i) => i !== index));
}

export function reorderImages(
  images: ProductImageItem[],
  fromIndex: number,
  toIndex: number
): ProductImageItem[] {
  if (fromIndex === toIndex) return images;

  const next = [...images];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);

  return reindexImages(next);
}
export function getImageKey(image: ProductImageItem): string {
  if (image.existing && image.id != null) {
    return `existing-${image.id}`;
  }

  if (image.file) {
    return `upload-${image.file.name}-${image.file.lastModified}-${image.file.size}`;
  }

  return `image-${image.sort_order}`;
}

export type ImageDiff = {
  toDelete: number[];
  toUpload: { file: File; featured: boolean; sort_order: number }[];
  toUpdate: { id: number; featured: boolean; sort_order: number }[];
};

/**
 * Diffs the working image state against the snapshot taken at load
 * time (empty snapshot in create mode) to produce the minimal set of
 * backend calls needed at publish time:
 *   - existing images removed from state    → delete
 *   - existing images with changed order/featured → patch
 *   - new File items                         → upload
 *
 * This IS the delete queue — there's no separate array to keep in
 * sync, which is what caused the original bugs.
 */
export function diffImages(
  original: ProductImageItem[],
  current: ProductImageItem[]
): ImageDiff {
  const currentExistingIds = new Set(
    current
      .filter((item) => item.existing && item.id != null)
      .map((item) => item.id as number)
  );

  const toDelete = original
    .filter(
      (item) =>
        item.existing && item.id != null && !currentExistingIds.has(item.id)
    )
    .map((item) => item.id as number);

  const toUpload = current
    .filter(
      (item): item is ProductImageItem & { file: File } =>
        !item.existing && Boolean(item.file)
    )
    .map((item) => ({
      file: item.file,
      featured: item.featured,
      sort_order: item.sort_order,
    }));

  const toUpdate = current
    .filter(
      (item): item is ProductImageItem & { id: number } =>
        item.existing && item.id != null
    )
    .filter((item) => {
      const originalItem = original.find((o) => o.id === item.id);
      return (
        !originalItem ||
        originalItem.featured !== item.featured ||
        originalItem.sort_order !== item.sort_order
      );
    })
    .map((item) => ({
      id: item.id,
      featured: item.featured,
      sort_order: item.sort_order,
    }));

  return { toDelete, toUpload, toUpdate };
}