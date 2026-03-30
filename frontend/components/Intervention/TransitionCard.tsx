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
    <div className="bg-white rounded-xl shadow-lg p-5 max-w-md mx-auto border border-gray-100">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
          <span className="text-green-600 text-sm">→</span>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            阶段跃迁
          </h3>
        </div>
      </div>

      <p className="text-gray-700 text-sm leading-relaxed mb-5">
        {stageSummary}
      </p>

      <div className="space-y-2 mb-4">
        {nextDirections.map((direction, index) => (
          <button
            key={index}
            onClick={() => onDirectionClick?.(direction.label)}
            className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-800 group-hover:text-blue-700">
                {direction.label}
              </span>
              <span className="text-xs text-gray-400 group-hover:text-blue-500">
                →
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {direction.description}
            </p>
          </button>
        ))}
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="mt-2 text-xs text-gray-400 hover:text-gray-600 w-full text-center"
        >
          暂时跳过
        </button>
      )}
    </div>
  )
}