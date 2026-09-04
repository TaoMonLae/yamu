"use client";

type Metric = {
  label: string;
  value: string | number;
  detail: string;
  emphasis?: boolean;
};

export default function Dashboard1({ metrics }: { metrics: Metric[] }) {
  return (
    <section aria-label="Workspace metrics" className="grid border-l border-t border-pewter sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric, index) => (
        <article key={metric.label} className="min-h-36 border-b border-r border-pewter bg-paper p-5">
          <div className="flex items-start justify-between gap-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.11em] text-stone">0{index + 1} / {metric.label}</span>
            {metric.emphasis ? <span className="h-2 w-2 bg-[var(--index-accent)]" aria-label="Needs attention" /> : null}
          </div>
          <div className="mt-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-[34px] font-semibold leading-none tracking-[-0.045em] text-ink">{metric.value}</p>
              <p className="mt-3 text-[11px] text-stone">{metric.detail}</p>
            </div>
            <span aria-hidden className={`h-8 w-1 ${metric.emphasis ? "bg-[var(--index-accent)]" : "bg-pewter"}`} />
          </div>
        </article>
      ))}
    </section>
  );
}
