import { gsap, ScrollTrigger } from "../../lib/gsap.js";

// Previous (softer) values — restore these to revert:
// const HEART_COLORS = ["#E63946", "#ff6b81", "#ff8fa3", "#e85d75", "#ffb3c1"];
// const HEART_COUNT = 12;
// size: 10 + Math.random() * 14
// fade: single gsap.to with opacity: 0 over full duration

const HEART_COLORS = ["#E63946"];
const HEART_COUNT = 14;

const heading = document.querySelector("[data-about-heading]");
const stage = document.querySelector("[data-about-hearts-stage]");

function launchHearts() {
  if (!stage) return;

  for (let i = 0; i < HEART_COUNT; i++) {
    const heart = document.createElement("span");
    heart.textContent = "♥";
    heart.setAttribute("aria-hidden", "true");
    heart.className = "about-heart";

    const size = 18 + Math.random() * 16;
    heart.style.color = HEART_COLORS[i % HEART_COLORS.length];
    heart.style.fontSize = `${size}px`;
    heart.style.left = `${12 + Math.random() * 76}%`;
    heart.style.opacity = "1";

    stage.appendChild(heart);

    const delay = i * 0.06;
    const floatDuration = 2.2 + Math.random() * 1.2;

    gsap.from(heart, {
      scale: 0.5,
      opacity: 0,
      duration: 0.25,
      delay,
    });

    gsap.to(heart, {
      duration: floatDuration,
      delay,
      physics2D: {
        velocity: 70 + Math.random() * 90,
        angle: -90 + (Math.random() * 40 - 20),
        gravity: 25,
      },
      ease: "none",
    });

    // Stay fully visible longer, then fade near the end
    gsap.to(heart, {
      opacity: 0,
      delay: delay + floatDuration * 0.55,
      duration: floatDuration * 0.45,
      ease: "power1.in",
      onComplete: () => heart.remove(),
    });
  }
}

if (
  heading &&
  stage &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches
) {
  ScrollTrigger.create({
    trigger: heading,
    start: "top 75%",
    once: true,
    onEnter: launchHearts,
  });
}
