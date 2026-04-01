'use client'

import { useState, useEffect, useRef } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { getKnowledgeGraph, getRelatedConversations, RelatedConversationItem } from '@/lib/api'
import CustomNode from './CustomNode'

interface KnowledgeMapViewProps {
  topicId: string
}

const nodeTypes: NodeTypes = {
  custom: CustomNode as any,
}

export default function KnowledgeMapView({ topicId }: KnowledgeMapViewProps) {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [relatedConversations, setRelatedConversations] = useState<RelatedConversationItem[]>([])
  const [loadingRelated, setLoadingRelated] = useState(false)
  const previousNodeIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    loadGraph()
  }, [topicId])

  useEffect(() => {
    if (selectedNodeId && nodes.length > 0) {
      const selectedNode = nodes.find(n => n.id === selectedNodeId)
      if (selectedNode) {
        const label = (selectedNode.data as any).label
        setLoadingRelated(true)
        getRelatedConversations(topicId, label)
          .then(res => setRelatedConversations(res.conversations || []))
          .catch(() => setRelatedConversations([]))
          .finally(() => setLoadingRelated(false))
      }
    } else {
      setRelatedConversations([])
    }
  }, [selectedNodeId, nodes, topicId])

  async function loadGraph() {
    try {
      const data = await getKnowledgeGraph(topicId)

      const currentNodeIds = new Set<string>(data.nodes?.map((n: any) => n.id) || [])

      // 找出真正新增的节点（之前没有的）
      const newNodeIds = [...currentNodeIds].filter(id => !previousNodeIds.current.has(id))

      const flowNodes: Node[] = data.nodes?.map((node: any) => ({
        id: node.id,
        type: 'custom',
        position: node.position || { x: 0, y: 0 },
        data: {
          label: node.label,
          masteryLevel: node.mastery_level,
          description: node.description,
          isNew: newNodeIds.includes(node.id),
        },
      })) || []

      const flowEdges: Edge[] = data.edges?.map((edge: any) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.relation,
        type: 'smoothstep',
        animated: false,
        style: { stroke: 'var(--color-gray-400)', strokeWidth: 1.5 },
      })) || []

      // 更新之前的节点 ID 集合
      previousNodeIds.current = currentNodeIds

      setNodes(flowNodes)
      setEdges(flowEdges)
    } catch (error) {
      console.error('Failed to load graph:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-[--color-muted-foreground]">加载图谱中...</div>
      </div>
    )
  }

  if (nodes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-[--color-muted-foreground]">
          <div className="text-lg mb-2">开始对话后，知识图谱会在这里自动生长 ✦</div>
        </div>
      </div>
    )
  }

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null

  return (
    <div className="h-full w-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={(_, node) => setSelectedNodeId(node.id)}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.5}
        maxZoom={2}
      >
        <Background />
        <Controls />
        {nodes.length > 20 && <MiniMap />}
      </ReactFlow>

      {/* Node Detail Panel */}
      {selectedNode && (
        <div className="absolute right-4 top-4 w-72 bg-[--color-card] rounded-xl shadow-lg border border-[--color-border] p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-[--color-foreground]">{(selectedNode.data as any).label}</h3>
            <button
              onClick={() => setSelectedNodeId(null)}
              className="text-[--color-muted-foreground] hover:text-[--color-foreground]"
            >
              ×
            </button>
          </div>
          <div className="mb-3">
            <span className={`inline-block px-2 py-1 text-xs rounded-full ${
              (selectedNode.data as any).masteryLevel === 'UNDERSTOOD'
                ? 'bg-blue-100 text-blue-700'
                : (selectedNode.data as any).masteryLevel === 'EXPOSED'
                ? 'bg-blue-50 text-blue-600'
                : 'bg-[--color-muted] text-[--color-muted-foreground]'
            }`}>
              {(selectedNode.data as any).masteryLevel === 'UNDERSTOOD' ? '● 已理解' :
               (selectedNode.data as any).masteryLevel === 'EXPOSED' ? '◑ 有印象' : '○ 接触过'}
            </span>
          </div>
          {(selectedNode.data as any).description && (
            <p className="text-sm text-[--color-muted-foreground]">{(selectedNode.data as any).description}</p>
          )}

          {/* Related Conversations */}
          <div className="mt-4 pt-4 border-t border-[--color-border]">
            <h4 className="text-sm font-medium text-[--color-foreground] mb-2">相关对话</h4>
            {loadingRelated ? (
              <div className="text-xs text-[--color-muted-foreground]">加载中...</div>
            ) : relatedConversations.length > 0 ? (
              <div className="space-y-2">
                {relatedConversations.map(conv => (
                  <a
                    key={conv.id}
                    href={`/topic/${topicId}?conversation=${conv.id}`}
                    className="block text-xs p-2 rounded bg-[--color-muted] hover:bg-[--color-accent] transition-colors"
                  >
                    <div className="font-medium text-[--color-foreground] truncate">{conv.title}</div>
                    <div className="text-[--color-muted-foreground] truncate">{conv.snippet}</div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-xs text-[--color-muted-foreground]">暂无相关对话</div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-[--color-card] rounded-lg shadow-sm border border-[--color-border] px-3 py-2 text-xs text-[--color-muted-foreground] flex gap-4">
        <span>● 已理解</span>
        <span>◑ 有印象</span>
        <span>○ 接触过</span>
        <span>共 {nodes.length} 个知识点</span>
      </div>
    </div>
  )
}
