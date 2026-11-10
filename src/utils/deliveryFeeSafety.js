const DELIVERY_FEE_REGIONS = ['tbilisi', 'bigCities', 'other'];

export const parseDeliveryFeeDrafts = (drafts) => {
  if (!drafts || typeof drafts !== 'object' || Array.isArray(drafts)) {
    throw new TypeError('მიწოდების ტარიფების ფორმატი არასწორია.');
  }

  return DELIVERY_FEE_REGIONS.map((region) => {
    const raw = String(drafts[region] ?? '').trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) {
      throw new Error('სამივე რეგიონის მიწოდების საფასური სავალდებულოა. შეიყვანეთ 0 ან მეტი თანხა, მაქსიმუმ 2 ათწილადი ნიშნით.');
    }
    const fee = Number(raw);
    if (!Number.isFinite(fee) || fee < 0) {
      throw new Error('მიწოდების საფასური უნდა იყოს 0 ან მეტი.');
    }
    return { region, fee_gel: fee };
  });
};
