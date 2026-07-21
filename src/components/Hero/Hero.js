import { gsap, SplitText } from "../../lib/gsap.js";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const title = document.querySelector("#title");
const subtitle = document.querySelector("#subtitle");
const heroStack = document.querySelector("[data-hero-stack]");

async function waitForAtomicMarker() {
  if (!document.fonts?.load) return;

  try {
    // Ensure this face is fetched before we show / split the title.
    await document.fonts.load('700 64px "Atomic Marker"');
    await document.fonts.ready;
  } catch {
    // Proceed with whatever is available.
  }
}

async function runHeroIntro() {
  await waitForAtomicMarker();

  if (title) {
    title.classList.add("is-font-ready");
  }

  if (title && !reducedMotion) {
    const split = SplitText.create(title, {
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
  }

  if (subtitle && !reducedMotion) {
    gsap.from(subtitle, {
      opacity: 0,
      y: 20,
      delay: 0.4,
      duration: 0.8,
    });
  }

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
        "-=0.5",
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
        "-=0.6",
      );
  }
}

runHeroIntro();
