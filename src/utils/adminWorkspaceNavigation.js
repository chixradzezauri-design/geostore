// Presentation-only navigation grouping. Authorization remains with the caller.
export const ADMIN_WORKSPACE_GROUPS = [
  {
    "id": "overview",
    "label": "მთავარი",
    "ids": [
      "command",
      "analytics",
      "calculator",
      "expenses",
      "ai_analyst"
    ]
  },
  {
    "id": "commerce",
    "label": "გაყიდვები და კატალოგი",
    "ids": [
      "orders",
      "products",
      "inventory",
      "replenishment",
      "categories",
      "vendors"
    ]
  },
  {
    "id": "customers",
    "label": "მომხმარებლები და კომუნიკაცია",
    "ids": [
      "users",
      "support",
      "messages",
      "broadcasts"
    ]
  },
  {
    "id": "marketing",
    "label": "მარკეტინგი და დიზაინი",
    "ids": [
      "discounts",
      "coupons",
      "banners",
      "visual_editor",
      "admin_visual_editor"
    ]
  },
  {
    "id": "system",
    "label": "სისტემა",
    "ids": [
      "staff",
      "logs",
      "settings"
    ]
  }
];

export function groupAdminWorkspaceNavigation(permittedItems) {
  const byId = new Map(permittedItems.map(item => [item.id, item]));
  const grouped = ADMIN_WORKSPACE_GROUPS.map(group => ({ ...group, items: group.ids.filter(id => byId.has(id)).map(id => byId.get(id)) })).filter(group => group.items.length > 0);
  const known = new Set(ADMIN_WORKSPACE_GROUPS.flatMap(group => group.ids));
  const other = permittedItems.filter(item => !known.has(item.id));
  if (other.length) grouped.push({ id: 'other', label: 'სხვა მოდულები', items: other });
  return grouped;
}

export function adminWorkspaceNavigationLabel(label) {
  return String(label ?? '').replace(/^\p{Extended_Pictographic}[\uFE0F\u200D\p{Extended_Pictographic}]*\s+/u, '');
}
