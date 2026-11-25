// Local account isolation only; do not read, migrate or delete the ambiguous legacy key.
const sampleItems = () => [
        {
          id: 'w1',
          name: 'შავი ქურთუკი',
          category: 'ტანსაცმელი',
          subCategory: 'ქურთუკი',
          color: 'შავი',
          season: 'ზამთარი / შემოდგომა',
          image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=600'
        },
        {
          id: 'w2',
          name: 'თეთრი სპორტული ბოტასი',
          category: 'ფეხსაცმელი',
          subCategory: 'ბოტასი',
          color: 'თეთრი',
          season: 'ყველა სეზონი',
          image: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&q=80&w=600'
        }
      ];
export function wardrobeStorageKey(ownerId) {
  return 'geostore_digital_wardrobe:'+(ownerId ? 'user:'+encodeURIComponent(String(ownerId)) : 'guest');
}
export function readWardrobe(storage, ownerId) {
  try {
    const raw=storage.getItem(wardrobeStorageKey(ownerId));
    if(raw===null)return sampleItems();
    const items=JSON.parse(raw);
    return Array.isArray(items)?items.filter(item=>item&&typeof item==='object'&&typeof item.id==='string'&&typeof item.name==='string'):[];
  } catch {return [];}
}
export function writeWardrobe(storage,ownerId,items) {
  if(!Array.isArray(items))throw new TypeError('Wardrobe must be an array');
  storage.setItem(wardrobeStorageKey(ownerId),JSON.stringify(items));
}

// Access the browser storage getter inside the guard: it can throw SecurityError.
export function readCurrentWardrobe(ownerId, getStorage = () => globalThis.localStorage) {
  try {return readWardrobe(getStorage(),ownerId);} catch {return [];}
}
