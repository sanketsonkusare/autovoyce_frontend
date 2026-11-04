import { API_ENDPOINTS } from "@/lib/config"

/** A transcript passage an answer can cite as [n]. */
export interface Source {
  n: number
  videoId: string
  title: string
  channel: string
  /** Seconds into the video, or null when unknown. */
  startSeconds: number | null
  /** YouTube link that opens the video at startSeconds. */
  url: string
  /** The passage text. */
  text: string
}

export class QueryStreamError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = "QueryStreamError"
    this.status = status
  }
}

export interface StreamHandlers {
  onSources(sources: Source[]): void
  onToken(text: string): void
  onDone(answer: string): void
  onError(message: string): void
}

export const STREAM_ENDED_MESSAGE = "The answer stopped unexpectedly. Please try again."
export const EMPTY_ANSWER_MESSAGE = "The answer couldn't be completed. Please try again."

/**
 * Incremental parser for a server-sent events body. Bytes may arrive split
 * anywhere (even inside a UTF-8 character); each complete `data:` event is
 * JSON-parsed and handed to onData. Comment lines (": keepalive") are ignored.
 */
export function createSseParser(onData: (data: unknown) => void) {
  const decoder = new TextDecoder()
  let buffer = ""

  const flushEvent = (raw: string) => {
    const data = raw
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).replace(/^ /, ""))
      .join("\n")
    if (!data) return
    try {
      onData(JSON.parse(data))
    } catch {
      // Ignore malformed events rather than breaking the whole answer
    }
  }

  const drain = () => {
    buffer = buffer.replace(/\r\n?/g, "\n")
    let boundary = buffer.indexOf("\n\n")
    while (boundary !== -1) {
      flushEvent(buffer.slice(0, boundary))
      buffer = buffer.slice(boundary + 2)
      boundary = buffer.indexOf("\n\n")
    }
  }

  return {
    push(chunk: Uint8Array) {
      buffer += decoder.decode(chunk, { stream: true })
      drain()
    },
    end() {
      buffer += decoder.decode()
      drain()
      if (buffer.trim()) flushEvent(buffer)
      buffer = ""
    },
  }
}

function toSource(raw: any): Source {
  return {
    n: Number(raw?.n),
    videoId: String(raw?.video_id ?? ""),
    title: String(raw?.title ?? ""),
    channel: String(raw?.channel ?? ""),
    startSeconds: typeof raw?.start_seconds === "number" ? raw.start_seconds : null,
    url: String(raw?.url ?? ""),
    text: String(raw?.text ?? ""),
  }
}

/**
 * Ask a question and receive the answer as it is generated.
 * Throws QueryStreamError when the server rejects the request (e.g. 404 for an
 * expired session); problems after streaming starts go to onError.
 */
export async function streamQuery(
  opts: { sessionId: string; query: string; signal?: AbortSignal } & StreamHandlers,
): Promise<void> {
  const response = await fetch(API_ENDPOINTS.QUERY_STREAM, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Session-ID": opts.sessionId },
    body: JSON.stringify({ user_query: opts.query }),
    signal: opts.signal,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const detail = typeof body?.detail === "string" ? body.detail : ""
    throw new QueryStreamError(detail || `Failed to query: ${response.statusText || response.status}`, response.status)
  }
  if (!response.body) {
    opts.onError(STREAM_ENDED_MESSAGE)
    return
  }

  let finished = false
  const parser = createSseParser((event: any) => {
    if (finished || !event || typeof event !== "object") return
    switch (event.type) {
      case "sources":
        opts.onSources(Array.isArray(event.sources) ? event.sources.map(toSource) : [])
        break
      case "token":
        if (typeof event.text === "string") opts.onToken(event.text)
        break
      case "done": {
        finished = true
        const answer = typeof event.answer === "string" ? event.answer : ""
        // Never leave the user with a blank bubble
        if (answer.trim()) opts.onDone(answer)
        else opts.onError(EMPTY_ANSWER_MESSAGE)
        break
      }
      case "error":
        finished = true
        opts.onError(typeof event.message === "string" ? event.message : STREAM_ENDED_MESSAGE)
        break
    }
  })

  const reader = response.body.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) parser.push(value)
  }
  parser.end()

  if (!finished) opts.onError(STREAM_ENDED_MESSAGE)
}
