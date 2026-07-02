import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Transaction } from "./data";

const COLORS = [
  "#c73e3a",
  "#d4953a",
  "#5b7fb5",
  "#7c5bb5",
  "#4a9e6b",
  "#c95a8a",
  "#6b5bb5",
];

export function ExpenseChart({
  transactions,
}: {
  transactions: Transaction[];
}) {
  const expenses = transactions.filter((t) => t.type === "expense");

  if (expenses.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-5 text-center text-sm text-muted-foreground">
        No data yet
      </div>
    );
  }

  const map = new Map<string, number>();
  expenses.forEach((t) =>
    map.set(t.category, (map.get(t.category) || 0) + Number(t.amount))
  );

  const data = Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Expense Breakdown
      </h3>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={40}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.[0] ? (
                  <div className="rounded-md border bg-card px-3 py-2 text-sm shadow-sm">
                    <p className="font-medium">{payload[0].name}</p>
                    <p className="text-muted-foreground">
                      Rp {Number(payload[0].value).toLocaleString("id-ID")}
                    </p>
                  </div>
                ) : null
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 space-y-1.5">
        {data.slice(0, 5).map((d, i) => (
          <div key={d.name} className="flex items-center gap-2 text-sm">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="flex-1 truncate text-muted-foreground">
              {d.name}
            </span>
            <span className="font-medium tabular-nums">
              {((d.value / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
