const btn = document.querySelector(".mobile-menu-button");
const menu = document.querySelector(".mobile-menu");
const hamburgerIcon = document.querySelector(".hamburger-icon");
const closeIcon = document.querySelector(".close-icon");

if (btn && menu && hamburgerIcon && closeIcon) {
  btn.addEventListener("click", () => {
    const isHidden = menu.classList.contains("hidden");

    if (isHidden) {
      menu.classList.remove("hidden");
      menu.offsetHeight; // Force reflow
      menu.classList.remove("scale-95", "opacity-0");
      menu.classList.add("scale-100", "opacity-100");
    } else {
      menu.classList.add("scale-95", "opacity-0");
      menu.classList.remove("scale-100", "opacity-100");
      setTimeout(() => {
        menu.classList.add("hidden");
      }, 500);
    }

    hamburgerIcon.classList.toggle("hidden");
    closeIcon.classList.toggle("hidden");
  });
}
