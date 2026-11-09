const normalizeCategoryName = (value) => String(value ?? '').trim().toLocaleLowerCase();

export const isClothingProductCategory = (value) => (
  /ტანსაცმელ|ჩაცმა|ქურთუკ|შარვალ|ჯინს|მაისურ|პერანგ|ჰუდ|კაბ|სვიტ|ქვედაბოლო|პალტო/i.test(normalizeCategoryName(value))
);

export const isShoesProductCategory = (value) => (
  /ფეხსაცმელ|shoe|sneaker|trainer|boot|სანდალ|კედი|ჩექმა/i.test(normalizeCategoryName(value))
);

export const supportsSizeColorInventoryCategory = (value) => (
  isClothingProductCategory(value) || isShoesProductCategory(value)
);
