const isPlainObject = value =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export const resolveAdminStorefrontSnapshot = (row, fallback) => {
  const safeFallback = {
    categories: Array.isArray(fallback?.categories) ? fallback.categories : [],
    banners: Array.isArray(fallback?.banners) ? fallback.banners : [],
    siteSettings: isPlainObject(fallback?.siteSettings) ? fallback.siteSettings : {}
  };

  const draft = isPlainObject(row?.draft_config) ? row.draft_config : null;
  const published = row?.is_published && isPlainObject(row?.published_config)
    ? row.published_config
    : null;
  const snapshot = draft || published || {};

  return {
    categories: Array.isArray(snapshot.categories) ? snapshot.categories : safeFallback.categories,
    banners: Array.isArray(snapshot.banners) ? snapshot.banners : safeFallback.banners,
    siteSettings: isPlainObject(snapshot.siteSettings) ? snapshot.siteSettings : safeFallback.siteSettings
  };
};

// Validate and copy a historical snapshot before placing it into the live editor.
// This mirrors the database publish constraints and never publishes or writes data.
export const normalizeRestorableStorefrontSnapshot = (rawSnapshot) => {
  if (!isPlainObject(rawSnapshot)) throw new Error('ვერსიის მონაცემები არასწორია.');
  if (!Array.isArray(rawSnapshot.categories) || rawSnapshot.categories.length > 100) {
    throw new Error('ვერსიის კატეგორიების სია არასწორია.');
  }
  if (!Array.isArray(rawSnapshot.banners) || rawSnapshot.banners.length > 20) {
    throw new Error('ვერსიის ბანერების სია არასწორია.');
  }
  if (!isPlainObject(rawSnapshot.siteSettings)) {
    throw new Error('ვერსიის საიტის პარამეტრები არასწორია.');
  }

  const categoryIds = new Set();
  const categoryNames = new Set();
  const categories = rawSnapshot.categories.map((raw, index) => {
    if (!isPlainObject(raw)) throw new Error(`კატეგორია №${index + 1} არასწორია.`);
    const id = String(raw.id ?? '').trim();
    const name = String(raw.name ?? '').trim();
    if (!id || id.length > 120 || categoryIds.has(id)) {
      throw new Error(`კატეგორია №${index + 1}: ID ცარიელია ან დუბლირებულია.`);
    }
    const normalizedName = name.toLocaleLowerCase();
    if (name.length < 2 || name.length > 60 || categoryNames.has(normalizedName)) {
      throw new Error(`კატეგორია №${index + 1}: სახელი არასწორია ან დუბლირებულია.`);
    }
    categoryIds.add(id);
    categoryNames.add(normalizedName);
    const image = typeof raw.image === 'string' ? raw.image : (typeof raw.img === 'string' ? raw.img : '');
    return { ...raw, id, name, image, img: image };
  });

  const rootIds = new Set(categories.filter(category => !category.parentId).map(category => category.id));
  for (const category of categories) {
    if (category.parentId && (!rootIds.has(String(category.parentId)) || String(category.parentId) === category.id)) {
      throw new Error(`კატეგორია „${category.name}“ არასწორ მთავარ კატეგორიას უკავშირდება.`);
    }
  }

  const bannerIds = new Set();
  const banners = rawSnapshot.banners.map((raw, index) => {
    if (!isPlainObject(raw)) throw new Error(`ბანერი №${index + 1} არასწორია.`);
    const banner = {
      ...raw,
      id: String(raw.id ?? '').trim(),
      title: String(raw.title ?? '').trim(),
      subtitle: String(raw.subtitle ?? '').trim(),
      image: String(raw.image ?? '').trim(),
      link: String(raw.link ?? '').trim()
    };
    if (!banner.id || banner.id.length > 120 || bannerIds.has(banner.id)) {
      throw new Error(`ბანერი №${index + 1}: ID ცარიელია ან დუბლირებულია.`);
    }
    if (!banner.title || banner.title.length > 120 || banner.subtitle.length > 240) {
      throw new Error(`ბანერი №${index + 1}: სათაური ან აღწერა არასწორია.`);
    }
    if (banner.link) {
      try {
        const url = new URL(banner.link);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Invalid protocol');
      } catch {
        throw new Error(`ბანერი „${banner.title}“ შეიცავს არასწორ ბმულს.`);
      }
    }
    bannerIds.add(banner.id);
    return banner;
  });

  const settings = { ...rawSnapshot.siteSettings };
  const settingLimits = { storeName: 60, topBarText: 160, heroTitle: 120, heroSubtitle: 240 };
  for (const [key, maxLength] of Object.entries(settingLimits)) {
    settings[key] = String(settings[key] ?? '').trim();
    if (settings[key].length > maxLength) {
      throw new Error(`საიტის პარამეტრი „${key}“ დასაშვებ სიგრძეს აჭარბებს.`);
    }
  }
  if (settings.storeName.length < 2) throw new Error('მაღაზიის დასახელება მინიმუმ 2 სიმბოლო უნდა იყოს.');

  return { ...rawSnapshot, categories, banners, siteSettings: settings };
};
