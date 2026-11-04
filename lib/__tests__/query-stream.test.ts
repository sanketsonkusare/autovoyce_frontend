import { afterEach, describe, expect, it, vi } from "vitest"
import { createSseParser, QueryStreamError, streamQuery, type Source } from "@/lib/query-stream"

const enc = (s: string) => new TextEncoder().encode(s)

function sseResponse(parts: string[], status = 200): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const p of parts) controller.enqueue(enc(p))
      controller.close()
    },
  })
  return new Response(body, { status, headers: { "Content-Type": "text/event-stream" } })
}

function handlers() {
  return {
    onSources: vi.fn<(s: Source[]) => void>(),
    onToken: vi.fn<(t: string) => void>(),
    onDone: vi.fn<(a: string) => void>(),
    onError: vi.fn<(m: string) => void>(),
  }
}

afterEach(() => vi.unstubAllGlobals())

describe("createSseParser", () => {
  it("parses events split across chunks and ignores keepalives", () => {
    const got: unknown[] = []
    const p = createSseParser((d) => got.push(d))
    p.push(enc('data: {"type":"tok'))
    p.push(enc('en","text":"a"}\n\n: keepalive\n\ndata: {"type":"done","answer":"a"}\n\n'))
    p.end()
    expect(got).toEqual([{ type: "token", text: "a" }, { type: "done", answer: "a" }])
  })

  it("decodes UTF-8 split across chunks", () => {
    const bytes = enc('data: {"type":"token","text":"नमस्ते 👍"}\n\n')
    const got: any[] = []
    const p = createSseParser((d) => got.push(d))
    p.push(bytes.slice(0, 30))
    p.push(bytes.slice(30))
    p.end()
    expect(got[0].text).toBe("नमस्ते 👍")
  })

  it("handles CRLF line endings and a final event without trailing blank line", () => {
    const got: unknown[] = []
    const p = createSseParser((d) => got.push(d))
    p.push(enc('data: {"type":"token","text":"x"}\r\n\r\ndata: {"type":"done","answer":"x"}'))
    p.end()
    expect(got).toEqual([{ type: "token", text: "x" }, { type: "done", answer: "x" }])
  })
})

describe("streamQuery", () => {
  it("calls handlers in order and maps sources", async () => {
    const fetchMock = vi.fn().mockResolvedValue(sseResponse([
      'data: {"type":"sources","sources":[{"n":1,"video_id":"abcdefghijk","title":"T","channel":"C","start_seconds":272,"url":"https://www.youtube.com/watch?v=abcdefghijk&t=272s","text":"body"}]}\n\n',
      'data: {"type":"token","text":"Hi"}\n\n',
      'data: {"type":"done","answer":"Hi"}\n\n',
    ]))
    vi.stubGlobal("fetch", fetchMock)
    const h = handlers()
    await streamQuery({ sessionId: "sid", query: "q?", ...h })

    expect(h.onSources).toHaveBeenCalledWith([{
      n: 1, videoId: "abcdefghijk", title: "T", channel: "C", startSeconds: 272,
      url: "https://www.youtube.com/watch?v=abcdefghijk&t=272s", text: "body",
    }])
    expect(h.onToken).toHaveBeenCalledWith("Hi")
    expect(h.onDone).toHaveBeenCalledWith("Hi")
    expect(h.onError).not.toHaveBeenCalled()
    const [, init] = fetchMock.mock.calls[0]
    expect(init.method).toBe("POST")
    expect(init.headers["X-Session-ID"]).toBe("sid")
    expect(JSON.parse(init.body)).toEqual({ user_query: "q?" })
  })

  it("passes server error events to onError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(sseResponse([
      'data: {"type":"error","message":"Couldn\'t search your videos. Please try again."}\n\n',
    ])))
    const h = handlers()
    await streamQuery({ sessionId: "s", query: "q", ...h })
    expect(h.onError).toHaveBeenCalledWith("Couldn't search your videos. Please try again.")
  })

  it("throws QueryStreamError with detail on 404", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "Session not found or expired." }), { status: 404 })))
    const err = await streamQuery({ sessionId: "s", query: "q", ...handlers() }).catch((e) => e)
    expect(err).toBeInstanceOf(QueryStreamError)
    expect(err.message).toBe("Session not found or expired.")
    expect(err.status).toBe(404)
  })

  it("reports a stream that ends without done", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(sseResponse([
      'data: {"type":"sources","sources":[]}\n\n', 'data: {"type":"token","text":"par"}\n\n',
    ])))
    const h = handlers()
    await streamQuery({ sessionId: "s", query: "q", ...h })
    expect(h.onError).toHaveBeenCalledWith("The answer stopped unexpectedly. Please try again.")
  })
})
