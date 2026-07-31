import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { BoxRenderable, MouseButton, engine, type CliRenderer } from "@opentui/core"
import { createTestRenderer, type MockMouse } from "@opentui/core/testing"
import { ToasterRenderable, ToastStore, createToast } from "opentui-toast"

let renderer: CliRenderer
let renderOnce: () => Promise<void>
let mockMouse: MockMouse

beforeEach(async () => {
  ;({ renderer, renderOnce, mockMouse } = await createTestRenderer({ width: 110, height: 34 }))
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

    const front = host.getToast(5)!
    const second = host.getToast(4)!
    const third = host.getToast(3)!
    expect([front.translateX, front.translateY, front.width]).toEqual([67, 30, 42])
    expect([second.translateX, second.translateY, second.width]).toEqual([68, 29, 40])
    expect([third.translateX, third.translateY, third.width]).toEqual([69, 28, 38])

    await mockMouse.moveTo(front.screenX + 2, front.screenY + 1)
    await renderOnce()
    await renderOnce()
    expect([second.translateX, second.translateY, second.width]).toEqual([67, 26, 42])
    expect([third.translateX, third.translateY, third.width]).toEqual([67, 22, 42])

    // Crossing the empty row between expanded cards keeps the stack fanned out.
    await mockMouse.moveTo(front.screenX + 2, front.screenY - 1)
    await Promise.resolve()
    await renderOnce()
    await renderOnce()
    expect(second.translateY).toBe(26)

    await mockMouse.moveTo(0, 0)
    await Promise.resolve()
    await renderOnce()
    await renderOnce()
    expect([second.translateX, second.translateY, second.width]).toEqual([68, 29, 40])
  })
})
