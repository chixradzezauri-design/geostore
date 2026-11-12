const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const normalizeAnnouncementAudience = (input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('მიმღებების არჩევის ფორმატი არასწორია.');
  }

  const mode = input.mode;
  if (mode === 'all') {
    return { mode: 'all', recipientIds: [] };
  }
  if (mode !== 'selected') {
    throw new Error('აირჩიეთ შეტყობინების მიმღებების ტიპი.');
  }

  if (!Array.isArray(input.recipientIds)) {
    throw new TypeError('მონიშნული მიმღებების სია არასწორია.');
  }

  const recipientIds = [...new Set(input.recipientIds.map((value) => {
    if (typeof value !== 'string') return '';
    return value.trim().toLowerCase();
  }))];

  if (recipientIds.length === 0 || recipientIds.some((id) => !UUID_PATTERN.test(id))) {
    throw new Error('მონიშნეთ მინიმუმ ერთი სწორი მომხმარებელი.');
  }

  return { mode: 'selected', recipientIds };
};
