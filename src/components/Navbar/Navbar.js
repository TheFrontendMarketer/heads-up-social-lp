const btn = document.querySelector(".mobile-menu-button");
const menu = document.querySelector(".mobile-menu");
const hamburgerIcon = document.querySelector(".hamburger-icon");
const closeIcon = document.querySelector(".close-icon");

if (btn && menu && hamburgerIcon && closeIcon) {
  let closeTimer = null;

  function isOpen() {
    return !menu.classList.contains("hidden");
  }

  function setIconState(open) {
    hamburgerIcon.classList.toggle("hidden", open);
    closeIcon.classList.toggle("hidden", !open);
  }

  function setMenuAria(open) {
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  function openMenu() {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }

    menu.classList.remove("hidden");
    menu.offsetHeight; // Force reflow
    menu.classList.remove("scale-95", "opacity-0");
    menu.classList.add("scale-100", "opacity-100");
    setIconState(true);
    setMenuAria(true);
  }

  function closeMenu() {
    if (!isOpen()) return;

    menu.classList.add("scale-95", "opacity-0");
    menu.classList.remove("scale-100", "opacity-100");
    setIconState(false);
    setMenuAria(false);

    closeTimer = setTimeout(() => {
      menu.classList.add("hidden");
      closeTimer = null;
    }, 500);
  }

  function toggleMenu() {
    if (isOpen()) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  btn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleMenu();
  });

  // Outside tap/click closes the menu.
  document.addEventListener("pointerdown", (event) => {
    if (!isOpen()) return;

    const target = event.target;
    if (btn.contains(target) || menu.contains(target)) return;

    closeMenu();
  });

  // Tapping a nav link should close the menu too.
  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => closeMenu());
  });
}
