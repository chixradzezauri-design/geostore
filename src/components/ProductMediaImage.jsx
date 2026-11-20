import React, { useState } from 'react';

/**
 * A small, non-destructive image fallback for saved cart/wishlist records.
 * React state is scoped to the failed URL: a replacement source can load
 * without clearing the product, quantity, or user-saved selections.
 */
export default function ProductMediaImage({
  src,
  alt = 'GEOSTORE product',
  width = 96,
  height = 96,
  className = '',
  fallbackClassName = ''
}) {
  const [failedUrl, setFailedUrl] = useState('');
  const imageUrl = typeof src === 'string' ? src.trim() : '';
  if (!imageUrl || imageUrl === failedUrl) {
    return <span role="img" aria-label={alt} className={fallbackClassName}>GEOSTORE</span>;
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => setFailedUrl(imageUrl)}
    />
  );
}
