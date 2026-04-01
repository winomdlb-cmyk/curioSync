'use client'

import { Handle, Position } from '@xyflow/react'

interface CustomNodeProps {
  data: {
    label: string
    masteryLevel: 'UNAWARE' | 'EXPOSED' | 'UNDERSTOOD'
    description?: string
    isNew?: boolean
  }
}

export default function CustomNode({ data }: CustomNodeProps) {
  const { label, masteryLevel, isNew } = data

  const size = masteryLevel === 'UNDERSTOOD' ? 50 : masteryLevel === 'EXPOSED' ? 44 : 40

  const style = masteryLevel === 'UNDERSTOOD'
    ? {
        width: size,
        height: size,
        background: 'var(--primary-light)',
        border: '2px solid var(--color-blue-700)',
        color: 'var(--primary-foreground)',
        fontWeight: 'bold' as const,
      }
    : masteryLevel === 'EXPOSED'
    ? {
        width: size,
        height: size,
        background: 'var(--color-blue-100)',
        border: '2px solid var(--color-blue-300)',
        color: 'var(--color-blue-700)',
      }
    : {
        width: size,
        height: size,
        background: 'white',
        border: '2px solid var(--color-gray-300)',
        color: 'var(--color-gray-500)',
      }

  return (
    <div
      className={`flex items-center justify-center rounded-full text-xs text-center cursor-pointer ${isNew ? 'node-appear' : ''}`}
      style={style}
      title={label}
    >
      <span className="truncate max-w-[60px]">{label.slice(0, 6)}</span>
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  )
}
