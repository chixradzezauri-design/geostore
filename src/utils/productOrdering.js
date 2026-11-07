export const resolveProductCreatedAt = ({ isEditing, savedRow, existingProduct, now = () => new Date().toISOString() }) => {
  if (isEditing) {
    // Legacy rows may legitimately have no creation timestamp. Preserve that
    // absence instead of making an edit look like a newly created product.
    return savedRow?.created_at ?? existingProduct?.createdAt ?? existingProduct?.created_at ?? null;
  }

  return savedRow?.created_at ?? now();
};
