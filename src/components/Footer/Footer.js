import { gsap, ScrollTrigger } from "../../lib/gsap.js";

/*
 * Fill effect trial — revert with:
 *   cp src/components/Footer/Footer.astro.before-fill src/components/Footer/Footer.astro
 *   cp src/components/Footer/Footer.js.before-fill src/components/Footer/Footer.js
 */

/**
 * One wipe progress drives both layers so their edges stay locked.
 * Left inset stays at -25% so Atomic Marker’s H ink isn’t cropped;
 * red starts with right inset 125% so that left overhang stays empty
 * (right 100% + left -25% was the red H-sliver).
 */
function applyFillWipe(base, red, t) {
  const redRight = 125 - t * 150; // 125% → -25%
  const whiteLeft = 100 - redRight; // -25% → 125% (same wipe edge as red)
  red.style.clipPath = `inset(-50% ${redRight}% -50% -25%)`;
  base.style.clipPath = `inset(-50% -25% -50% ${whiteLeft}%)`;
}

const footer = document.querySelector("[data-footer]");
const logo = document.querySelector("[data-footer-logo]");
const title = document.querySelector("[data-footer-title]");
const fillBase = document.querySelector("[data-footer-fill-base]");
const fillRed = document.querySelector("[data-footer-fill-red]");
const rule = document.querySelector("[data-footer-rule]");
const legal = document.querySelector("[data-footer-legal]");

if (
  footer &&
  logo &&
  title &&
  fillBase &&
  fillRed &&
  rule &&
  legal &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches
) {
  const wipe = { t: 0 };

  gsap.set(logo, { opacity: 0, scale: 0.9 });
  gsap.set(title, { opacity: 0, y: 16 });
  applyFillWipe(fillBase, fillRed, 0);
  gsap.set(rule, { scaleX: 0 });
  gsap.set(legal, { opacity: 0, y: 12 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: footer,
      start: "top 85%",
      once: true,
    },
  });

  tl.to(logo, {
    opacity: 1,
    scale: 1,
    duration: 0.55,
    ease: "power2.out",
  })
    .to(
      title,
      {
        opacity: 1,
        y: 0,
        duration: 0.55,
        ease: "power2.out",
      },
      "-=0.3",
    )
    // Start fill while title is still settling — less dead air before red.
    .to(
      wipe,
      {
        t: 1,
        duration: 1,
        ease: "power2.inOut",
        onUpdate: () => applyFillWipe(fillBase, fillRed, wipe.t),
      },
      "-=0.4",
    )
    .to(
      rule,
      {
        scaleX: 1,
        duration: 0.5,
        ease: "power2.inOut",
      },
      "-=0.25",
    )
    .to(
      legal,
      {
        opacity: 1,
        y: 0,
        duration: 0.45,
        ease: "power2.out",
      },
      "-=0.15",
    );
} else if (fillBase && fillRed) {
  applyFillWipe(fillBase, fillRed, 1);
}
