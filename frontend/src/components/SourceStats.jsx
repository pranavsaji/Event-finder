export default function SourceStats({ events }) {
  if (!events.length) return null

  const counts = events.reduce((acc, ev) => {
    acc[ev.source] = (acc[ev.source] || 0) + 1
    return acc
  }, {})

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])

  return (
    <div className="flex flex-wrap gap-2">
      {sorted.map(([source, count]) => (
        <div
          key={source}
          className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] rounded-full px-3 py-1 text-xs text-slate-400"
        >
          <span className="text-slate-300 font-medium">{source}</span>
          <span className="bg-white/10 rounded-full px-1.5 py-0.5 text-[10px]">{count}</span>
        </div>
      ))}
    </div>
  )
}
