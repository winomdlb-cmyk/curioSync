'use client'

import { useState, useEffect } from 'react'
import ConvergeCard from '@/components/Intervention/ConvergeCard'
import TransitionCard from '@/components/Intervention/TransitionCard'
import BookmarkToast from '@/components/Intervention/BookmarkToast'

export interface InterventionData {
  type: 'converge' | 'transition' | 'bookmark'
  content: {
    summary?: string
    options?: string[]
    stage_summary?: string
    next_directions?: Array<{
      label: string
      description: string
    }>
    bookmark_title?: string
    bookmark_description?: string
  }
}

interface InterventionOverlayProps {
  intervention: InterventionData | null
  onDismiss: () => void
  onOptionSelect?: (option: string) => void
  onDirectionClick?: (label: string) => void
}

export function InterventionOverlay({
  intervention,
  onDismiss,
  onOptionSelect,
  onDirectionClick,
}: InterventionOverlayProps) {
  const [showBookmarkToast, setShowBookmarkToast] = useState(false)

  useEffect(() => {
    if (intervention?.type === 'bookmark') {
      setShowBookmarkToast(true)
    }
  }, [intervention])

  if (!intervention) return null

  if (intervention.type === 'bookmark') {
    return showBookmarkToast ? (
      <BookmarkToast
        bookmarkTitle={intervention.content.bookmark_title || ''}
        bookmarkDescription={intervention.content.bookmark_description || ''}
        onDismiss={() => {
          setShowBookmarkToast(false)
          onDismiss()
        }}
      />
    ) : null
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="max-w-md w-full">
        {intervention.type === 'converge' && (
          <ConvergeCard
            summary={intervention.content.summary || ''}
            options={intervention.content.options || []}
            onOptionSelect={(option) => {
              onOptionSelect?.(option)
              onDismiss()
            }}
            onDismiss={onDismiss}
          />
        )}
        {intervention.type === 'transition' && (
          <TransitionCard
            stageSummary={intervention.content.stage_summary || ''}
            nextDirections={intervention.content.next_directions || []}
            onDirectionClick={(label) => {
              onDirectionClick?.(label)
              onDismiss()
            }}
            onDismiss={onDismiss}
          />
        )}
      </div>
    </div>
  )
}
