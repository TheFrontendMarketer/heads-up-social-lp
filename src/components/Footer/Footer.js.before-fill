import { gsap, ScrollTrigger } from "../../lib/gsap.js";

const footer = document.querySelector("[data-footer]");
const logo = document.querySelector("[data-footer-logo]");
const title = document.querySelector("[data-footer-title]");
const rule = document.querySelector("[data-footer-rule]");
const legal = document.querySelector("[data-footer-legal]");

if (
  footer &&
  logo &&
  title &&
  rule &&
  legal &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches
) {
  gsap.set(logo, { opacity: 0, scale: 0.9 });
  gsap.set(title, { opacity: 0, y: 16 });
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
    .to(
      rule,
      {
        scaleX: 1,
        duration: 0.5,
        ease: "power2.inOut",
      },
      "-=0.2",
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
}
