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
        style: { stroke: '#9ca3af', strokeWidth: 1.5 },
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
        <div className="text-gray-500">加载图谱中...</div>
      </div>
    )
  }

  if (nodes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-gray-400">
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
        <div className="absolute right-4 top-4 w-72 bg-white rounded-xl shadow-lg border border-gray-200 p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-gray-900">{(selectedNode.data as any).label}</h3>
            <button
              onClick={() => setSelectedNodeId(null)}
              className="text-gray-400 hover:text-gray-600"
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
                : 'bg-gray-100 text-gray-600'
            }`}>
              {(selectedNode.data as any).masteryLevel === 'UNDERSTOOD' ? '● 已理解' :
               (selectedNode.data as any).masteryLevel === 'EXPOSED' ? '◑ 有印象' : '○ 接触过'}
            </span>
          </div>
          {(selectedNode.data as any).description && (
            <p className="text-sm text-gray-600">{(selectedNode.data as any).description}</p>
          )}

          {/* Related Conversations */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-700 mb-2">相关对话</h4>
            {loadingRelated ? (
              <div className="text-xs text-gray-400">加载中...</div>
            ) : relatedConversations.length > 0 ? (
              <div className="space-y-2">
                {relatedConversations.map(conv => (
                  <a
                    key={conv.id}
                    href={`/topic/${topicId}?conversation=${conv.id}`}
                    className="block text-xs p-2 rounded bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="font-medium text-gray-800 truncate">{conv.title}</div>
                    <div className="text-gray-500 truncate">{conv.snippet}</div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-400">暂无相关对话</div>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-sm border border-gray-200 px-3 py-2 text-xs text-gray-500 flex gap-4">
        <span>● 已理解</span>
        <span>◑ 有印象</span>
        <span>○ 接触过</span>
        <span>共 {nodes.length} 个知识点</span>
      </div>
    </div>
  )
}
