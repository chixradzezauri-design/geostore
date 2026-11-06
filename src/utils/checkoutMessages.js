const CHECKOUT_ERROR_TRANSLATIONS = [
  { match: 'მომხმარებლის სახელი არასწორია', en: 'The name must contain 2–100 characters.', ru: 'Имя должно содержать 2–100 символов.' },
  { match: 'ტელეფონის ნომერში დაუშვებელი სიმბოლოებია', en: 'The phone number contains unsupported characters.', ru: 'Номер телефона содержит недопустимые символы.' },
  { match: 'ტელეფონის ნომერი უნდა შეიცავდეს', en: 'Enter a phone number containing 9–15 digits.', ru: 'Введите номер телефона из 9–15 цифр.' },
  { match: 'მისამართი არასწორია', en: 'Enter a valid delivery address (3–300 characters).', ru: 'Укажите корректный адрес доставки (3–300 символов).' },
  { match: 'სტუმრის შეკვეთისთვის მიუთითეთ სწორი ელფოსტა', en: 'Enter a valid email address for guest checkout.', ru: 'Для гостевого заказа укажите корректный адрес электронной почты.' },
  { match: 'ელფოსტის მისამართი არასწორია', en: 'The email address is invalid.', ru: 'Адрес электронной почты указан неверно.' },
  { match: 'შეკვეთის პროდუქტების სია არასწორია', en: 'The order contains invalid product data. Review your cart and try again.', ru: 'В заказе указаны неверные данные товара. Проверьте корзину и повторите попытку.' },
  { match: 'პროდუქტის ID, რაოდენობა, ზომა ან ფერი არასწორია', en: 'A product, quantity, size or color selection is invalid.', ru: 'Неверно указаны товар, количество, размер или цвет.' },
  { match: 'ერთი პროდუქტის ჯამური რაოდენობა', en: 'The total quantity of one product cannot exceed 100.', ru: 'Общее количество одного товара не может превышать 100.' },
  { match: 'პროდუქტი აღარ არის საკმარისი რაოდენობით მარაგში', en: 'There is not enough stock for one of the products. Refresh your cart and try again.', ru: 'Одного из товаров недостаточно на складе. Обновите корзину и повторите попытку.' },
  { match: 'პროდუქტი ვერ მოიძებნა', en: 'One of the products is no longer available. Refresh your cart and try again.', ru: 'Один из товаров больше недоступен. Обновите корзину и повторите попытку.' },
  { match: 'პროდუქტის ფასი არასწორია', en: 'A product has an invalid price. Please contact support.', ru: 'У товара указана неверная цена. Обратитесь в поддержку.' },
  { match: 'მიწოდების რეგიონი არასწორია', en: 'The selected delivery region is invalid. Select it again.', ru: 'Выбран неверный регион доставки. Выберите его ещё раз.' },
  { match: 'მიწოდების საფასური ვერ მოიძებნა', en: 'The delivery fee is unavailable for the selected region.', ru: 'Стоимость доставки для выбранного региона недоступна.' },
  { match: 'კუპონი არასწორია ან აღარ არის აქტიური', en: 'The coupon is invalid or no longer active. Remove it and try again.', ru: 'Купон недействителен или больше не активен. Удалите его и повторите попытку.' },
  { match: 'კუპონის მინიმალური შეკვეთის თანხა', en: 'The order does not meet the coupon minimum amount.', ru: 'Сумма заказа не достигает минимальной суммы для купона.' },
  { match: 'მომხმარებლის სესია შეკვეთის მონაცემებს არ ემთხვევა', en: 'Your session changed. Sign in again and retry your order.', ru: 'Сеанс пользователя изменился. Войдите снова и повторите заказ.' },
  { match: 'სტუმრის შეკვეთის ავტორიზაცია ვერ დადასტურდა', en: 'Guest checkout could not be verified. Refresh the page and try again.', ru: 'Не удалось подтвердить гостевой заказ. Обновите страницу и повторите попытку.' },
  { match: 'შეკვეთის იდენტიფიკატორი უკვე გამოყენებულია', en: 'This order reference is already in use. Please retry checkout.', ru: 'Этот номер заказа уже используется. Повторите оформление заказа.' },
  { match: 'შეკვეთა უკვე არსებობს, მაგრამ მისი განმეორებითი პასუხი ვერ აღდგა', en: 'The order was already recorded, but its confirmation could not be recovered. Contact support before placing another order.', ru: 'Заказ уже сохранён, но подтверждение не удалось восстановить. Перед повторным заказом обратитесь в поддержку.' },
  { match: 'მარაგის განახლება ვერ მოხერხდა', en: 'Stock could not be updated safely. Please refresh your cart and retry.', ru: 'Не удалось безопасно обновить остатки. Обновите корзину и повторите попытку.' }
];

export const getCheckoutErrorMessage = (error, language = 'ka') => {
  const raw = typeof error === 'string' ? error : String(error?.message ?? '');
  let message = raw;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed?.message === 'string') message = parsed.message;
    else if (typeof parsed?.details === 'string' && parsed.details) message = parsed.details;
  } catch {
    // The API may return a plain-text error rather than JSON.
  }

  if (language === 'ka') return message || 'შეკვეთის გაფორმება ვერ მოხერხდა. სცადეთ თავიდან.';
  const translation = CHECKOUT_ERROR_TRANSLATIONS.find((entry) => message.includes(entry.match));
  if (translation) return translation[language] || translation.en;
  return language === 'ru'
    ? 'Не удалось оформить заказ. Проверьте данные и повторите попытку.'
    : 'The order could not be submitted. Please review your details and try again.';
};
