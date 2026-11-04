import type { Source } from "@/lib/query-stream"

/** A bare citation marker like [3] — not a Markdown link like [3](https://...). */
const MARKER = /\[(\d+)\](?!\()/g

/**
 * Code where [n] is not a citation: fenced blocks (an unclosed fence, as while
 * an answer is still streaming, runs to the end) and inline `code`.
 */
const CODE = /```[\s\S]*?(?:```|$)|`[^`\n]*`/g

/** Apply fn to the parts of text outside code; code is kept as-is. */
function outsideCode(text: string, fn: (prose: string) => string): string {
  let result = ""
  let last = 0
  for (const match of text.matchAll(CODE)) {
    result += fn(text.slice(last, match.index)) + match[0]
    last = match.index! + match[0].length
  }
  return result + fn(text.slice(last))
}

/** Numbers cited in the text that match a source, in first-citation order. */
export function citedNumbers(text: string, sources: Source[]): number[] {
  const valid = new Set(sources.map((s) => s.n))
  const seen: number[] = []
  outsideCode(text, (prose) => {
    for (const match of prose.matchAll(MARKER)) {
      const n = Number(match[1])
      if (valid.has(n) && !seen.includes(n)) seen.push(n)
    }
    return prose
  })
  return seen
}

/** Turn each valid [n] outside code into a Markdown link to #cite-n (rendered as a badge). */
export function linkCitations(text: string, sources: Source[]): string {
  const valid = new Set(sources.map((s) => s.n))
  return outsideCode(text, (prose) =>
    prose.replace(MARKER, (marker, n: string) =>
      valid.has(Number(n)) ? `[${n}](#cite-${n})` : marker,
    ),
  )
}

/** Remove [n] markers, e.g. before reading an answer aloud. */
export function stripCitations(text: string): string {
  return text
    .replace(/\s*\[\d+\](?!\()/g, "")
    .replace(/[ \t]+([.,;:!?])/g, "$1")
    .trim()
}

/** 272 -> "4:32", 3725 -> "1:02:05". */
export function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = String(total % 60).padStart(2, "0")
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${secs}` : `${minutes}:${secs}`
}
