"use client";

import { useState, useMemo } from "react";
import { Search, Filter, MessageSquareQuote, Tag, User, CalendarDays } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Speaker = {
  name: string;
  role: "CEO" | "CFO" | "Analyst" | "COO";
};

type Quote = {
  speaker: Speaker;
  text: string;
};

type Transcript = {
  company: string;
  ticker: string;
  quarter: string;
  date: string;
  speakers: Speaker[];
  quotes: Quote[];
  themes: string[];
};

/* ------------------------------------------------------------------ */
/*  Mock Data                                                          */
/* ------------------------------------------------------------------ */

const MOCK_TRANSCRIPTS: Transcript[] = [
  {
    company: "Apple Inc.",
    ticker: "AAPL",
    quarter: "Q3 2024",
    date: "2024-08-01",
    speakers: [
      { name: "Tim Cook", role: "CEO" },
      { name: "Luca Maestri", role: "CFO" },
      { name: "Shannon Cross", role: "Analyst" },
    ],
    quotes: [
      { speaker: { name: "Tim Cook", role: "CEO" }, text: "We set an all-time revenue record for Services and a June quarter revenue record in several markets. Our installed base of active devices reached a new all-time high across all products and all geographic segments." },
      { speaker: { name: "Luca Maestri", role: "CFO" }, text: "Our gross margin expanded 70 basis points year over year driven by cost improvements and favorable mix toward Services. We returned over $32 billion to shareholders during the quarter." },
      { speaker: { name: "Shannon Cross", role: "Analyst" }, text: "Can you speak to the trajectory of AI integration across the product lineup and how Apple Intelligence will influence upgrade cycles heading into the holiday quarter?" },
      { speaker: { name: "Tim Cook", role: "CEO" }, text: "Apple Intelligence is a game-changer. We believe this will be the most compelling upgrade cycle we have seen in years. The on-device AI processing combined with cloud capabilities sets us apart from every competitor." },
      { speaker: { name: "Luca Maestri", role: "CFO" }, text: "Capital expenditures were approximately $2.8 billion in the quarter, reflecting our ongoing investments in silicon design, data centers, and supply chain infrastructure." },
    ],
    themes: ["AI", "Services Growth", "Margins", "Shareholder Returns", "Apple Intelligence"],
  },
  {
    company: "Apple Inc.",
    ticker: "AAPL",
    quarter: "Q4 2024",
    date: "2024-10-31",
    speakers: [
      { name: "Tim Cook", role: "CEO" },
      { name: "Kevan Parekh", role: "CFO" },
      { name: "Erik Woodring", role: "Analyst" },
    ],
    quotes: [
      { speaker: { name: "Tim Cook", role: "CEO" }, text: "This was our best September quarter ever, with revenue of $94.9 billion. iPhone 16 demand has exceeded our expectations, driven heavily by Apple Intelligence features that customers are loving." },
      { speaker: { name: "Kevan Parekh", role: "CFO" }, text: "Services revenue hit $25 billion, up 12% year over year, and we now have over one billion paid subscriptions across our platforms. Operating cash flow was a record $27 billion." },
      { speaker: { name: "Erik Woodring", role: "Analyst" }, text: "How should we think about the margin trajectory going forward given the significant ramp in AI infrastructure spending?" },
      { speaker: { name: "Tim Cook", role: "CEO" }, text: "We are investing aggressively in AI while maintaining our discipline on margins. Our proprietary silicon gives us a structural cost advantage in running AI workloads compared to competitors relying on third-party chips." },
      { speaker: { name: "Kevan Parekh", role: "CFO" }, text: "We expect December quarter revenue between $123 billion and $127 billion, which would represent a new all-time record." },
    ],
    themes: ["AI", "Revenue Growth", "iPhone 16", "Services", "Margins"],
  },
  {
    company: "Microsoft Corporation",
    ticker: "MSFT",
    quarter: "Q1 FY2025",
    date: "2024-10-22",
    speakers: [
      { name: "Satya Nadella", role: "CEO" },
      { name: "Amy Hood", role: "CFO" },
      { name: "Brent Thill", role: "Analyst" },
    ],
    quotes: [
      { speaker: { name: "Satya Nadella", role: "CEO" }, text: "We are at an inflection point in AI adoption across every layer of the technology stack. Our Copilot offerings are being adopted by organizations of every size, and Azure AI services revenue has more than doubled year over year." },
      { speaker: { name: "Amy Hood", role: "CFO" }, text: "Revenue was $65.6 billion, up 16% year over year, with operating income growing 14%. Azure and other cloud services revenue grew 34%, including 12 points from AI services." },
      { speaker: { name: "Brent Thill", role: "Analyst" }, text: "Satya, can you help us understand the conversion funnel from Copilot trials to paid licenses and what the retention rates look like after six months?" },
      { speaker: { name: "Satya Nadella", role: "CEO" }, text: "Copilot retention rates are exceeding our most optimistic projections. Customers who deploy Copilot see measurable productivity gains within weeks, and expansion rates are very strong as they roll out to broader employee populations." },
      { speaker: { name: "Amy Hood", role: "CFO" }, text: "Capital expenditures including finance leases were $20 billion, reflecting our commitment to building the infrastructure necessary to meet surging AI demand." },
    ],
    themes: ["AI", "Azure Growth", "Copilot", "Cloud", "Capital Expenditure"],
  },
  {
    company: "Microsoft Corporation",
    ticker: "MSFT",
    quarter: "Q2 FY2025",
    date: "2025-01-28",
    speakers: [
      { name: "Satya Nadella", role: "CEO" },
      { name: "Amy Hood", role: "CFO" },
      { name: "Keith Weiss", role: "Analyst" },
    ],
    quotes: [
      { speaker: { name: "Satya Nadella", role: "CEO" }, text: "We crossed $100 billion in commercial cloud ARR, a milestone that would have seemed impossible just a few years ago. AI is fundamentally reshaping how enterprises build and deploy software." },
      { speaker: { name: "Amy Hood", role: "CFO" }, text: "Revenue was $69.6 billion, up 12% year over year. Intelligent Cloud segment revenue was $25.5 billion, up 19%, with Azure growing 31% in constant currency." },
      { speaker: { name: "Keith Weiss", role: "Analyst" }, text: "Amy, how should we think about the gross margin trajectory for Azure given the higher AI mix and associated GPU costs?" },
      { speaker: { name: "Amy Hood", role: "CFO" }, text: "AI services carry a different margin profile than traditional cloud. As we scale and optimize our infrastructure, we expect margins to improve, though the mix shift will create some near-term pressure." },
      { speaker: { name: "Satya Nadella", role: "CEO" }, text: "GitHub Copilot now has over 1.8 million paid subscribers and is the most widely adopted AI developer tool in the world. The developer ecosystem is moving to AI-first workflows." },
    ],
    themes: ["AI", "Cloud ARR", "Azure", "GitHub Copilot", "Margins"],
  },
  {
    company: "Alphabet Inc.",
    ticker: "GOOGL",
    quarter: "Q3 2024",
    date: "2024-10-29",
    speakers: [
      { name: "Sundar Pichai", role: "CEO" },
      { name: "Ruth Porat", role: "CFO" },
      { name: "Brian Nowak", role: "Analyst" },
    ],
    quotes: [
      { speaker: { name: "Sundar Pichai", role: "CEO" }, text: "The momentum across the company is extraordinary. Search, Cloud, and YouTube all delivered strong results. Our Gemini models are now powering improvements across virtually every Google product." },
      { speaker: { name: "Ruth Porat", role: "CFO" }, text: "Revenue was $88.3 billion, up 15% year over year. Google Cloud revenue surpassed $11 billion, growing 35%, with operating margin expanding to 17%." },
      { speaker: { name: "Brian Nowak", role: "Analyst" }, text: "Sundar, can you discuss the impact of AI Overviews on Search monetization and how ad formats are evolving within the AI-enhanced results?" },
      { speaker: { name: "Sundar Pichai", role: "CEO" }, text: "AI Overviews are increasing user engagement and satisfaction with Search. We are seeing that AI-enhanced results are actually driving more commercial queries, and our advertising partners are seeing strong returns on AI-integrated ad placements." },
      { speaker: { name: "Ruth Porat", role: "CFO" }, text: "Operating income was $28.5 billion, reflecting a 34% operating margin. We continue to invest in technical infrastructure while driving efficiency across the organization." },
    ],
    themes: ["AI", "Google Cloud", "Search Monetization", "YouTube", "Gemini"],
  },
  {
    company: "Alphabet Inc.",
    ticker: "GOOGL",
    quarter: "Q4 2024",
    date: "2025-02-04",
    speakers: [
      { name: "Sundar Pichai", role: "CEO" },
      { name: "Ruth Porat", role: "CFO" },
      { name: "Justin Post", role: "Analyst" },
    ],
    quotes: [
      { speaker: { name: "Sundar Pichai", role: "CEO" }, text: "2024 was a transformative year. Full-year revenue exceeded $350 billion, with Google Cloud ending the year at a $92 billion revenue run rate. Gemini 2.0 represents a leap forward in multimodal reasoning." },
      { speaker: { name: "Ruth Porat", role: "CFO" }, text: "Q4 revenue was $96.5 billion, up 12% year over year. Capital expenditures were $14.3 billion in the quarter as we scaled our AI compute capacity globally." },
      { speaker: { name: "Justin Post", role: "Analyst" }, text: "How are you thinking about the competitive landscape for AI agents, particularly as more enterprises evaluate custom solutions versus platform offerings like Google Cloud?" },
      { speaker: { name: "Sundar Pichai", role: "CEO" }, text: "We have a unique advantage with our full-stack approach, from custom TPUs to Gemini models to Cloud infrastructure. Enterprises want a trusted partner for AI transformation, and our breadth of offerings positions us well." },
      { speaker: { name: "Ruth Porat", role: "CFO" }, text: "We plan to invest approximately $75 billion in capital expenditures in 2025, primarily focused on technical infrastructure to support AI growth across Search, Cloud, and our developer ecosystem." },
    ],
    themes: ["AI", "Revenue Growth", "Google Cloud", "Gemini 2.0", "Capital Expenditure"],
  },
  {
    company: "Amazon.com Inc.",
    ticker: "AMZN",
    quarter: "Q3 2024",
    date: "2024-10-31",
    speakers: [
      { name: "Andy Jassy", role: "CEO" },
      { name: "Brian Olsavsky", role: "CFO" },
      { name: "Doug Anmuth", role: "Analyst" },
    ],
    quotes: [
      { speaker: { name: "Andy Jassy", role: "CEO" }, text: "AWS grew 19% year over year, accelerating from 12% just a year ago. Our AI business within AWS is on a multi-billion dollar annualized revenue run rate, growing at a triple-digit percentage." },
      { speaker: { name: "Brian Olsavsky", role: "CFO" }, text: "Total revenue was $158.9 billion, up 11% year over year. Operating income was $17.4 billion, up 55% year over year, reflecting improved efficiency across all three segments." },
      { speaker: { name: "Doug Anmuth", role: "Analyst" }, text: "Andy, you have talked about AWS customers being supply constrained on AI compute. Where are you in terms of capacity build-out and how quickly can you close the supply-demand gap?" },
      { speaker: { name: "Andy Jassy", role: "CEO" }, text: "We are investing very aggressively in capacity. We have secured significant GPU supply and our custom Trainium chips are dramatically expanding our total AI compute capacity. But demand continues to outstrip supply." },
      { speaker: { name: "Brian Olsavsky", role: "CFO" }, text: "AWS operating margin was 38.1% in the quarter, and we expect continued margin strength as higher-margin AI services become a larger portion of the revenue mix." },
    ],
    themes: ["AI", "AWS Growth", "Operating Margins", "Custom Silicon", "E-commerce"],
  },
  {
    company: "Amazon.com Inc.",
    ticker: "AMZN",
    quarter: "Q4 2024",
    date: "2025-02-06",
    speakers: [
      { name: "Andy Jassy", role: "CEO" },
      { name: "Brian Olsavsky", role: "CFO" },
      { name: "Mark Mahaney", role: "Analyst" },
    ],
    quotes: [
      { speaker: { name: "Andy Jassy", role: "CEO" }, text: "We delivered our highest-ever quarterly revenue at $187.8 billion. AWS revenue surpassed $100 billion in annualized run rate, cementing its position as the world's leading cloud platform." },
      { speaker: { name: "Brian Olsavsky", role: "CFO" }, text: "Operating income was $21.2 billion, compared to $13.2 billion a year ago. Full-year free cash flow was $38.2 billion, more than double the prior year." },
      { speaker: { name: "Mark Mahaney", role: "Analyst" }, text: "Can you quantify the contribution of advertising AI tools to the overall ad revenue growth and discuss the roadmap for AI-powered ad creative generation?" },
      { speaker: { name: "Andy Jassy", role: "CEO" }, text: "Advertising continues to be a significant growth driver, reaching $17.3 billion in the quarter. AI-powered ad tools are transforming advertiser workflows and improving return on ad spend for our partners." },
      { speaker: { name: "Brian Olsavsky", role: "CFO" }, text: "We plan approximately $100 billion in capital expenditures for 2025, with the majority directed toward AWS infrastructure to meet unprecedented customer demand for AI compute services." },
    ],
    themes: ["AI", "Revenue Growth", "AWS", "Advertising", "Free Cash Flow"],
  },
  {
    company: "NVIDIA Corporation",
    ticker: "NVDA",
    quarter: "Q3 FY2025",
    date: "2024-11-20",
    speakers: [
      { name: "Jensen Huang", role: "CEO" },
      { name: "Colette Kress", role: "CFO" },
      { name: "Stacy Rasgon", role: "Analyst" },
    ],
    quotes: [
      { speaker: { name: "Jensen Huang", role: "CEO" }, text: "The age of AI is here. Revenue was $35.1 billion, up 94% year over year. Data Center revenue was $30.8 billion, driven by extraordinary demand for Hopper GPUs and the early ramp of Blackwell." },
      { speaker: { name: "Colette Kress", role: "CFO" }, text: "Gross margin was 74.6% on a GAAP basis. Blackwell demand is staggering and exceeds our supply by a significant margin. We are working with our supply chain partners to ramp production as fast as possible." },
      { speaker: { name: "Stacy Rasgon", role: "Analyst" }, text: "Jensen, can you discuss the competitive moat around CUDA and the full-stack platform given that several competitors are trying to build alternative software ecosystems?" },
      { speaker: { name: "Jensen Huang", role: "CEO" }, text: "CUDA has 5 million developers and a decade of optimized libraries. The full stack from chips to systems to software is our competitive moat. It would take years and billions of dollars for anyone to replicate what we have built." },
      { speaker: { name: "Colette Kress", role: "CFO" }, text: "We returned $11.2 billion to shareholders through buybacks and dividends. We are guiding Q4 revenue of $37.5 billion, reflecting continued Blackwell ramp and sustained Hopper demand." },
    ],
    themes: ["AI", "Data Center", "Blackwell", "Margins", "CUDA Ecosystem"],
  },
  {
    company: "NVIDIA Corporation",
    ticker: "NVDA",
    quarter: "Q4 FY2025",
    date: "2025-02-26",
    speakers: [
      { name: "Jensen Huang", role: "CEO" },
      { name: "Colette Kress", role: "CFO" },
      { name: "Timothy Arcuri", role: "Analyst" },
    ],
    quotes: [
      { speaker: { name: "Jensen Huang", role: "CEO" }, text: "Revenue was $39.3 billion, capping a fiscal year where total revenue exceeded $130 billion. Blackwell is now in full production and shipping to every major cloud provider and enterprise customer worldwide." },
      { speaker: { name: "Colette Kress", role: "CFO" }, text: "Full-year Data Center revenue was $115.2 billion. Gross margin for the quarter was 73.0%, reflecting the initial Blackwell production ramp. We expect margins to improve as production scales." },
      { speaker: { name: "Timothy Arcuri", role: "Analyst" }, text: "Jensen, how do you think about the sovereign AI opportunity and how material could that revenue stream become over the next two to three years?" },
      { speaker: { name: "Jensen Huang", role: "CEO" }, text: "Sovereign AI is a massive opportunity. Every nation wants its own AI infrastructure. We are working with governments worldwide to build national AI capabilities, and this will be a multi-hundred-billion-dollar market over the decade." },
      { speaker: { name: "Colette Kress", role: "CFO" }, text: "We are guiding Q1 FY2026 revenue of $43 billion, plus or minus 2%. The next generation Rubin platform is on track for 2026 production." },
    ],
    themes: ["AI", "Blackwell", "Sovereign AI", "Revenue Growth", "Margins"],
  },
];

const ALL_COMPANIES = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA"];
const ALL_QUARTERS = [...new Set(MOCK_TRANSCRIPTS.map((t) => t.quarter))];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <span key={i} className="transcript-highlight">{part}</span>
    ) : (
      part
    )
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function TranscriptSearch() {
  const [query, setQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [selectedQuarter, setSelectedQuarter] = useState<string>("all");
  const [expandedTranscript, setExpandedTranscript] = useState<string | null>(null);

  const filteredTranscripts = useMemo(() => {
    let results = MOCK_TRANSCRIPTS;

    if (selectedCompany !== "all") {
      results = results.filter((t) => t.ticker === selectedCompany);
    }
    if (selectedQuarter !== "all") {
      results = results.filter((t) => t.quarter === selectedQuarter);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      results = results
        .map((t) => {
          const matchingQuotes = t.quotes.filter(
            (quote) =>
              quote.text.toLowerCase().includes(q) ||
              quote.speaker.name.toLowerCase().includes(q) ||
              quote.speaker.role.toLowerCase().includes(q)
          );
          const companyMatch =
            t.company.toLowerCase().includes(q) ||
            t.ticker.toLowerCase().includes(q);
          const themeMatch = t.themes.some((th) => th.toLowerCase().includes(q));

          if (matchingQuotes.length > 0 || companyMatch || themeMatch) {
            return { ...t, quotes: matchingQuotes.length > 0 ? matchingQuotes : t.quotes };
          }
          return null;
        })
        .filter(Boolean) as Transcript[];
    }

    return results;
  }, [query, selectedCompany, selectedQuarter]);

  const toggleTranscript = (key: string) => {
    setExpandedTranscript((prev) => (prev === key ? null : key));
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--ink-muted)" }}
        />
        <input
          type="text"
          className="transcript-search-input"
          placeholder="Search transcripts... (e.g. AI, revenue, margins, Jensen Huang)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-1.5">
          <Filter size={14} style={{ color: "var(--ink-muted)" }} />
          <span className="text-xs font-medium" style={{ color: "var(--ink-muted)" }}>
            Filters:
          </span>
        </div>
        <select
          value={selectedCompany}
          onChange={(e) => setSelectedCompany(e.target.value)}
          className="text-xs px-2 py-1 rounded-md border"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface)",
            color: "var(--ink)",
          }}
        >
          <option value="all">All Companies</option>
          {ALL_COMPANIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={selectedQuarter}
          onChange={(e) => setSelectedQuarter(e.target.value)}
          className="text-xs px-2 py-1 rounded-md border"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface)",
            color: "var(--ink)",
          }}
        >
          <option value="all">All Quarters</option>
          {ALL_QUARTERS.map((q) => (
            <option key={q} value={q}>{q}</option>
          ))}
        </select>
        {(query || selectedCompany !== "all" || selectedQuarter !== "all") && (
          <button
            onClick={() => {
              setQuery("");
              setSelectedCompany("all");
              setSelectedQuarter("all");
            }}
            className="text-xs px-2 py-1 rounded-md"
            style={{ color: "var(--accent)" }}
          >
            Clear all
          </button>
        )}
      </div>

      {/* Results count */}
      <p className="text-xs" style={{ color: "var(--ink-muted)" }}>
        {filteredTranscripts.length} transcript{filteredTranscripts.length !== 1 ? "s" : ""} found
        {query && (
          <span>
            {" "}matching &ldquo;<span style={{ color: "var(--ink)" }}>{query}</span>&rdquo;
          </span>
        )}
      </p>

      {/* Transcript Cards */}
      <div className="space-y-3">
        {filteredTranscripts.map((t) => {
          const key = `${t.ticker}-${t.quarter}`;
          const isExpanded = expandedTranscript === key;
          const displayQuotes = isExpanded ? t.quotes : t.quotes.slice(0, 2);

          return (
            <div key={key} className="transcript-card surface-glass">
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                      {t.company}
                    </span>
                    <span
                      className="text-[0.68rem] font-medium px-1.5 py-0.5 rounded"
                      style={{
                        background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                        color: "var(--accent)",
                      }}
                    >
                      {t.ticker}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[0.72rem]" style={{ color: "var(--ink-muted)" }}>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays size={11} />
                      {t.quarter}
                    </span>
                    <span>{t.date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <User size={12} style={{ color: "var(--ink-muted)" }} />
                  <span className="text-[0.7rem]" style={{ color: "var(--ink-muted)" }}>
                    {t.speakers.map((s) => s.name).join(", ")}
                  </span>
                </div>
              </div>

              {/* Themes */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {t.themes.map((theme) => (
                  <span
                    key={theme}
                    className="inline-flex items-center gap-1 text-[0.66rem] px-1.5 py-0.5 rounded-full"
                    style={{
                      background: "color-mix(in srgb, var(--accent-2) 10%, transparent)",
                      color: "var(--accent-2)",
                      border: "1px solid color-mix(in srgb, var(--accent-2) 20%, transparent)",
                    }}
                  >
                    <Tag size={9} />
                    {theme}
                  </span>
                ))}
              </div>

              {/* Quotes */}
              <div className="space-y-2">
                {displayQuotes.map((quote, qi) => (
                  <div key={qi}>
                    <div className="transcript-speaker">
                      <MessageSquareQuote size={11} className="inline mr-1" />
                      {quote.speaker.name} ({quote.speaker.role})
                    </div>
                    <div className="transcript-quote">
                      {highlightMatch(quote.text, query)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Expand / Collapse */}
              {t.quotes.length > 2 && (
                <button
                  onClick={() => toggleTranscript(key)}
                  className="text-[0.72rem] font-medium mt-2"
                  style={{ color: "var(--accent)" }}
                >
                  {isExpanded
                    ? "Show less"
                    : `Show ${t.quotes.length - 2} more quote${t.quotes.length - 2 > 1 ? "s" : ""}`}
                </button>
              )}
            </div>
          );
        })}

        {filteredTranscripts.length === 0 && (
          <div
            className="text-center py-10 text-sm"
            style={{ color: "var(--ink-muted)" }}
          >
            No transcripts match your search. Try different keywords or adjust filters.
          </div>
        )}
      </div>
    </div>
  );
}
