import { normalizeStorefrontVisualDesign } from './storefrontVisualDesign.js';

// Copy presets do not schedule a campaign or change any price, discount or stock.
export const FLASH_CAMPAIGN_COPY_PRESETS = Object.freeze([
  { id: 'flash', label: 'Flash Sale', title: 'Flash Sale', badge: 'სპეციალური შეთავაზება', description: 'აღმოაჩინე აქციის პროდუქტები.' },
  { id: 'black-friday', label: 'შავი პარასკევი', title: 'შავი პარასკევი', badge: 'BLACK FRIDAY', description: 'აღმოაჩინე სპეციალური შეთავაზებები.' },
  { id: 'new-year', label: 'საახალწლო აქცია', title: 'საახალწლო აქცია', badge: 'სადღესასწაულო', description: 'შეარჩიე საყვარელი პროდუქტები.' },
  { id: 'seasonal', label: 'სეზონური აქცია', title: 'სეზონური აქცია', badge: 'სპეციალური შეთავაზება', description: 'აღმოაჩინე სეზონის შეთავაზებები.' },
  { id: 'weekend', label: 'შაბათ-კვირის შეთავაზება', title: 'შაბათ-კვირის შეთავაზება', badge: 'WEEKEND', description: 'დაათვალიერე აქციის პროდუქტები.' },
  { id: 'clearance', label: 'სპეციალური ფასები', title: 'სპეციალური ფასები', badge: 'SALE', description: 'შეარჩიე პროდუქტი აქციის ფასად.' }
].map(Object.freeze));

export function applyFlashCampaignCopyPreset(raw, id) {
  const design = normalizeStorefrontVisualDesign(raw);
  const preset = FLASH_CAMPAIGN_COPY_PRESETS.find(item => item.id === id);
  if (!preset && id !== 'reset') return design;
  return normalizeStorefrontVisualDesign({
    ...design,
    copy: {
      ...design.copy,
      flashSaleTitle: preset?.title || '',
      flashSaleBadge: preset?.badge || '',
      flashSaleSubtitle: preset?.description || ''
    }
  });
}
