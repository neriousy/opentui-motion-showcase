import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { BoxRenderable, MouseButton, engine, type CliRenderer } from "@opentui/core"
import { createTestRenderer, type MockMouse } from "@opentui/core/testing"
import { ToasterRenderable, ToastStore, createToast } from "opentui-toast"

let renderer: CliRenderer
let renderOnce: () => Promise<void>
let mockMouse: MockMouse

beforeEach(async () => {
  ;({ renderer, renderOnce, mockMouse } = await createTestRenderer({ width: 80, height: 24 }))
  engine.attach(renderer)
})

afterEach(() => {
  renderer.destroy()
  engine.clear()
  engine.detach()
})

describe("packed toast showcase integration", () => {
  test("the trigger can be clicked repeatedly while the host keeps a bounded visible stack", async () => {
    const store = new ToastStore()
    const toast = createToast(store)
    const trigger = new BoxRenderable(renderer, {
      position: "absolute",
      left: 2,
      top: 2,
      width: 16,
      height: 3,
      onMouseDown: (event) => {
        if (event.button === MouseButton.LEFT) toast.success("Clicked")
      },
    })
    const host = new ToasterRenderable(renderer, {
      store,
      visibleToasts: 3,
      duration: Infinity,
      reducedMotion: true,
    })
    renderer.root.add(trigger)
    renderer.root.add(host)
    await renderOnce()

    for (let index = 0; index < 5; index++) await mockMouse.pressDown(4, 3)
    await renderOnce()
    await renderOnce()

    expect(toast.getToasts()).toHaveLength(5)
    expect(toast.getToasts().map((record) => record.id)).toEqual([5, 4, 3, 2, 1])
    expect(host.getVisibleToastIds()).toEqual([5, 4, 3])
  })
})
