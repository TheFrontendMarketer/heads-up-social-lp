import { gsap, ScrollTrigger, DrawSVGPlugin } from "../../lib/gsap.js";

const section = document.querySelector("[data-path-section]");
const svg = document.querySelector("[data-path-svg]");
const stem = document.querySelector("[data-path-stem]");
const left = document.querySelector("[data-path-left]");
const right = document.querySelector("[data-path-right]");
const options = gsap.utils.toArray("[data-path-option]");
const dots = gsap.utils.toArray("[data-path-dot]");
const handle = document.querySelector("[data-path-handle]");

const SAMPLE_COUNT = 240;
const COMMIT_THRESHOLD = 0.98;
const DUST_PARTICLE_COUNT = 120;
const desktopQuery = window.matchMedia("(min-width: 959px)");
const reducedMotionQuery = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
);

let isInteractive = false;
let isDragging = false;
let branches = null;
let activeBranch = "left";
let currentProgress = 0;
let desktopReady = false;
let committedChoice = null;
let dustTimeline = null;
let dustLayer = null;

function isDesktop() {
  return desktopQuery.matches;
}

function buildBranch(pathEl, choice) {
  const total = pathEl.getTotalLength();
  const samples = [];

  for (let i = 0; i <= SAMPLE_COUNT; i++) {
    const progress = i / SAMPLE_COUNT;
    const point = pathEl.getPointAtLength(progress * total);
    samples.push({ x: point.x, y: point.y, progress });
  }

  return { pathEl, choice, total, samples };
}

function pointAtProgress(branch, progress) {
  const clamped = gsap.utils.clamp(0, 1, progress);
  const point = branch.pathEl.getPointAtLength(clamped * branch.total);
  return { x: point.x, y: point.y };
}

function closestOnBranch(branch, point) {
  let best = branch.samples[0];
  let bestDist = Infinity;

  for (const sample of branch.samples) {
    const dist = Math.hypot(sample.x - point.x, sample.y - point.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = sample;
    }
  }

  return { progress: best.progress, x: best.x, y: best.y, dist: bestDist };
}

function setHandlePoint(point) {
  if (!handle) return;
  gsap.set(handle, { x: point.x, y: point.y });
}

function getSvgPoint(event) {
  if (!svg) return null;

  const rect = svg.getBoundingClientRect();
  const clientX = event.clientX ?? event.touches?.[0]?.clientX;
  const clientY = event.clientY ?? event.touches?.[0]?.clientY;

  if (clientX == null || clientY == null) return null;

  const viewBox = svg.viewBox.baseVal;
  return {
    x: ((clientX - rect.left) / rect.width) * viewBox.width,
    y: ((clientY - rect.top) / rect.height) * viewBox.height,
  };
}

function clearSelectedOptions() {
  options.forEach((option) => {
    option.classList.remove("is-selected", "is-winner");
    gsap.set(option, { x: 0, y: 0 });
  });
}

function selectOption(choice) {
  clearSelectedOptions();

  const selected = options.find(
    (option) => option.dataset.pathChoice === choice,
  );

  if (!selected) return;

  selected.classList.add("is-selected");
}

function lockWinningCard(winningChoice) {
  const winningCard = options.find(
    (option) => option.dataset.pathChoice === winningChoice,
  );
  if (!winningCard) return;

  gsap.killTweensOf(winningCard);
  winningCard.classList.add("is-winner");
  gsap.set(winningCard, { x: 0, y: 0, opacity: 1, clearProps: "filter" });
}

function getLosingForkElements(winningChoice) {
  if (winningChoice === "subscribe") {
    return { branch: right, dot: dots[1] };
  }

  return { branch: left, dot: dots[0] };
}

function clearDustEffect() {
  dustTimeline?.kill();
  dustTimeline = null;
  dustLayer?.remove();
  dustLayer = null;

  options.forEach((option) => {
    option.classList.remove("is-dissolving", "is-winner");
    gsap.set(option, { clearProps: "opacity,visibility,x,filter" });
  });

  if (left && right) {
    gsap.set([left, right, ...dots], { clearProps: "opacity,visibility" });
  }
}

function createDustParticle(rect, exitDirection) {
  const particle = document.createElement("span");
  const size = gsap.utils.random(2, 8, 1);
  // Start closer to the winning card, then drift away from it.
  const innerBias =
    exitDirection < 0
      ? 1 - Math.pow(Math.random(), 2.2)
      : Math.pow(Math.random(), 2.2);
  const localX = innerBias * rect.width;
  const localY = Math.random() * rect.height;
  const colors = ["#F4A261", "#e8924f", "#f0b07a", "#d98942", "#ffc896"];

  particle.className = "path-dust-particle";
  particle.style.left = `${rect.left + localX}px`;
  particle.style.top = `${rect.top + localY}px`;
  particle.style.width = `${size}px`;
  particle.style.height = `${gsap.utils.random(2, 7, 1)}px`;
  particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
  particle.style.opacity = "0";

  const edgeProgress =
    exitDirection < 0 ? 1 - localX / rect.width : localX / rect.width;

  return { particle, edgeProgress };
}

function dissolveLosingCard(winningChoice) {
  if (!isDesktop() || committedChoice === winningChoice) return;

  clearDustEffect();
  committedChoice = winningChoice;

  const losingCard = options.find(
    (option) => option.dataset.pathChoice !== winningChoice,
  );
  if (!losingCard) return;

  lockWinningCard(winningChoice);

  const { branch: losingBranch, dot: losingDot } =
    getLosingForkElements(winningChoice);
  const losingForkTargets = [losingBranch, losingDot].filter(Boolean);

  const rect = losingCard.getBoundingClientRect();
  // Negative = exit left, positive = exit right (away from center).
  const exitDirection = losingCard === options[0] ? -1 : 1;

  dustLayer = document.createElement("div");
  dustLayer.className = "path-dust-layer";
  dustLayer.setAttribute("aria-hidden", "true");
  document.body.appendChild(dustLayer);
  losingCard.classList.add("is-dissolving");

  const fragments = Array.from({ length: DUST_PARTICLE_COUNT }, () =>
    createDustParticle(rect, exitDirection),
  );
  fragments.forEach(({ particle }) => dustLayer.appendChild(particle));

  dustTimeline = gsap.timeline({
    onComplete: () => {
      gsap.set(losingCard, { visibility: "hidden" });
      if (losingForkTargets.length) {
        gsap.set(losingForkTargets, { visibility: "hidden" });
      }
      dustLayer?.remove();
      dustLayer = null;
      dustTimeline = null;
    },
  });

  if (reducedMotionQuery.matches) {
    dustTimeline.to(losingCard, { opacity: 0, duration: 0.3 });
    if (losingForkTargets.length) {
      dustTimeline.to(losingForkTargets, { opacity: 0, duration: 0.3 }, 0);
    }
    return;
  }

  dustTimeline.to(losingCard, {
    opacity: 0,
    x: exitDirection * 48,
    filter: "blur(3px)",
    duration: 1.25,
    ease: "power2.out",
  });

  if (losingForkTargets.length) {
    dustTimeline.to(
      losingForkTargets,
      {
        opacity: 0,
        duration: 1.25,
        ease: "power2.out",
      },
      0,
    );
  }

  fragments.forEach(({ particle, edgeProgress }) => {
    const delay = edgeProgress * 0.72 + Math.random() * 0.18;

    dustTimeline.fromTo(
      particle,
      {
        x: 0,
        y: 0,
        opacity: 0,
        scale: gsap.utils.random(0.4, 0.9),
        rotation: gsap.utils.random(-30, 30),
      },
      {
        x: exitDirection * gsap.utils.random(70, 180),
        y: gsap.utils.random(15, 70),
        opacity: 0,
        scale: gsap.utils.random(0.1, 0.55),
        rotation: gsap.utils.random(-180, 180),
        duration: gsap.utils.random(0.65, 1.3),
        ease: "power1.out",
        keyframes: [
          { opacity: 0.9, duration: 0.08 },
          { opacity: 0, duration: 0.92 },
        ],
      },
      delay,
    );
  });
}

function commitChoice(choice) {
  selectOption(choice);
  dissolveLosingCard(choice);
}

function snapAlongBranch(branch, fromProgress, toProgress, onComplete) {
  const proxy = { p: fromProgress };

  gsap.to(proxy, {
    p: toProgress,
    duration: 0.4,
    ease: "power2.out",
    onUpdate: () => {
      setHandlePoint(pointAtProgress(branch, proxy.p));
    },
    onComplete: () => {
      currentProgress = toProgress;
      onComplete?.();
    },
  });
}

function resolveChoice() {
  if (!branches) return;

  const branch = branches[activeBranch];

  if (currentProgress >= COMMIT_THRESHOLD) {
    snapAlongBranch(branch, currentProgress, 1, () =>
      commitChoice(branch.choice),
    );
  } else {
    snapAlongBranch(branch, currentProgress, 0, clearSelectedOptions);
  }
}

function moveHeartToChoice(choice) {
  if (!branches || !isDesktop()) return;

  const branchKey = choice === "subscribe" ? "left" : "right";
  const branch = branches[branchKey];
  if (!branch) return;

  activeBranch = branchKey;
  snapAlongBranch(branch, currentProgress, 1, () => {
    commitChoice(choice);
  });
}

function onPointerMove(event) {
  if (!isDragging || !isInteractive || !branches || !isDesktop()) return;

  const point = getSvgPoint(event);
  if (!point) return;

  const nearestLeft = closestOnBranch(branches.left, point);
  const nearestRight = closestOnBranch(branches.right, point);
  const nearest =
    nearestLeft.dist <= nearestRight.dist
      ? { branch: "left", ...nearestLeft }
      : { branch: "right", ...nearestRight };

  activeBranch = nearest.branch;
  currentProgress = nearest.progress;
  setHandlePoint(nearest);
}

function onPointerUp() {
  if (!isDragging) return;

  isDragging = false;
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);

  resolveChoice();
}

function onPointerDown(event) {
  if (!isInteractive || !isDesktop()) return;

  isDragging = true;
  event.preventDefault();
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
}

function onOptionActivate(choice) {
  selectOption(choice);

  // On desktop, also send the heart to that endpoint when the card is tapped.
  if (isDesktop() && branches && isInteractive) {
    moveHeartToChoice(choice);
  }
}

function setupCardTaps() {
  options.forEach((option) => {
    const choice = option.dataset.pathChoice;
    if (!choice) return;

    option.addEventListener("click", (event) => {
      event.preventDefault();
      onOptionActivate(choice);
    });

    option.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onOptionActivate(choice);
      }
    });
  });
}

function animateCardsIn() {
  if (reducedMotionQuery.matches) {
    gsap.set(options, { opacity: 1, y: 0 });
    return;
  }

  gsap.set(options, { opacity: 0, y: 28 });

  gsap.to(options, {
    opacity: 1,
    y: 0,
    duration: 0.65,
    ease: "power2.out",
    stagger: 0.12,
    scrollTrigger: {
      trigger: section,
      start: "top 70%",
      once: true,
    },
  });
}

function setupDesktopFork() {
  if (
    !svg ||
    !stem ||
    !left ||
    !right ||
    !handle ||
    reducedMotionQuery.matches ||
    desktopReady
  ) {
    return;
  }

  // Fork is display:none on mobile — only sample paths once it's visible.
  if (!isDesktop()) return;

  branches = {
    left: buildBranch(left, "subscribe"),
    right: buildBranch(right, "build"),
  };

  const forkStart = left.getPointAtLength(0);

  gsap.set([stem, left, right], { drawSVG: "0%" });
  gsap.set(dots, { scale: 0, transformOrigin: "50% 50%" });
  gsap.set(handle, {
    x: forkStart.x,
    y: forkStart.y,
    scale: 0,
    opacity: 0,
    transformOrigin: "50% 50%",
  });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: "top 65%",
      once: true,
    },
  });

  tl.to(stem, {
    drawSVG: "100%",
    duration: 0.7,
    ease: "power2.inOut",
  })
    .to(
      [left, right],
      {
        drawSVG: "100%",
        duration: 0.8,
        ease: "power2.out",
        stagger: 0.08,
      },
      "-=0.15",
    )
    .to(
      dots,
      {
        scale: 1,
        duration: 0.35,
        ease: "back.out(2)",
        stagger: 0.08,
      },
      "-=0.35",
    )
    .to(
      handle,
      {
        scale: 1,
        opacity: 1,
        duration: 0.35,
        ease: "back.out(2)",
      },
      "-=0.25",
    )
    .add(() => {
      isInteractive = true;
    });

  handle.addEventListener("pointerdown", onPointerDown);
  desktopReady = true;
}

if (section && options.length) {
  setupCardTaps();

  // Cards animate in on both breakpoints.
  animateCardsIn();

  // Desktop fork only when the layout is wide enough for side-by-side cards.
  if (isDesktop()) {
    setupDesktopFork();
  }

  // If the user rotates/resizes into desktop, wire the fork once.
  desktopQuery.addEventListener("change", (event) => {
    if (event.matches) {
      setupDesktopFork();
      ScrollTrigger.refresh();
    }
  });
}
