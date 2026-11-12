const normalizeCategoryName = (value) => String(value ?? '').trim().toLocaleLowerCase();

const isAccessoryCategoryName = (value) => (
  /აქსესუარ|accessor|аксессуар|საათ|watch|часы/i.test(normalizeCategoryName(value))
);

export const isClothingProductCategory = (value) => (
  /ტანსაცმელ|ჩაცმა|ქურთუკ|შარვალ|ჯინს|მაისურ|პერანგ|ჰუდ|კაბ|სვიტ|ქვედაბოლო|პალტო|apparel|clothing|одежд/i.test(normalizeCategoryName(value))
);

export const isShoesProductCategory = (value) => (
  /ფეხსაცმელ|shoe|sneaker|trainer|boot|სანდლ|კედი|ჩექმა|обув/i.test(normalizeCategoryName(value))
);

export const isPhoneProductCategory = (value) => (
  !isAccessoryCategoryName(value) &&
  /ტელეფონ|სმარტფონ|phone|smartphone|mobile|телефон|смартфон/i.test(normalizeCategoryName(value))
);

export const isLaptopProductCategory = (value) => (
  !isAccessoryCategoryName(value) &&
  /ლეპტოპ|კომპიუტერ|laptop|computer|notebook|ноутбук|компьютер/i.test(normalizeCategoryName(value))
);

export const isAccessoryProductCategory = (value) => isAccessoryCategoryName(value);

export const supportsSizeColorInventoryCategory = (value) => (
  isClothingProductCategory(value) || isShoesProductCategory(value)
);
