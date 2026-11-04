"use client";

import { useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { ChevronDown, ChevronRight, ChevronUp, ExternalLink, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { citedNumbers, formatTimestamp, linkCitations } from "@/lib/citations";
import type { Source } from "@/lib/query-stream";

/** Markdown styling for chat bubbles (shared by user and assistant messages). */
export function chatMarkdownComponents(
  role: "user" | "assistant",
  renderLink?: Components["a"],
): Components {
  const isUser = role === "user";
  return {
    h1: ({ node, ...props }) => <h1 className="text-lg font-bold mb-2 mt-3 first:mt-0" {...props} />,
    h2: ({ node, ...props }) => <h2 className="text-base font-semibold mb-2 mt-3 first:mt-0" {...props} />,
    h3: ({ node, ...props }) => <h3 className="text-sm font-semibold mb-1.5 mt-2 first:mt-0" {...props} />,
    p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
    ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
    ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
    li: ({ node, ...props }) => <li className="ml-4" {...props} />,
    code: ({ node, inline, ...props }: any) =>
      inline ? (
        <code
          className={cn(
            "px-1.5 py-0.5 rounded text-xs font-mono",
            isUser ? "bg-white/20 text-white" : "bg-slate-700/50 text-violet-300",
          )}
          {...props}
        />
      ) : (
        <code
          className={cn(
            "block p-3 rounded-lg text-xs font-mono overflow-x-auto mb-2",
            isUser ? "bg-white/10 text-white" : "bg-slate-900/50 text-slate-200 border border-slate-700/50",
          )}
          {...props}
        />
      ),
    pre: ({ node, ...props }) => <pre className="mb-2" {...props} />,
    a:
      renderLink ??
      (({ node, ...props }) => (
        <a
          className={cn(
            "underline hover:no-underline",
            isUser ? "text-white/90 hover:text-white" : "text-violet-400 hover:text-violet-300",
          )}
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        />
      )),
    strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
    em: ({ node, ...props }) => <em className="italic" {...props} />,
    blockquote: ({ node, ...props }) => (
      <blockquote
        className={cn(
          "border-l-4 pl-3 py-1 my-2 italic",
          isUser ? "border-white/30 text-white/80" : "border-slate-600 text-slate-300",
        )}
        {...props}
      />
    ),
    hr: ({ node, ...props }) => (
      <hr
        className={cn("my-3 border-0 border-t", isUser ? "border-white/20" : "border-slate-700")}
        {...props}
      />
    ),
  };
}

const CITE_HREF = /^#cite-(\d+)$/;

interface AnswerWithCitationsProps {
  content: string;
  sources: Source[];
  error?: string;
  /** Time the message was created, already formatted. */
  time: string;
}

/** An assistant answer with [n] citation badges, source chips and the cited passages. */
export function AnswerWithCitations({ content, sources, error, time }: AnswerWithCitationsProps) {
  const [showContext, setShowContext] = useState(false);
  const byNumber = new Map(sources.map((s) => [s.n, s]));
  const cited = citedNumbers(content, sources)
    .map((n) => byNumber.get(n))
    .filter((s): s is Source => Boolean(s));

  const renderLink: Components["a"] = ({ node, href, children, ...props }) => {
    const match = href?.match(CITE_HREF);
    const source = match ? byNumber.get(Number(match[1])) : undefined;
    if (source) {
      const label = `${source.title}${source.startSeconds !== null ? ` at ${formatTimestamp(source.startSeconds)}` : ""}`;
      return (
        <sup className="mx-0.5">
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            title={label}
            aria-label={`Source ${source.n}: ${label}`}
            data-citation={source.n}
            className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded bg-violet-500/25 text-[10px] font-semibold text-violet-200 no-underline hover:bg-violet-500/50 hover:text-white transition-colors"
          >
            {source.n}
          </a>
        </sup>
      );
    }
    return (
      <a
        className="underline hover:no-underline text-violet-400 hover:text-violet-300"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    );
  };

  return (
    <>
      <div className="rounded-2xl px-4 py-3 animate-in fade-in slide-in-from-bottom-2 duration-300 bg-slate-800/50 border border-slate-700/50 text-slate-100">
        {content && (
          <div className="text-sm leading-relaxed break-words">
            <ReactMarkdown components={chatMarkdownComponents("assistant", renderLink)}>
              {linkCitations(content, sources)}
            </ReactMarkdown>
          </div>
        )}
        {error && <p className={cn("text-xs text-red-400", content && "mt-2")}>{error}</p>}
        <p className="text-[10px] mt-1.5 text-slate-500">{time}</p>
      </div>

      {cited.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-slate-400 font-medium px-1">Sources:</div>
          <div className="flex flex-wrap gap-2">
            {cited.map((source) => (
              <a
                key={source.n}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                data-source-chip={source.n}
                className="flex items-center gap-2 max-w-full px-3 py-2 rounded-lg bg-slate-800/30 border border-slate-700/30 hover:border-violet-500/50 text-xs text-slate-300 hover:text-white transition-colors group"
              >
                <span className="shrink-0 font-semibold text-violet-300">[{source.n}]</span>
                <Play className="size-3 shrink-0 text-violet-400" />
                <span className="min-w-0 truncate">
                  {source.title || "YouTube video"}
                  {source.channel && <span className="text-slate-500"> · {source.channel}</span>}
                </span>
                {source.startSeconds !== null && (
                  <span className="shrink-0 tabular-nums text-slate-500 group-hover:text-slate-400">
                    {formatTimestamp(source.startSeconds)}
                  </span>
                )}
                <ExternalLink className="size-3 shrink-0 text-slate-500 group-hover:text-violet-400" />
              </a>
            ))}
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowContext((open) => !open)}
              aria-expanded={showContext}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/30 border border-slate-700/30 hover:border-violet-500/50 text-xs text-slate-400 hover:text-slate-300 transition-colors w-full"
            >
              <span>Context Used</span>
              {showContext ? <ChevronUp className="size-3 ml-auto" /> : <ChevronDown className="size-3 ml-auto" />}
            </button>
            {showContext && (
              <div className="mt-2 space-y-2 pl-3">
                {cited.map((source) => (
                  <div key={source.n} className="text-xs text-slate-500 flex items-start gap-2">
                    <ChevronRight className="size-3 mt-0.5 shrink-0" />
                    <span>
                      <span className="font-semibold text-slate-400">[{source.n}]</span> {source.text}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
