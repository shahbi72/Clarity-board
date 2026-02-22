"use client";

import { useEffect, useState } from "react";

type ActiveDataset = {
  id: string;
  name: string;
};

type Summary = {
  dataset?: ActiveDataset | null;
  activeDataset?: ActiveDataset | null;
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/dashboard/summary", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: Summary | { error?: string }) => {
        if (!isMounted) return;
        if (data && typeof data === "object" && "error" in data && data.error) {
          throw new Error(data.error);
        }
        setSummary(data as Summary);
      })
      .catch((fetchError: unknown) => {
        if (!isMounted) return;
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load dashboard.");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (error) return <div>{error}</div>;
  if (!summary) return <div>Loading...</div>;

  const activeDataset = summary.activeDataset ?? summary.dataset ?? null;

  if (!activeDataset) {
    return <h1>No Active Dataset</h1>;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* IMPORTANT: this heading is used by e2e assertions */}
      <h1 data-testid="dataset-name" className="text-2xl font-semibold tracking-tight">
        {activeDataset.name}
      </h1>

      <section>
        <h2 className="text-lg font-semibold">Recent Transactions</h2>
      </section>
    </div>
  );
}
