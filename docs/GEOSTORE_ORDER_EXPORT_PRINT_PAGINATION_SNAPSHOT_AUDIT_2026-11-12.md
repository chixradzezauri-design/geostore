# GEOSTORE Order Export, Print, Pagination and Snapshot Audit — 2026-11-12

## Scope
Audited order CSV export, invoice print/PDF flow, order search/status/date filters, pagination, checkout item snapshot construction and the server-side immutable order snapshot migration. This is a new stage; earlier completed audit areas were not re-opened except where needed to trace snapshot data.

## Findings
- CSV export maps the full filtered order collection, not the currently visible five-row page. Search, status and date filters therefore constrain the export while pagination does not silently omit matching orders.
- CSV fields include order identity/date, customer contact and address, product names, SKU, selected size/color, custom variant, quantity, unit price/line total, product image URLs, delivery amount, total, status and admin note. Payment method/status are explicitly marked as not stored rather than fabricated.
- CSV cell escaping quotes values and neutralizes spreadsheet formula-like leading values, including values preceded by whitespace/format characters.
- Invoice print builds a separate window, escapes customer/order text, permits only HTTPS or validated image data URLs, waits for fonts/images (with a bounded timeout), hides failed images, and then invokes the print dialog. Invoice totals use the persisted server breakdown only when it reconciles with the immutable order total; otherwise the trusted total-only display remains.
- Search covers order/customer/contact/address and product/variant fields. Status filters normalize legacy English/Russian statuses into Georgian filter groups. Date bounds are validated, and changing search/status/date filters returns the relevant view to page one.
- Pagination clamps the displayed page to the current page count and uses stable order sorting; an empty result set displays the empty-state message.
- Checkout creates item snapshots with product image, full gallery, base price, quantity, selected size/color, custom variant, gift options, category/vendor and purchase-cost snapshot. The server migration independently builds persisted order items from locked current product/variant data and stores image/gallery and selected variant details in the order record.
- Existing tests assert image/gallery/variant normalization, server snapshot fields, and historical-image-first resolution.

## Limitations
- No browser-based print/PDF test was run; mobile Safari popup/print behavior remains unverified in an actual device session.
- Current-branch GitHub Actions list contains successful Build check, Dependency security audit and CodeQL runs for an earlier commit (`f7708d8e...`), not the current audit-branch HEAD. No passing CI result is claimed for the current HEAD.
- No Production order, customer data, or database row was changed or created.

## Result
No reproducible defect was established in this stage. No application code or Production data was changed.

## Next stage
Audit product-to-order data consistency for edited/depublished products and historical order references, including the safe product-delete guard and how order snapshots behave when catalogue fields change. Only revisit an earlier area if this new audit exposes a concrete regression.
