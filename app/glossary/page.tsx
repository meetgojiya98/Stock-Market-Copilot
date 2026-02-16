"use client";
import PageShell from "../../components/PageShell";
import Glossary from "../../components/Glossary";

export default function GlossaryPage() {
  return (
    <PageShell
      eyebrow="Learn"
      title="Stock Market Glossary"
      subtitle="Look up any term you don't know — explained in plain English."
      badges={["A-Z Terms", "Plain Language"]}
    >
      <Glossary />
    </PageShell>
  );
}
