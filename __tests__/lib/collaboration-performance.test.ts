import {
  markCollaborationPerformance,
  measureCollaborationPerformance,
  observeCollaborationLoading,
} from "@/lib/collaboration/client-performance"

describe("collaboration browser performance marks", () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window")
    performance.clearMarks("collaboration.entry.click")
    performance.clearMeasures("collaboration.diff.parse")
    performance.clearMarks("collaboration.loading.commit")
    performance.clearMarks("collaboration.loading.paint-proxy")
    Reflect.deleteProperty(globalThis, "document")
    Reflect.deleteProperty(globalThis, "MutationObserver")
    Reflect.deleteProperty(globalThis, "requestAnimationFrame")
  })

  it("does not record marks when measurement is disabled", () => {
    expect(measureCollaborationPerformance("diff.parse", () => 42)).toBe(42)
    markCollaborationPerformance("entry.click")
    expect(performance.getEntriesByName("collaboration.entry.click")).toHaveLength(0)
    expect(performance.getEntriesByName("collaboration.diff.parse")).toHaveLength(0)
  })

  it("records only named timings after session opt-in", () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { sessionStorage: { getItem: () => "1" } },
    })
    markCollaborationPerformance("entry.click")
    expect(measureCollaborationPerformance("diff.parse", () => 42)).toBe(42)
    expect(performance.getEntriesByName("collaboration.entry.click", "mark")).toHaveLength(1)
    expect(performance.getEntriesByName("collaboration.diff.parse", "measure")).toHaveLength(1)
  })

  it("observes the loading boundary only after session opt-in", () => {
    let notify = () => {}
    const disconnect = jest.fn()
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { sessionStorage: { getItem: () => "1" } },
    })
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { body: {}, querySelector: () => ({ isConnected: true }) },
    })
    Object.defineProperty(globalThis, "MutationObserver", {
      configurable: true,
      value: class {
        constructor(callback: () => void) { notify = callback }
        observe() {}
        disconnect = disconnect
      },
    })
    Object.defineProperty(globalThis, "requestAnimationFrame", {
      configurable: true,
      value: (callback: () => void) => { callback(); return 1 },
    })

    observeCollaborationLoading()
    notify()

    expect(disconnect).toHaveBeenCalledTimes(1)
    expect(performance.getEntriesByName("collaboration.loading.commit", "mark")).toHaveLength(1)
    expect(performance.getEntriesByName("collaboration.loading.paint-proxy", "mark")).toHaveLength(1)
  })
})
