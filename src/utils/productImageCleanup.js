export const collectReferencedProductImageUrls = (products, excludedProductId) => {
  const referenced = new Set();
  if (!Array.isArray(products)) return referenced;

  for (const product of products) {
    if (!product || String(product.id) === String(excludedProductId)) continue;
    const urls = [
      product.image,
      ...(Array.isArray(product.gallery) ? product.gallery : [])
    ];
    for (const url of urls) {
      if (typeof url === 'string' && url.trim()) referenced.add(url.trim());
    }
  }

  return referenced;
};

export const collectReferencedOrderImageUrls = (orders) => {
  const referenced = new Set();
  if (!Array.isArray(orders)) return referenced;

  for (const order of orders) {
    const items = Array.isArray(order?.items) ? order.items : [];
    for (const item of items) {
      const urls = [
        item?.image,
        item?.image_url,
        item?.imageUrl,
        ...(Array.isArray(item?.gallery) ? item.gallery : [])
      ];
      for (const url of urls) {
        if (typeof url === 'string' && url.trim()) referenced.add(url.trim());
      }
    }
  }

  return referenced;
};

export const collectOrderProductIdsWithoutImageSnapshot = (orders) => {
  const referenced = new Set();
  if (!Array.isArray(orders)) return referenced;

  for (const order of orders) {
    const items = Array.isArray(order?.items) ? order.items : [];
    for (const item of items) {
      const productId = String(item?.id ?? item?.product_id ?? '').trim();
      if (!productId) continue;
      const hasImage = [item?.image, item?.image_url, item?.imageUrl]
        .some(url => typeof url === 'string' && url.trim()) ||
        (Array.isArray(item?.gallery) && item.gallery.some(url => typeof url === 'string' && url.trim()));
      if (!hasImage) referenced.add(productId);
    }
  }

  return referenced;
};

export const collectReferencedStorefrontImageUrls = (...sources) => {
  const referenced = new Set();
  const visited = new WeakSet();
  const visit = (value) => {
    if (typeof value === 'string') {
      try {
        const url = new URL(value.trim());
        if (url.protocol === 'https:' || url.protocol === 'http:') referenced.add(value.trim());
      } catch { /* Non-URL text is not a media reference. */ }
      return;
    }
    if (!value || typeof value !== 'object' || visited.has(value)) return;
    visited.add(value);
    if (Array.isArray(value)) value.forEach(visit);
    else Object.values(value).forEach(visit);
  };
  sources.forEach(visit);
  return referenced;
};

export const collectReferencedLegacyMessageImageUrls = (messages) => {
  if (!Array.isArray(messages)) return new Set();
  return collectReferencedStorefrontImageUrls(messages.map(message => message?.image));
};

export const collectReferencedProductImagePaths = (imageUrls, publicPrefix) => {
  const referenced = new Set();
  if (!Array.isArray(imageUrls) || typeof publicPrefix !== 'string' || !publicPrefix.trim()) return referenced;

  let prefixUrl;
  try {
    prefixUrl = new URL(publicPrefix);
  } catch {
    return referenced;
  }
  if (!['http:', 'https:'].includes(prefixUrl.protocol)) return referenced;
  const prefixPath = prefixUrl.pathname.endsWith('/') ? prefixUrl.pathname : `${prefixUrl.pathname}/`;

  for (const value of imageUrls) {
    if (typeof value !== 'string' || !value.trim()) continue;
    try {
      const parsed = new URL(value.trim());
      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== prefixUrl.origin) continue;
      if (!parsed.pathname.startsWith(prefixPath)) continue;
      const encodedPath = parsed.pathname.slice(prefixPath.length);
      const path = encodedPath.split('/').map(segment => decodeURIComponent(segment)).join('/');
      if (path && !path.split('/').some(segment => !segment || segment === '.' || segment === '..')) {
        referenced.add(path);
      }
    } catch {
      // Ignore malformed or unrelated URLs; cleanup remains limited to validated owned paths.
    }
  }

  return referenced;
};


export const collectOwnedProductImagePaths = (imageUrls, publicPrefix, productId) => {
  const paths = new Set();
  if (!Array.isArray(imageUrls) || typeof publicPrefix !== 'string' || !publicPrefix.trim()) return paths;
  const expectedProductId = String(productId ?? '').trim();
  if (!expectedProductId || expectedProductId === '.' || expectedProductId === '..' || /[\/\\\u0000-\u001f\u007f]/.test(expectedProductId)) return paths;

  let prefixUrl;
  try {
    prefixUrl = new URL(publicPrefix);
  } catch {
    return paths;
  }
  if (!['http:', 'https:'].includes(prefixUrl.protocol)) return paths;
  const prefixPath = prefixUrl.pathname.endsWith('/') ? prefixUrl.pathname : `${prefixUrl.pathname}/`;

  for (const value of imageUrls) {
    if (typeof value !== 'string' || !value.trim()) continue;
    try {
      const parsed = new URL(value.trim());
      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== prefixUrl.origin) continue;
      if (!parsed.pathname.startsWith(prefixPath)) continue;
      const encodedPath = parsed.pathname.slice(prefixPath.length);
      const segments = encodedPath.split('/').map(segment => decodeURIComponent(segment));
      if (segments.length < 3 || segments[0] !== 'products' || segments[1] !== expectedProductId) continue;
      if (segments.some(segment =>
        !segment || segment === '.' || segment === '..' ||
        segment.includes('/') || segment.includes('\\') ||
        /[\u0000-\u001f\u007f]/.test(segment)
      )) continue;
      paths.add(segments.join('/'));
    } catch {
      // Invalid encoding or malformed URLs are never eligible for deletion.
    }
  }
  return paths;
};


export const collectReferencedMediaStoragePaths = (mediaRows) => {
  const referenced = new Set();
  if (!Array.isArray(mediaRows)) return referenced;
  for (const row of mediaRows) {
    const path = typeof row?.storage_path === 'string' ? row.storage_path.trim().replace(/^\/+/, '') : '';
    if (path && !path.split('/').some(segment =>
      !segment || segment === '.' || segment === '..' || segment.includes('\\')
    )) {
      referenced.add(path);
    }
  }
  return referenced;
};
