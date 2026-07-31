import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { BoxRenderable, engine, type CliRenderer } from "@opentui/core"
import { createTestRenderer } from "@opentui/core/testing"
import { animateSceneExit } from "./scene-transition"

let renderer: CliRenderer

beforeEach(async () => {
  ;({ renderer } = await createTestRenderer({ width: 80, height: 24 }))
  engine.attach(renderer)
})

afterEach(() => {
  renderer.destroy()
  engine.clear()
  engine.detach()
})

describe("scene exit", () => {
  test("fades without crossing a terminal-cell boundary", () => {
    const root = new BoxRenderable(renderer, { width: "100%", height: "100%" })
    renderer.root.add(root)
    const controls = animateSceneExit(root, 420)

    engine.update(1)
    expect(root.translateY).toBe(0)
    engine.update(419)

    expect(root.translateY).toBe(0)
    expect(root.opacity).toBeCloseTo(0)
    controls.stop()
  })
})
