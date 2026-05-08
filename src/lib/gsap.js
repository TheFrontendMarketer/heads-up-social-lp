// Central GSAP entry: imports gsap + every plugin and registers them once.
// Import this from any client-side script: `import { gsap } from '../lib/gsap.js'`
import { gsap } from "gsap";

import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { Observer } from "gsap/Observer";

import { SplitText } from "gsap/SplitText";
import { Draggable } from "gsap/Draggable";
import { Flip } from "gsap/Flip";

import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { MotionPathHelper } from "gsap/MotionPathHelper";

import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { InertiaPlugin } from "gsap/InertiaPlugin";

import { Physics2DPlugin } from "gsap/Physics2DPlugin";
import { PhysicsPropsPlugin } from "gsap/PhysicsPropsPlugin";

import { CustomEase } from "gsap/CustomEase";
import { CustomBounce } from "gsap/CustomBounce";
import { CustomWiggle } from "gsap/CustomWiggle";

import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";
import { TextPlugin } from "gsap/TextPlugin";

import { PixiPlugin } from "gsap/PixiPlugin";
import { EaselPlugin } from "gsap/EaselPlugin";
import { CSSRulePlugin } from "gsap/CSSRulePlugin";
import { GSDevTools } from "gsap/GSDevTools";
import { EasePack } from "gsap/EasePack";

gsap.registerPlugin(
  ScrollTrigger,
  ScrollSmoother,
  ScrollToPlugin,
  Observer,
  SplitText,
  Draggable,
  Flip,
  MotionPathPlugin,
  MotionPathHelper,
  DrawSVGPlugin,
  MorphSVGPlugin,
  InertiaPlugin,
  Physics2DPlugin,
  PhysicsPropsPlugin,
  CustomEase,
  CustomBounce,
  CustomWiggle,
  ScrambleTextPlugin,
  TextPlugin,
  PixiPlugin,
  EaselPlugin,
  CSSRulePlugin,
  GSDevTools,
  EasePack
);

export {
  gsap,
  ScrollTrigger,
  ScrollSmoother,
  ScrollToPlugin,
  Observer,
  SplitText,
  Draggable,
  Flip,
  MotionPathPlugin,
  MotionPathHelper,
  DrawSVGPlugin,
  MorphSVGPlugin,
  InertiaPlugin,
  Physics2DPlugin,
  PhysicsPropsPlugin,
  CustomEase,
  CustomBounce,
  CustomWiggle,
  ScrambleTextPlugin,
  TextPlugin,
  PixiPlugin,
  EaselPlugin,
  CSSRulePlugin,
  GSDevTools,
  EasePack,
};
