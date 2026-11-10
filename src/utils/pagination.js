export const getPaginationItems = (currentPage, totalPages) => {
  const total = Math.max(0, Math.floor(Number(totalPages) || 0));
  if (total === 0) return [];

  const current = Math.min(total, Math.max(1, Math.floor(Number(currentPage) || 1)));
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const pages = [1];
  if (current > 3) pages.push('…');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let page = start; page <= end; page += 1) pages.push(page);

  if (current < total - 2) pages.push('…');
  pages.push(total);
  return pages;
};
