# GEOSTORE — Premium character studio refresh (2026-11-26)

Source: ScreenRecording_11-26-2026 12-13-27_1.mp4 (6s mobile recording). GeoFox's open assistant bubble covers part of the catalogue, with a role label, greeting and stacked actions. The recording does not establish the precise underlying GPU geometry or animation settings.

1. Compact initial greeting and no bouncing text — implemented in source; pending CI.
2. Responsive placement and footprint audit — implemented in source; pending rendered CI.
3. Foreground overlap, grounded shadows and depth — pending.
4. Refine existing 3D model geometry, proportions and materials; preserve all characters and vector fallback — pending.
5. Calm body/gesture motion, reduced-motion and performance — pending.
6. Final text balance, admin preview parity, browser regression and explicit approval before production — pending.

Phase 1: public greetings keep configured text, name and dismiss; the additional actions, product links, help and mute are behind an accessible disclosure. Admin interactive previews stay expanded for editing. No change to published settings, session timers, recommendation validation, handlers, payment or authorization. Text bubble no longer translates or fades on public pages. Mobile height/width are bounded; long text remains scrollable. Browser fixture opens the disclosure before asserting the existing actions. No preview or production deployment.

Phase 2: phase 1 Build check passed 1490/1490 tests; its browser run was still pending when this scoped change was prepared. The public scene is capped by viewport size and saved figure size, with safe area insets and a reserved desktop dock lane. Header, close and disclosure remain fixed within the bubble; long messages and expanded actions scroll separately. The responsive browser fixture now checks eight portrait/desktop/short viewport combinations and close-button hit testing. No stored appearance defaults, admin previews, recommendation behavior, or production deployment changed. Actual rendered geometry remains to be verified.
