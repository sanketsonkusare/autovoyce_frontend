import type { Source } from "@/lib/query-stream"

/** A bare citation marker like [3] — not a Markdown link like [3](https://...). */
const MARKER = /\[(\d+)\](?!\()/g

/** Numbers cited in the text that match a source, in first-citation order. */
export function citedNumbers(text: string, sources: Source[]): number[] {
  const valid = new Set(sources.map((s) => s.n))
  const seen: number[] = []
  for (const match of text.matchAll(MARKER)) {
    const n = Number(match[1])
    if (valid.has(n) && !seen.includes(n)) seen.push(n)
  }
  return seen
}

/** Turn each valid [n] into a Markdown link to #cite-n (rendered as a badge). */
export function linkCitations(text: string, sources: Source[]): string {
  const valid = new Set(sources.map((s) => s.n))
  return text.replace(MARKER, (marker, n: string) =>
    valid.has(Number(n)) ? `[${n}](#cite-${n})` : marker,
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
