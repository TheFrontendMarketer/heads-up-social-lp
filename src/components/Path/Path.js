import { gsap, ScrollTrigger, DrawSVGPlugin } from "../../lib/gsap.js";

const section = document.querySelector("[data-path-section]");
const stage = document.querySelector("[data-path-stage]");
const chooseEl = document.querySelector("[data-path-choose]");
const introEl = document.querySelector("[data-path-intro]");
const forkEl = document.querySelector("[data-path-fork]");
const finaleEl = document.querySelector("[data-path-finale]");
const backBtn = document.querySelector("[data-path-back]");
const svg = document.querySelector("[data-path-svg]");
const stem = document.querySelector("[data-path-stem]");
const left = document.querySelector("[data-path-left]");
const right = document.querySelector("[data-path-right]");
const options = gsap.utils.toArray("[data-path-option]");
const revealPanels = gsap.utils.toArray("[data-path-reveal]");
const dots = gsap.utils.toArray("[data-path-dot]");
const handle = document.querySelector("[data-path-handle]");

const SAMPLE_COUNT = 240;
const COMMIT_THRESHOLD = 0.98;
const DUST_PARTICLE_COUNT = 120;
/* Timing tune — restore Path.js.before-timing-tune if you dislike this.
 * Previous: card/branch 1.25s, particle delay 0.72+0.18, particle dur 0.65–1.3,
 * zoom 0.85s, zoom only after dissolve onComplete (felt like a dead pause).
 */
const DISSOLVE_DURATION = 0.9;
const ZOOM_START_AT = 0.75; // overlap: start zoom before particles finish
const ZOOM_DURATION = 0.65;
const CARD_SHADOW_DEFAULT = "8px 8px 0 0 #18181b";
const CARD_SHADOW_SELECTED =
  "inset 0 0 0 1px rgba(69, 123, 157, 0.4), 0 0 28px rgba(69, 123, 157, 0.28)";
const CARD_BG_DEFAULT = "#09090b";
const CARD_BG_SELECTED = "rgba(69, 123, 157, 0.12)";
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
let sequenceRunning = false;
let dustTimeline = null;
let zoomTimeline = null;
let dustLayer = null;
let zoomLayer = null;
let gitlabPeekTween = null;
let gitlabPeekDelay = null;

function isDesktop() {
  return desktopQuery.matches;
}

function getOption(choice) {
  return options.find((option) => option.dataset.pathChoice === choice);
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
    gsap.to(option, {
      x: 0,
      y: 0,
      backgroundColor: CARD_BG_DEFAULT,
      boxShadow: CARD_SHADOW_DEFAULT,
      borderColor: "#27272a",
      duration: 0.2,
      ease: "power2.out",
      overwrite: "auto",
    });
  });
}

function selectOption(choice) {
  clearSelectedOptions();

  const selected = getOption(choice);
  if (!selected) return;

  selected.classList.add("is-selected");
  gsap.to(selected, {
    backgroundColor: CARD_BG_SELECTED,
    boxShadow: CARD_SHADOW_SELECTED,
    borderColor: "rgba(69, 123, 157, 0.35)",
    duration: 0.22,
    ease: "power2.out",
    overwrite: "auto",
  });
}

function lockWinningCard(winningChoice) {
  const winningCard = getOption(winningChoice);
  if (!winningCard) return;

  gsap.killTweensOf(winningCard);
  winningCard.classList.add("is-winner");
  gsap.set(winningCard, {
    x: 0,
    y: 0,
    opacity: 1,
    backgroundColor: CARD_BG_SELECTED,
    boxShadow: CARD_SHADOW_SELECTED,
    borderColor: "rgba(69, 123, 157, 0.35)",
    clearProps: "filter",
  });
}

function getLosingForkElements(winningChoice) {
  if (winningChoice === "subscribe") {
    return { branch: right, dot: dots[1] };
  }

  return { branch: left, dot: dots[0] };
}

function getWinningForkElements(winningChoice) {
  if (winningChoice === "subscribe") {
    return { branch: left, dot: dots[0] };
  }

  return { branch: right, dot: dots[1] };
}

function removeZoomLayer() {
  zoomLayer?.remove();
  zoomLayer = null;
}

function stopGitlabPeek() {
  gitlabPeekTween?.kill();
  gitlabPeekDelay?.kill();
  gitlabPeekTween = null;
  gitlabPeekDelay = null;

  const logo = document.querySelector("[data-gitlab-peek-logo]");
  if (logo) {
    gsap.set(logo, {
      xPercent: -50,
      yPercent: -50,
      x: 0,
      y: 0,
      rotation: 0,
      scale: 0.85,
      opacity: 0,
    });
  }
}

function startGitlabPeek() {
  stopGitlabPeek();
  if (reducedMotionQuery.matches) return;

  const wrap = document.querySelector("[data-gitlab-peek]");
  const logo = document.querySelector("[data-gitlab-peek-logo]");
  const btn = document.querySelector("[data-gitlab-peek-btn]");
  if (!wrap || !logo || !btn) return;

  // Center behind the button; GSAP owns transform (no CSS translate fight).
  gsap.set(logo, {
    xPercent: -50,
    yPercent: -50,
    x: 0,
    y: 0,
    rotation: 0,
    scale: 0.85,
    opacity: 0,
  });

  const peekOnce = () => {
    // Distances must clear the button bounds — keep peeks close to the edge.
    const btnRect = btn.getBoundingClientRect();
    const logoSize = logo.getBoundingClientRect().width || 56;
    const peekPast = logoSize * 0.28;
    const side = gsap.utils.random(["top", "bottom", "left", "right"]);

    let x = 0;
    let y = 0;
    // Orient the logo toward the direction it peeks from.
    let rotation = 0;
    if (side === "top") {
      y = -(btnRect.height / 2 + peekPast);
      x = gsap.utils.random(-btnRect.width * 0.15, btnRect.width * 0.15);
      rotation = 0;
    } else if (side === "bottom") {
      y = btnRect.height / 2 + peekPast;
      x = gsap.utils.random(-btnRect.width * 0.15, btnRect.width * 0.15);
      rotation = 180;
    } else if (side === "left") {
      x = -(btnRect.width / 2 + peekPast);
      y = gsap.utils.random(-btnRect.height * 0.2, btnRect.height * 0.2);
      rotation = -90;
    } else {
      x = btnRect.width / 2 + peekPast;
      y = gsap.utils.random(-btnRect.height * 0.2, btnRect.height * 0.2);
      rotation = 90;
    }

    gitlabPeekTween?.kill();
    gitlabPeekTween = gsap
      .timeline({
        onComplete: () => {
          gitlabPeekDelay?.kill();
          gitlabPeekDelay = gsap.delayedCall(
            gsap.utils.random(4.5, 8),
            peekOnce,
          );
        },
      })
      .to(logo, {
        x,
        y,
        rotation,
        scale: 1,
        opacity: 1,
        duration: 0.75,
        ease: "power2.out",
      })
      .to(logo, {
        x: 0,
        y: 0,
        rotation,
        scale: 0.85,
        opacity: 0,
        duration: 0.65,
        ease: "power2.in",
        delay: gsap.utils.random(0.8, 1.4),
      });
  };

  // Wait for the finale fade-in so layout size is correct.
  gitlabPeekDelay = gsap.delayedCall(1.1, peekOnce);
}

function showFinale(choice, { animate = true } = {}) {
  revealPanels.forEach((panel) => {
    panel.hidden = panel.dataset.pathReveal !== choice;
  });

  if (finaleEl) finaleEl.hidden = false;
  stage?.classList.add("is-finale");

  const reveal = revealPanels.find((panel) => panel.dataset.pathReveal === choice);
  if (!reveal) return;

  if (choice === "build") {
    startGitlabPeek();
  } else {
    stopGitlabPeek();
  }

  if (animate) {
    gsap.fromTo(
      reveal,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
    );
  } else {
    gsap.set(reveal, { opacity: 0, y: 8 });
  }
}

function hideFinale() {
  stopGitlabPeek();
  resetSubscribeForm();
  revealPanels.forEach((panel) => {
    panel.hidden = true;
    gsap.set(panel, { clearProps: "opacity,transform" });
  });
  if (finaleEl) finaleEl.hidden = true;
  stage?.classList.remove("is-finale");
}

function clearSequenceArtifacts() {
  dustTimeline?.kill();
  zoomTimeline?.kill();
  dustTimeline = null;
  zoomTimeline = null;
  dustLayer?.remove();
  dustLayer = null;
  removeZoomLayer();

  options.forEach((option) => {
    option.classList.remove("is-dissolving", "is-winner", "is-selected");
    gsap.set(option, {
      opacity: 1,
      visibility: "visible",
      x: 0,
      y: 0,
      backgroundColor: CARD_BG_DEFAULT,
      boxShadow: CARD_SHADOW_DEFAULT,
      borderColor: "#27272a",
      clearProps: "filter",
    });
  });

  if (left && right) {
    gsap.set([left, right, ...dots], { clearProps: "opacity,visibility" });
  }

  if (stem && handle) {
    gsap.set([stem, handle, forkEl, introEl, chooseEl].filter(Boolean), {
      clearProps: "opacity,visibility",
    });
  }

  hideFinale();
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
  particle.style.backgroundColor =
    colors[Math.floor(Math.random() * colors.length)];
  particle.style.opacity = "0";

  const edgeProgress =
    exitDirection < 0 ? 1 - localX / rect.width : localX / rect.width;

  return { particle, edgeProgress };
}

function zoomThroughWinner(winningChoice) {
  const winningCard = getOption(winningChoice);
  if (!winningCard) {
    showFinale(winningChoice);
    sequenceRunning = false;
    return;
  }

  const { branch: winningBranch, dot: winningDot } =
    getWinningForkElements(winningChoice);
  const forkFadeTargets = [stem, winningBranch, winningDot, handle, introEl]
    .filter(Boolean);

  const rect = winningCard.getBoundingClientRect();

  removeZoomLayer();
  zoomLayer = document.createElement("div");
  zoomLayer.className = "path-zoom-layer";
  zoomLayer.setAttribute("aria-hidden", "true");
  zoomLayer.innerHTML = winningCard.outerHTML;
  document.body.appendChild(zoomLayer);

  const clone = zoomLayer.querySelector(".path-option");
  gsap.set(clone, {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    margin: 0,
    x: 0,
    y: 0,
    scale: 1,
    opacity: 1,
    filter: "blur(0px)",
    transformOrigin: "center center",
    borderColor: "rgba(69, 123, 157, 0.35)",
    boxShadow:
      "inset 0 0 0 1px rgba(69, 123, 157, 0.4), 0 0 28px rgba(69, 123, 157, 0.28)",
  });

  // Hide the real winner — only the zoom clone should be visible.
  gsap.set(winningCard, { visibility: "hidden", opacity: 0 });

  const scaleX = window.innerWidth / rect.width;
  const scaleY = window.innerHeight / rect.height;
  const scale = Math.max(scaleX, scaleY) * 1.12;

  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  const cardCenterX = rect.left + rect.width / 2;
  const cardCenterY = rect.top + rect.height / 2;

  zoomTimeline?.kill();
  zoomTimeline = gsap.timeline({
    onComplete: () => {
      removeZoomLayer();
      showFinale(winningChoice);
      sequenceRunning = false;
      zoomTimeline = null;
    },
  });

  // Fade remaining fork / heading while zoom starts.
  if (forkFadeTargets.length) {
    zoomTimeline.to(
      forkFadeTargets,
      {
        opacity: 0,
        duration: 0.45,
        ease: "power1.out",
      },
      0,
    );
  }

  zoomTimeline.to(
    clone,
    {
      x: centerX - cardCenterX,
      y: centerY - cardCenterY,
      scale,
      filter: "blur(2px)",
      duration: ZOOM_DURATION,
      ease: "power3.in",
    },
    0,
  );

  zoomTimeline.to(
    clone,
    {
      opacity: 0,
      duration: 0.28,
      ease: "power1.in",
    },
    "-=0.2",
  );
}

function dissolveLosingCard(winningChoice, onComplete) {
  const losingCard = getOption(
    winningChoice === "subscribe" ? "build" : "subscribe",
  );
  if (!losingCard) {
    onComplete?.();
    return;
  }

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

  dustTimeline?.kill();
  let zoomStarted = false;

  const startZoom = () => {
    if (zoomStarted) return;
    zoomStarted = true;
    // Keep leftover dust drifting; hide the lost card shell now.
    gsap.set(losingCard, { visibility: "hidden" });
    if (losingForkTargets.length) {
      gsap.set(losingForkTargets, { visibility: "hidden" });
    }
    onComplete?.();
  };

  dustTimeline = gsap.timeline({
    onComplete: () => {
      dustLayer?.remove();
      dustLayer = null;
      dustTimeline = null;
      // Safety: if overlap never fired (reduced motion / short timeline), still continue.
      startZoom();
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
    duration: DISSOLVE_DURATION,
    ease: "power2.out",
  });

  if (losingForkTargets.length) {
    dustTimeline.to(
      losingForkTargets,
      {
        opacity: 0,
        duration: DISSOLVE_DURATION,
        ease: "power2.out",
      },
      0,
    );
  }

  // Kick off zoom while dust is still finishing — removes the dead pause.
  dustTimeline.call(startZoom, null, ZOOM_START_AT);

  fragments.forEach(({ particle, edgeProgress }) => {
    const delay = edgeProgress * 0.4 + Math.random() * 0.12;

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
        duration: gsap.utils.random(0.5, 0.9),
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

function runFinaleDesktop(choice) {
  dissolveLosingCard(choice, () => {
    if (reducedMotionQuery.matches) {
      if (chooseEl) gsap.set(chooseEl, { opacity: 0 });
      showFinale(choice);
      sequenceRunning = false;
      return;
    }

    zoomThroughWinner(choice);
  });
}

function runFinaleMobile(choice) {
  selectOption(choice);
  committedChoice = choice;

  const reveal = revealPanels.find((panel) => panel.dataset.pathReveal === choice);

  zoomTimeline?.kill();
  zoomTimeline = gsap.timeline({
    onComplete: () => {
      sequenceRunning = false;
      zoomTimeline = null;
    },
  });

  zoomTimeline
    .to(chooseEl, {
      opacity: 0,
      duration: 0.4,
      ease: "power1.in",
    })
    .add(() => {
      showFinale(choice, { animate: false });
    })
    .to(reveal, {
      opacity: 1,
      y: 0,
      duration: 0.4,
      ease: "power1.out",
    });
}

function commitChoice(choice) {
  if (sequenceRunning || stage?.classList.contains("is-finale")) return;
  if (committedChoice === choice) return;

  sequenceRunning = true;
  committedChoice = choice;
  selectOption(choice);
  isInteractive = false;

  if (isDesktop()) {
    runFinaleDesktop(choice);
  } else {
    runFinaleMobile(choice);
  }
}

function resetPath() {
  clearSequenceArtifacts();
  committedChoice = null;
  sequenceRunning = false;
  activeBranch = "left";
  currentProgress = 0;

  if (isDesktop() && left && handle) {
    const forkStart = left.getPointAtLength(0);
    gsap.set(handle, {
      x: forkStart.x,
      y: forkStart.y,
      scale: 1,
      opacity: 1,
      transformOrigin: "50% 50%",
    });
    gsap.set([stem, left, right], { drawSVG: "100%", opacity: 1 });
    gsap.set(dots, { scale: 1, opacity: 1, visibility: "visible" });
    isInteractive = true;
  }

  if (chooseEl) gsap.set(chooseEl, { clearProps: "opacity" });
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
  if (!branches || sequenceRunning) return;

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
  if (!branches || !isDesktop() || sequenceRunning) return;

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
  if (!isInteractive || !isDesktop() || sequenceRunning) return;

  isDragging = true;
  event.preventDefault();
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
}

function onOptionActivate(choice) {
  if (sequenceRunning || stage?.classList.contains("is-finale")) return;

  if (isDesktop() && branches && isInteractive) {
    selectOption(choice);
    moveHeartToChoice(choice);
    return;
  }

  // Mobile: tap commits with a simple fade.
  commitChoice(choice);
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

function setupBackButton() {
  backBtn?.addEventListener("click", resetPath);
}

function resetSubscribeForm() {
  const form = document.querySelector("[data-path-subscribe-form]");
  const success = document.querySelector("[data-path-subscribe-success]");
  if (!form) return;

  form.reset();
  form.classList.remove("is-submitted");
  form.hidden = false;
  gsap.set(form, { clearProps: "opacity" });

  if (success) {
    success.hidden = true;
    gsap.set(success, { clearProps: "opacity" });
  }
}

function setupSubscribeForm() {
  const form = document.querySelector("[data-path-subscribe-form]");
  const success = document.querySelector("[data-path-subscribe-success]");
  if (!form || !success) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    form.classList.add("is-submitted");
    form.hidden = true;
    success.hidden = false;

    gsap.fromTo(
      success,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" },
    );
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
  setupBackButton();
  setupSubscribeForm();

  // Cards animate in on both breakpoints.
  animateCardsIn();

  // Desktop fork only when the layout is wide enough for side-by-side cards.
  if (isDesktop()) {
    setupDesktopFork();
  }

  // If the user rotates/resizes into desktop, wire the fork once.
  desktopQuery.addEventListener("change", (event) => {
    if (sequenceRunning || stage?.classList.contains("is-finale")) {
      resetPath();
    }

    if (event.matches) {
      setupDesktopFork();
      ScrollTrigger.refresh();
    }
  });
}
