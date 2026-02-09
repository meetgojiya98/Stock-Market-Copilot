import { NextRequest, NextResponse } from "next/server";
import { fetchAskAnswer, normalizeQuery, normalizeSymbol } from "@/lib/server/ask-core";
import {
  computeGroundingMetrics,
  ensureSourceTrail,
  mergeAndRankSources,
  retrieveWebSources,
  sanitizeLocalSources,
  type CopilotSource,
} from "@/lib/server/research-copilot";

function buildSourcePacketBlock(sources: CopilotSource[]) {
  if (!sources.length) return "";
  const lines = sources.slice(0, 8).map((source) => {
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

  const sourcePacket = buildSourcePacketBlock(rankedSources);
  const enhancedQuery = sourcePacket ? `${query}\n\n${sourcePacket}` : query;

  const payload = {
    ...body,
    query: enhancedQuery,
    ...(symbol ? { symbol } : {}),
  };

  const result = await fetchAskAnswer(payload, query, symbol, rankedSources);
  const answer = enforceCitationRigour(ensureSourceTrail(result.answer, rankedSources), rankedSources, citationStrict);
  const metrics = computeGroundingMetrics(answer, rankedSources);

  return NextResponse.json({
    answer,
    mode: result.mode,
    detail: result.detail,
    sources: rankedSources,
    ...metrics,
  });
}
