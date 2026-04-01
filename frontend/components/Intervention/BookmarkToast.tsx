'use client'

import { useState, useEffect } from 'react'

interface BookmarkToastProps {
  bookmarkTitle: string
  bookmarkDescription: string
  onDismiss?: () => void
  autoHideDuration?: number
}

export default function BookmarkToast({
  bookmarkTitle,
  bookmarkDescription,
  onDismiss,
  autoHideDuration = 5000,
}: BookmarkToastProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isHiding, setIsHiding] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss()
    }, autoHideDuration)

    return () => clearTimeout(timer)
  }, [autoHideDuration])

  const handleDismiss = () => {
    setIsHiding(true)
    setTimeout(() => {
      setIsVisible(false)
      onDismiss?.()
    }, 300)
  }

  if (!isVisible) return null

  return (
    <div
      className={`fixed bottom-6 right-6 bg-[--color-card] rounded-lg shadow-lg border border-[--color-border] p-4 max-w-xs transition-all duration-300 ${
        isHiding ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-6 h-6 rounded bg-yellow-100 flex items-center justify-center shrink-0">
          <span className="text-yellow-600 text-xs">★</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[--color-foreground]">
            {bookmarkTitle}
          </p>
          <p className="text-xs text-[--color-muted-foreground] mt-0.5">
            {bookmarkDescription}
          </p>
          <p className="text-xs text-[--color-muted-foreground] mt-1">
            已加入书签
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-[--color-muted-foreground] hover:text-[--color-foreground] text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  )
}