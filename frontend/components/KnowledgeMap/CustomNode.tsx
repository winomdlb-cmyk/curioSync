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
        background: '#3b82f6',
        border: '2px solid #1d4ed8',
        color: 'white',
        fontWeight: 'bold' as const,
      }
    : masteryLevel === 'EXPOSED'
    ? {
        width: size,
        height: size,
        background: '#dbeafe',
        border: '2px solid #93c5fd',
        color: '#1d4ed8',
      }
    : {
        width: size,
        height: size,
        background: 'white',
        border: '2px solid #d1d5db',
        color: '#6b7280',
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
