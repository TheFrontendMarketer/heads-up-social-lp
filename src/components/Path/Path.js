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
const COMMIT_THRESHOLD = 0.6;
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
  options.forEach((option) => option.classList.remove("is-selected"));
}

function selectOption(choice) {
  clearSelectedOptions();

  const selected = options.find(
    (option) => option.dataset.pathChoice === choice,
  );

  if (!selected) return;

  selected.classList.add("is-selected");
  gsap.fromTo(
    selected,
    { y: 0 },
    { y: -6, duration: 0.25, ease: "power2.out", overwrite: true },
  );
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
      selectOption(branch.choice),
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
    selectOption(choice);
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

  gsap.set([stem, left, right], { drawSVG: "0%" });
  gsap.set(dots, { scale: 0, transformOrigin: "50% 50%" });
  gsap.set(handle, {
    x: branches.left.samples[0].x,
    y: branches.left.samples[0].y,
    scale: 0,
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
