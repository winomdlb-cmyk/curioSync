'use client'

interface NextDirection {
  label: string
  description: string
}

interface TransitionCardProps {
  stageSummary: string
  nextDirections: NextDirection[]
  onDirectionClick?: (label: string) => void
  onDismiss?: () => void
}

export default function TransitionCard({
  stageSummary,
  nextDirections,
  onDirectionClick,
  onDismiss,
}: TransitionCardProps) {
  return (
    <div className="bg-[--color-card] rounded-xl shadow-lg p-5 max-w-md mx-auto border border-[--color-border]">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
          <span className="text-green-600 text-sm">→</span>
        </div>
        <div>
          <h3 className="text-sm font-medium text-[--color-muted-foreground] uppercase tracking-wide">
            阶段跃迁
          </h3>
        </div>
      </div>

      <p className="text-[--color-foreground] text-sm leading-relaxed mb-5">
        {stageSummary}
      </p>

      <div className="space-y-2 mb-4">
        {nextDirections.map((direction, index) => (
          <button
            key={index}
            onClick={() => onDirectionClick?.(direction.label)}
            className="w-full text-left p-3 rounded-lg border border-[--color-border] hover:border-[--color-primary] hover:bg-[--color-accent] transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-[--color-foreground] group-hover:text-[--color-primary]">
                {direction.label}
              </span>
              <span className="text-xs text-[--color-muted-foreground] group-hover:text-[--color-primary]">
                →
              </span>
            </div>
            <p className="text-xs text-[--color-muted-foreground] mt-1">
              {direction.description}
            </p>
          </button>
        ))}
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="mt-2 text-xs text-[--color-muted-foreground] hover:text-[--color-foreground] w-full text-center"
        >
          暂时跳过
        </button>
      )}
    </div>
  )
}