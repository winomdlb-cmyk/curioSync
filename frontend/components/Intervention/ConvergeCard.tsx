'use client'

import { useState } from 'react'

interface ConvergeCardProps {
  summary: string
  options: string[]
  onOptionSelect?: (option: string) => void
  onDismiss?: () => void
}

export default function ConvergeCard({
  summary,
  options,
  onOptionSelect,
  onDismiss,
}: ConvergeCardProps) {
  const [selected, setSelected] = useState<string | null>(null)

  const handleOptionClick = (option: string) => {
    setSelected(option)
    onOptionSelect?.(option)
  }

  return (
    <div className="bg-[--color-card] rounded-xl shadow-lg p-5 max-w-md mx-auto border border-[--color-border]">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
          <span className="text-blue-600 text-sm">◷</span>
        </div>
        <div>
          <h3 className="text-sm font-medium text-[--color-muted-foreground] uppercase tracking-wide">
            收敛聚焦
          </h3>
        </div>
      </div>

      <p className="text-[--color-foreground] text-sm leading-relaxed mb-5">
        {summary}
      </p>

      <div className="flex gap-3">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => handleOptionClick(option)}
            disabled={selected !== null}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              selected === option
                ? 'bg-[--color-primary] text-[--color-primary-foreground]'
                : 'bg-[--color-muted] text-[--color-foreground] hover:bg-[--color-accent]'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="mt-3 text-xs text-[--color-muted-foreground] hover:text-[--color-foreground] w-full text-center"
        >
          稍后再说
        </button>
      )}
    </div>
  )
}