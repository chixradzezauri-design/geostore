// Cart feedback presentation only. Cart stock and quantity rules are unchanged.
const MESSAGES = {
 ka: {
  invalidQuantity: 'რაოდენობა უნდა იყოს მთელი რიცხვი 1-დან 100-მდე.',
  invalidSize: 'არჩეული ზომა ამ პროდუქტისთვის ხელმისაწვდომი არ არის.',
  invalidColor: 'არჩეული ფერი ამ პროდუქტისთვის ხელმისაწვდომი არ არის.',
  invalidCombination: 'არჩეული ზომისა და ფერის კომბინაცია მარაგში აღარ არის.',
  unavailableVariant: 'არჩეული ვარიანტი აღარ არის ხელმისაწვდომი.',
  selectVariant: 'შეკვეთამდე აირჩიეთ პროდუქტის ინდივიდუალური ვარიანტი.',
  outOfStock: 'პროდუქტი ამჟამად მარაგში არ არის.',
  stockLimit: 'მარაგში დარჩენილია მხოლოდ {remaining} ცალი.',
  added: '🛒 "{name}" დაემატა კალათაში!'
 },
 en: {
  invalidQuantity: 'Quantity must be a whole number from 1 to 100.',
  invalidSize: 'The selected size is not available for this product.',
  invalidColor: 'The selected color is not available for this product.',
  invalidCombination: 'The selected size and color combination is no longer in stock.',
  unavailableVariant: 'The selected option is no longer available.',
  selectVariant: 'Choose a product option before adding it to your cart.',
  outOfStock: 'This product is currently out of stock.',
  stockLimit: 'Only {remaining} item(s) remain in stock.',
  added: '🛒 "{name}" was added to your cart!'
 },
 ru: {
  invalidQuantity: 'Количество должно быть целым числом от 1 до 100.',
  invalidSize: 'Выбранный размер недоступен для этого товара.',
  invalidColor: 'Выбранный цвет недоступен для этого товара.',
  invalidCombination: 'Выбранное сочетание размера и цвета больше не доступно.',
  unavailableVariant: 'Выбранный вариант больше недоступен.',
  selectVariant: 'Выберите вариант товара перед добавлением в корзину.',
  outOfStock: 'Сейчас этого товара нет в наличии.',
  stockLimit: 'В наличии осталось только {remaining} шт.',
  added: '🛒 "{name}" добавлен в корзину!'
 }
};
export function getCartFeedbackMessage(language, kind, details = {}) {
 const copy = MESSAGES[language] || MESSAGES.ka;
 const template = copy[kind] || MESSAGES.ka[kind] || '';
 if(kind === 'stockLimit') {
  const remaining = Number(details.remaining);
  return Number.isFinite(remaining) && remaining >= 0
    ? template.replace('{remaining}', String(Math.floor(remaining))) : copy.outOfStock;
 }
 if(kind === 'added') return template.replace('{name}', String(details.name ?? '').trim().slice(0,100));
 return template;
}
