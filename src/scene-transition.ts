import type { BoxRenderable } from "@opentui/core"
import { animate, type MotionPlaybackControls } from "opentui-motion"

export function animateSceneExit(root: BoxRenderable, duration: number): MotionPlaybackControls {
  return animate(root, { opacity: 0 }, { duration, ease: "inOutSine" })
}
