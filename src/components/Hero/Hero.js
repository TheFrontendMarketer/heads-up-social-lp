import { gsap, SplitText } from "../../lib/gsap.js";

const split = SplitText.create("#title", {
  type: "words,chars",
  wordsClass: "split-word",
});

gsap.from(split.chars, {
  yPercent: 100,
  opacity: 0,
  stagger: 0.04,
  ease: "back.out(1.7)",
  duration: 0.8,
});

gsap.from("#subtitle", {
  opacity: 0,
  y: 20,
  delay: 0.4,
  duration: 0.8,
});

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const heroStack = document.querySelector("[data-hero-stack]");

if (heroStack && !reducedMotion) {
  const imageTl = gsap.timeline({ delay: 0.25 });

  imageTl
    .from("[data-hero-main]", {
      opacity: 0,
      scale: 0.96,
      duration: 0.9,
      ease: "power2.out",
    })
    .from(
      "[data-hero-code]",
      {
        opacity: 0,
        x: -24,
        y: 24,
        duration: 0.8,
        ease: "power2.out",
      },
      "-=0.5"
    )
    .from(
      "[data-hero-repo]",
      {
        opacity: 0,
        x: 24,
        y: -24,
        duration: 0.8,
        ease: "power2.out",
      },
      "-=0.6"
    );
}

// Revert: remove everything from `const reducedMotion` through the closing `}` above.
// Hero.astro data-hero-* attributes can stay or be removed — they have no effect without this block.
