// Chip delta ▲/▼/＝ ±x.x — ngưỡng epsilon ±0.05 + thang màu emerald/rose/slate dùng CHUNG
// (task 76 — trước đây 3 bản chép: LoadoutView delta-vs-equipped + BenchPanel ×2 delta/solverDelta).
// Đổi ngưỡng/màu ở đây là đổi MỌI delta trong app — giữ đồng bộ, đừng thêm bản chép mới.

export default function DeltaBadge({ delta, title, className = '' }: {
  delta: number
  title?: string
  className?: string
}) {
  const cls = delta > 0.05 ? 'text-emerald-400' : delta < -0.05 ? 'text-rose-400' : 'text-slate-500'
  const icon = delta > 0.05 ? '▲' : delta < -0.05 ? '▼' : '＝'
  return (
    <span className={`font-mono ${cls} ${className}`.trimEnd()} title={title}>
      {icon} {delta >= 0 ? '+' : ''}{delta.toFixed(1)}
    </span>
  )
}
