// components/journey/desktop/chrome/desktopKeyframes.ts

// All animations used by the desktop journey + map shells. Centralised
// here so the shells can do <style>{DESKTOP_KEYFRAMES}</style> once at
// the top and every child component can reference dj-* class names.
//
// The dj- prefix means "desktop journey" and avoids collisions with the
// mobile keyframes (jp-, tds-, dgc-, etc.).

export const DESKTOP_KEYFRAMES = `
  @property --dj-angle {
    syntax: '<angle>';
    initial-value: 0deg;
    inherits: false;
  }

  /* Slow conic-gradient rotation for holographic frame borders */
  @keyframes dj-rotate { to { --dj-angle: 360deg; } }

  /* Brightness/saturation breathing — pairs with dj-rotate */
  @keyframes dj-pulse {
    0%, 100% { filter: brightness(1) saturate(1); }
    50%      { filter: brightness(1.30) saturate(1.20); }
  }

  /* Gradient text shimmer — used for headers + active nav items */
  @keyframes dj-shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }

  /* Entrance fade-up for shell + panes */
  @keyframes dj-fadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Floating drift for the AI mentor orb in the right dock */
  @keyframes dj-float {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-10px); }
  }

  /* Background mesh pan — slow horizontal drift */
  @keyframes dj-meshPan {
    0%   { transform: translate(0, 0); }
    100% { transform: translate(-60px, -40px); }
  }

  /* Background orb breathe */
  @keyframes dj-orbBreathe {
    0%, 100% { opacity: 0.45; transform: scale(1); }
    50%      { opacity: 0.75; transform: scale(1.08); }
  }

  /* Status dot pulse — used in nav active indicator + status bar */
  @keyframes dj-dotPulse {
    0%, 100% { opacity: 0.7; transform: scale(1); }
    50%      { opacity: 1;   transform: scale(1.18); }
  }

  /* Scan-line sweep across cards on hover */
  @keyframes dj-scanX {
    0%   { transform: translateX(-30%); opacity: 0; }
    15%  { opacity: 1; }
    85%  { opacity: 1; }
    100% { transform: translateX(330%); opacity: 0; }
  }

  /* Vertical scan-line on the mentor dock */
  @keyframes dj-scanY {
    0%   { transform: translateY(-30%); opacity: 0; }
    15%  { opacity: 1; }
    50%  { opacity: 1; }
    100% { transform: translateY(330%); opacity: 0; }
  }

  /* AI orb core pulse */
  @keyframes dj-corePulse {
    0%, 100% {
      transform: scale(1);
      filter: drop-shadow(0 0 20px rgba(167,139,250,0.55));
    }
    50% {
      transform: scale(1.05);
      filter: drop-shadow(0 0 36px rgba(167,139,250,0.85));
    }
  }

  /* Particle burst (cmd-K palette open + nav transitions) */
  @keyframes dj-particle {
    0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
    20%  { opacity: 1; }
    100% { opacity: 0; transform: translate(calc(-50% + var(--dj-dx)), calc(-50% + var(--dj-dy))) scale(0.2); }
  }

  /* Background star twinkle */
  @keyframes dj-twinkle {
    0%, 100% { opacity: 0.25; }
    50%      { opacity: 0.85; }
  }

  /* Slide-in for the right-side topic detail panel */
  @keyframes dj-panelSlideIn {
    from { opacity: 0; transform: translateX(40px); }
    to   { opacity: 1; transform: translateX(0); }
  }

  /* Slide-out — paired with dj-panelSlideIn */
  @keyframes dj-panelSlideOut {
    from { opacity: 1; transform: translateX(0); }
    to   { opacity: 0; transform: translateX(40px); }
  }

  /* Command palette modal entrance */
  @keyframes dj-paletteIn {
    from { opacity: 0; transform: translateY(-12px) scale(0.96); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
`
