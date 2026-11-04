import { describe, expect, it } from "vitest"
import { citedNumbers, formatTimestamp, linkCitations, stripCitations } from "@/lib/citations"
import type { Source } from "@/lib/query-stream"

const src = (n: number): Source => ({
  n, videoId: "v", title: "t", channel: "c", startSeconds: 1, url: `u${n}`, text: "",
})
const six = [1, 2, 3, 4, 5, 6].map(src)

describe("citedNumbers", () => {
  it("returns valid numbers in first-use order without duplicates", () => {
    expect(citedNumbers("a [3] b [1][3] c [9]", six)).toEqual([3, 1])
  })
  it("ignores Markdown links and empty sources", () => {
    expect(citedNumbers("see [2](https://y)", six)).toEqual([])
    expect(citedNumbers("a [1]", [])).toEqual([])
  })
})

describe("linkCitations", () => {
  it("links bare valid markers only", () => {
    expect(linkCitations("x [1][3] y [7] see [docs](https://x) and [2](https://y)", six))
      .toBe("x [1](#cite-1)[3](#cite-3) y [7] see [docs](https://x) and [2](https://y)")
  })
})

describe("stripCitations", () => {
  it("removes markers and tidies spacing", () => {
    expect(stripCitations("Good [1]. Also [2][3] here.")).toBe("Good. Also here.")
    expect(stripCitations("see [docs](https://x)")).toBe("see [docs](https://x)")
  })
})

describe("formatTimestamp", () => {
  it("formats minutes and hours", () => {
    expect(formatTimestamp(0)).toBe("0:00")
    expect(formatTimestamp(272)).toBe("4:32")
    expect(formatTimestamp(3725)).toBe("1:02:05")
  })
})

describe("code is never treated as citations", () => {
  const text = "Use `arr[1]` here [2].\n\n```python\nx = items[3]\n```\nSee [1]."
  it("linkCitations leaves inline and fenced code untouched", () => {
    expect(linkCitations(text, six)).toBe(
      "Use `arr[1]` here [2](#cite-2).\n\n```python\nx = items[3]\n```\nSee [1](#cite-1).",
    )
  })
  it("citedNumbers ignores numbers inside code", () => {
    expect(citedNumbers(text, six)).toEqual([2, 1])
  })
})
