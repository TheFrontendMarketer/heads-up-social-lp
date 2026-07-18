<img width="200" height="200" alt="Image" src="https://github.com/user-attachments/assets/4f565c96-333c-4c85-b64d-4bad06d390f6" />

This is my take on the Webflow and GSAP Hackathon challenge. Below is the official README from their repo. Hope ya'll like it! 



# GSAP, Astro & Webflow Cloud

Astro app template with [GSAP](https://gsap.com/) loaded and ready to use, set up for Webflow Cloud. All GSAP plugins — including the formerly premium Club GSAP plugins, which are now 100% free for everyone (including commercial use) thanks to Webflow — are registered and available. Just import what you need from `src/lib/gsap.js`.

[![Deploy to Webflow](https://webflow.com/img/deploy-dark.svg)](https://webflow.com/dashboard/cloud/deploy?repo=https://github.com/webflow-examples/astro-gsap)

[GSAP Cheatsheet 👀](https://gsap.com/cheatsheet/)

## 🎬 GSAP basics

GSAP animates anything JavaScript can touch — CSS, SVG, canvas, WebGL, custom JS objects. The core API has three main methods:

```js
import { gsap } from "../../lib/gsap.js";

gsap.to(".box",   { x: 200, rotation: 45, duration: 1 });   // animate TO these values
gsap.from(".box", { opacity: 0, y: 50, duration: 1 });      // animate FROM these values
gsap.fromTo(".box", { x: 0 }, { x: 200, duration: 1 });     // explicit start and end
```

Chain tweens together on a **timeline** to sequence animations:

```js
const tl = gsap.timeline({ defaults: { duration: 0.6, ease: "power2.out" } });
tl.to(".a", { x: 100 })
  .to(".b", { y: 100 }, "<")   // "<" starts at the same time as the previous tween
  .to(".c", { rotation: 360 }, "-=0.3"); // overlap by 0.3s
```

## 🔌 Registered plugins

All of these are imported and registered in `src/lib/gsap.js`:

| Plugin              | What it does                                          |
| :------------------ | :---------------------------------------------------- |
| `ScrollTrigger`     | Trigger and scrub animations based on scroll position |
| `ScrollSmoother`    | Smooth, native-feeling scroll with parallax effects   |
| `ScrollToPlugin`    | Animate the scroll position of the window or element  |
| `Observer`          | Detect scroll/touch/pointer/wheel without scrollbars  |
| `SplitText`         | Split text into chars/words/lines for animation       |
| `Draggable`         | Make any element draggable, with throwing via inertia |
| `Flip`              | Animate between any two states (FLIP technique)       |
| `MotionPathPlugin`  | Animate elements along an SVG path or coordinates     |
| `MotionPathHelper`  | Interactive editor for motion paths (dev only)        |
| `DrawSVGPlugin`     | Animate SVG stroke drawing in/out                     |
| `MorphSVGPlugin`    | Morph one SVG shape into another                      |
| `InertiaPlugin`     | Velocity-based throwing/momentum animations           |
| `Physics2DPlugin`   | 2D physics: velocity, acceleration, gravity           |
| `PhysicsPropsPlugin`| Physics-driven animation of any property              |
| `CustomEase`        | Build your own easing curves                          |
| `CustomBounce`      | Configurable bounce easing                            |
| `CustomWiggle`      | Configurable wiggle easing                            |
| `ScrambleTextPlugin`| Scramble text into the final string                   |
| `TextPlugin`        | Animate text content character-by-character           |
| `PixiPlugin`        | Animate PIXI.js display objects                       |
| `EaselPlugin`       | Animate EaselJS display objects                       |
| `CSSRulePlugin`     | Animate CSS rules (e.g. `::before`, `::after`)        |
| `GSDevTools`        | Visual scrubber for animations (dev only)             |
| `EasePack`          | Extra eases: `SlowMo`, `RoughEase`, `ExpoScaleEase`   |

Import only what you use:

```js
import { gsap, ScrollTrigger, SplitText } from "../../lib/gsap.js";

const split = SplitText.create(".headline", { type: "chars" });
gsap.from(split.chars, {
  y: 50,
  opacity: 0,
  stagger: 0.03,
  scrollTrigger: { trigger: ".headline", start: "top 80%" },
});
```

## 🚀 Project Structure

```text
/
├── public/
├── src/
│   ├── components/
│   │   ├── Hero/
│   │   │   ├── Hero.astro    ← markup
│   │   │   ├── Hero.css      ← styles
│   │   │   └── Hero.js       ← GSAP animation
│   │   ├── Boxes/
│   │   ├── MotionPath/
│   │   ├── Physics/
│   │   └── ScrollPin/
│   ├── lib/
│   │   └── gsap.js           ← GSAP + plugin registration
│   ├── styles/
│   │   └── global.css        ← site-wide styles
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

## ✨ Adding a new component

Each component lives in its own folder under `src/components/` with a matching `.astro`, `.css`, and `.js` file. To add one:

1. Create the folder, e.g. `src/components/MyThing/`.
2. Add `MyThing.astro` — import the CSS in the frontmatter and the JS inside a `<script>` tag:

   ```astro
   ---
   import './MyThing.css';
   ---

   <div class="my-thing">Hello</div>

   <script>
     import './MyThing.js';
   </script>
   ```

3. Add `MyThing.css` for the component's styles (plain CSS, classes are global).
4. Add `MyThing.js` for the component's behavior. Import whatever GSAP plugins you need from the central entry:

   ```js
   import { gsap, ScrollTrigger } from "../../lib/gsap.js";

   gsap.to(".my-thing", { x: 100, scrollTrigger: ".my-thing" });
   ```

5. Use the component on a page:

   ```astro
   ---
   import MyThing from '../components/MyThing/MyThing.astro';
   ---

   <MyThing />
   ```

Site-wide styles belong in `src/styles/global.css`, which is imported once from `src/pages/index.astro`.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

- [GSAP Documentation](https://gsap.com/docs/)
- [Astro Documentation](https://docs.astro.build)
- [Webflow Cloud Documentation](https://developers.webflow.com/webflow-cloud/bring-your-own-app)
