type ProgressBarProps = {
  label: string;
  value: number;
  max?: number;
  tone?: "charge" | "warn" | "danger" | "info";
};

export function ProgressBar({ label, value, max = 100, tone = "charge" }: ProgressBarProps) {
  const width = Math.max(0, Math.min(100, (value / max) * 100));
  const toneClass = tone === "charge" ? "" : tone;

  return (
    <div className="bar-row">
      <span>{label}</span>
      <div className={`track ${toneClass}`} aria-hidden="true">
        <span style={{ width: `${width}%` }} />
      </div>
      <strong>
        {value}
        {max === 100 ? "%" : ""}
      </strong>
    </div>
  );
}

type BarChartItem = {
  label: string;
  value: number;
};

export function BarChart({ items }: { items: BarChartItem[] }) {
  const peak = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="bar-chart" role="img" aria-label="Swap volume by hour">
      {items.map((item) => (
        <div key={item.label} className="bar-col" title={`${item.label}: ${item.value}`}>
          <div className="fill" style={{ height: `${(item.value / peak) * 100}%` }} />
          <small>{item.label}</small>
        </div>
      ))}
    </div>
  );
}
