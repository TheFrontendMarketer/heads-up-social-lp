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
