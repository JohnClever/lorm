"use client";

import { useState, useEffect } from "react";
import { Copy, Code2, Check } from "lucide-react";
import { createHighlighter } from "shiki";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  language: string;
  title?: string;
  showLineNumbers?: boolean;
  className?: string;
  maxHeight?: string;
}

export function CodeBlock({
  code,
  language,
  title,
  showLineNumbers = true,
  className,
  maxHeight = "400px",
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [highlightedCode, setHighlightedCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const highlightCode = async () => {
      try {
        const highlighter = await createHighlighter({
          themes: ["github-dark"],
          langs: [language],
        });

        const html = await highlighter.codeToHtml(code, {
          lang: language,
          theme: "github-dark",
        });

        setHighlightedCode(html);
        setIsLoading(false);
      } catch (error) {
        console.error("Failed to highlight code:", error);
        setHighlightedCode(
          `<pre class="shiki github-dark" style="background-color:#0d1117;color:#e6edf3;"  tabindex="0"><code>${code
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")}</code></pre>`
        );
        setIsLoading(false);
      }
    };

    highlightCode();
  }, [code, language]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border border-github-border",
        "bg-[#0d1117] shadow-lg hover:shadow-xl transition-all duration-300",
        "ring-1 ring-white/5 hover:ring-white/10",
        className
      )}
    >
      {/* IDE-style Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-github-border/50 bg-[#161b22]">
        <div className="flex items-center gap-2">
          {/* Traffic Light Dots */}
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
          </div>

          {title && (
            <span className="text-sm font-medium text-[#f0f6fc] ml-1">
              {title}
            </span>
          )}

          {/* Language Badge */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#21262d] border border-[#30363d]">
            <Code2 className="w-3 h-3 text-[#58a6ff]" />
            <span className="text-xs font-mono font-medium text-[#58a6ff] uppercase tracking-wide">
              {language}
            </span>
          </div>
        </div>

        {/* Copy Button */}
        <button
          onClick={copyToClipboard}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium",
            "bg-[#21262d] border border-[#30363d] hover:bg-[#30363d]",
            "text-[#f0f6fc] hover:text-white transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-[#58a6ff]/50",
            copied && "bg-[#238636] border-[#2ea043] text-white"
          )}
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <div className="relative bg-[#0d1117]">
        {isLoading ? (
          <div className="flex items-center justify-center p-6">
            <div className="flex items-center gap-2">
              <div className="animate-spin">
                <Code2 className="w-4 h-4 text-[#58a6ff]" />
              </div>
              <span className="text-sm text-[#8b949e] font-mono">
                Highlighting code...
              </span>
            </div>
          </div>
        ) : (
          <div
            className="overflow-auto scrollbar-thin scrollbar-track-[#161b22] scrollbar-thumb-[#30363d] hover:scrollbar-thumb-[#484f58]"
            style={{ maxHeight }}
          >
            {/* {showLineNumbers ? (
              <div className="flex min-h-full">
              
                <div className="flex-shrink-0 px-3 py-2 bg-[#0d1117] border-r border-[#21262d] select-none">
                  {lines.map((_, index) => {
                    const lineNumber = index + 1;
                    return (
                      <div
                        key={lineNumber}
                        className="text-sm font-mono leading-6 text-right text-[#6e7681] hover:text-[#8b949e] transition-colors"
                        style={{ minWidth: "2.5rem" }}
                      >
                        {lineNumber}
                      </div>
                    );
                  })}
                </div>

              
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      "p-2 font-mono text-base leading-6 overflow-x-auto",
                      "[&_pre]:!bg-transparent [&_pre]:!p-0 [&_pre]:!m-0",
                      "[&_code]:!bg-transparent [&_code]:!font-mono",
                      "[&_.line]:block [&_.line]:min-h-[1.5rem]"
                    )}
                    dangerouslySetInnerHTML={{
                      __html: highlightedCode,
                    }}
                  />
                </div>
              </div>
            ) : ( */}
            <div
              className={cn(
                "p-2 font-mono text-base  ",
                "[&_pre]:!bg-transparent [&_pre]:!p-0 [&_pre]:!m-0 [&_code]:!h-20",
                "[&_code]:!bg-transparent [&_code]:!font-mono [&_code]:!text-[16px] ",
                "[&_.line]:block [&_.line]:min-h-[1.5rem]"
              )}
              dangerouslySetInnerHTML={{
                __html: highlightedCode,
              }}
            />
            {/* // )} */}
          </div>
        )}
      </div>
    </div>
  );
}
