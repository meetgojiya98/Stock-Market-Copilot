import { NextRequest } from "next/server";
import {
  fetchAskAnswer,
  normalizeQuery,
  normalizeSymbol,
  streamClaudeAnswer,
} from "@/lib/server/ask-core";
import {
  computeGroundingMetrics,
  ensureSourceTrail,
  mergeAndRankSources,
  retrieveWebSources,
  sanitizeLocalSources,
  type CopilotSource,
} from "@/lib/server/research-copilot";

export const dynamic = "force-dynamic";

function toSseEvent(event: string, payload: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

function buildSourcePacketBlock(sources: CopilotSource[]) {
  if (!sources.length) return "";
  const lines = sources.slice(0, 10).map((source) => {
    const link = source.url || "#";
    return `- [${source.id}] ${source.title} (${source.source}) ${link} | relevance=${source.relevance.toFixed(2)}`;
  });
  return [
    "Verified Source Pack:",
    ...lines,
    "Use source ids like [S1], [S2] inline for every factual claim.",
  ].join("\n");
}

function resolveRetrievalQuery(raw: unknown, query: string) {
  const explicit = normalizeQuery(raw);
  if (explicit) return explicit;
  return query.length <= 280 ? query : "";
}

function resolveSourceLimit(raw: unknown) {
  const mode = normalizeQuery(raw).toLowerCase();
  if (mode === "fast") return 7;
  if (mode === "deep") return 14;
  return 10;
}

function resolveStrictCitations(raw: unknown) {
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "string") return raw.trim().toLowerCase() === "true";
  return false;
}

function enforceCitationRigour(answer: string, sources: CopilotSource[], strict: boolean) {
  if (!strict || !sources.length) return answer;
  if (/\[S\d+\]/.test(answer)) return answer;
  const anchors = sources
    .slice(0, 3)
    .map((source) => `[${source.id}]`)
    .join(" ");
  return [answer.trim(), "", "### Verification Anchors", `- Baseline source anchors: ${anchors}`].join(
    "\n"
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const query = normalizeQuery(body?.query) || normalizeQuery(body?.question);
  const symbol = normalizeSymbol(body?.symbol);
  const retrievalQuery = resolveRetrievalQuery(body?.retrievalQuery, query);
  const sourceLimit = resolveSourceLimit(body?.webDepth);
  const citationStrict = resolveStrictCitations(body?.citationStrict);

  const localSources = sanitizeLocalSources(body?.sources);
  const webSources = retrievalQuery ? await retrieveWebSources(retrievalQuery, symbol) : [];
  const rankedSources = mergeAndRankSources(
    retrievalQuery || query || symbol,
    localSources,
    webSources,
    sourceLimit
  );

  // Try true streaming with Claude first
  const useNativeStreaming = !!process.env.ANTHROPIC_API_KEY;

  if (useNativeStreaming) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let closed = false;
        const safeClose = () => {
          if (closed) return;
          closed = true;
          controller.close();
        };

        const send = (event: string, payload: unknown) => {
          if (closed) return;
          controller.enqueue(encoder.encode(toSseEvent(event, payload)));
        };

        try {
          // Send sources first
          send("sources", { sources: rankedSources });

          // Stream Claude response
          let fullAnswer = "";
          const claudeStream = streamClaudeAnswer(query, symbol, rankedSources);

          for await (const event of claudeStream) {
            if (event.type === "text") {
              fullAnswer += event.content;
              send("chunk", { text: event.content });
            } else if (event.type === "error") {
              send("error", { detail: event.content });
              break;
            }
          }

          // Post-process
          const finalAnswer = enforceCitationRigour(
            ensureSourceTrail(fullAnswer, rankedSources),
            rankedSources,
            citationStrict
          );
          const metrics = computeGroundingMetrics(finalAnswer, rankedSources);

          send("meta", {
            mode: "live",
            detail: `Streaming response via Claude.`,
            groundingConfidence: metrics.groundingConfidence,
            citationVerificationScore: metrics.citationVerificationScore,
            citationUsage: metrics.citationUsage,
          });
          send("done", {});
        } catch (error) {
          send("error", {
            detail: error instanceof Error ? error.message : "Streaming failure",
          });
        } finally {
          safeClose();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }

  // Fallback to non-streaming response chunked via SSE
  const sourcePacket = buildSourcePacketBlock(rankedSources);
  const enhancedQuery = sourcePacket ? `${query}\n\n${sourcePacket}` : query;

  const payload = {
    ...body,
    query: enhancedQuery,
    ...(symbol ? { symbol } : {}),
  };

  const result = await fetchAskAnswer(payload, query, symbol, rankedSources);
  const answer = enforceCitationRigour(
    ensureSourceTrail(result.answer, rankedSources),
    rankedSources,
    citationStrict
  );
  const metrics = computeGroundingMetrics(answer, rankedSources);

  // Chunk and stream the non-streaming response
  const encoder = new TextEncoder();
  const chunks: string[] = [];
  for (let cursor = 0; cursor < answer.length; cursor += 180) {
    chunks.push(answer.slice(cursor, cursor + 180));
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const safeClose = () => {
        if (closed) return;
        closed = true;
        controller.close();
      };

      const send = (event: string, payload: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(toSseEvent(event, payload)));
      };

      try {
        send("sources", { sources: rankedSources });
        for (const chunk of chunks) {
          send("chunk", { text: chunk });
          await new Promise((resolve) => setTimeout(resolve, 12));
        }

        send("meta", {
          mode: result.mode,
          detail: result.detail,
          groundingConfidence: metrics.groundingConfidence,
          citationVerificationScore: metrics.citationVerificationScore,
          citationUsage: metrics.citationUsage,
        });
        send("done", {});
      } catch (error) {
        send("error", {
          detail: error instanceof Error ? error.message : "Streaming failure",
        });
      } finally {
        safeClose();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
