export function MetricList({
  items,
}: {
  items: Array<{ label: string; value: string }>
}) {
  return (
    <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
      {items.map((item) => (
        <div className="flex flex-col gap-1" key={item.label}>
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="font-medium">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
