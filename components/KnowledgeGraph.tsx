'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppContext } from '@/lib/store';
import { adjustKnowledgeGraph } from '@/lib/ai';
import { Loader2, Send, Wand2, X, BrainCircuit, Target, BookOpen } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import * as d3 from 'd3';
import { clsx } from 'clsx';

export function KnowledgeGraph() {
  const { state, dispatch } = useAppContext();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const collapsedIds = useRef<Set<string>>(new Set());
  
  const [command, setCommand] = useState('');
  const [loading, setLoading] = useState(false);
  const [renderTrigger, setRenderTrigger] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editNodeName, setEditNodeName] = useState('');

  // Reset collapsed state and selection when subject changes
  useEffect(() => {
    collapsedIds.current.clear();
    setSelectedNodeId(null);
    setEditingNodeId(null);
    setRenderTrigger(prev => prev + 1);
  }, [state.currentSubject]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const subjectNodes = state.knowledgeNodes.filter(n => n.subject === state.currentSubject);
    const rootNode = subjectNodes.find(n => n.parentId === null);
    if (!rootNode) return;

    const buildTree = (parentId: string): any => {
      const children = subjectNodes.filter(n => n.parentId === parentId);
      return {
        id: parentId,
        name: subjectNodes.find(n => n.id === parentId)?.name || '',
        children: children.length > 0 ? children.map(c => buildTree(c.id)) : null
      };
    };

    const treeData = buildTree(rootNode.id);

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;
    const margin = { top: 40, right: 120, bottom: 40, left: 120 };

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    let g = svg.select<SVGGElement>('g.main-group');
    if (g.empty()) {
      g = svg.append('g').attr('class', 'main-group');
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 3])
        .on('zoom', (e) => {
          g.attr('transform', e.transform);
        });
      svg.call(zoom);
      
      // Initial center
      svg.call(zoom.transform, d3.zoomIdentity.translate(margin.left, height / 2));
      zoomRef.current = zoom;
    }

    g.selectAll('*').remove();

    const root = d3.hierarchy(treeData);

    // Apply collapsed state
    root.descendants().forEach((d: any) => {
      if (collapsedIds.current.has(d.data.id) && d.children) {
        d._children = d.children;
        d.children = null;
      }
    });

    // Use nodeSize for dynamic height to prevent overlap
    const dx = 40; // vertical spacing
    const dy = 200; // horizontal spacing
    const treeLayout = d3.tree().nodeSize([dx, dy]);
    treeLayout(root);

    // Helper for mastery color
    const getNodeMastery = (nodeId: string) => {
      const mems = state.memories.filter(m => m.knowledgeNodeIds.includes(nodeId));
      if (mems.length === 0) return null;
      const sum = mems.reduce((acc, m) => acc + m.confidence, 0);
      return sum / mems.length;
    };

    const getNodeColor = (mastery: number | null) => {
      if (mastery === null) return '#cbd5e1'; // slate-300
      if (mastery < 40) return '#ef4444'; // red-500
      if (mastery < 70) return '#f59e0b'; // amber-500
      return '#22c55e'; // green-500
    };

    // Links
    g.selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', 2)
      .attr('d', d3.linkHorizontal()
        .x((d: any) => d.y)
        .y((d: any) => d.x) as any);

    // Nodes
    const node = g.selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => `translate(${d.y},${d.x})`)
      .style('cursor', 'pointer')
      .on('click', (event, d: any) => {
        // Toggle collapse if it has children
        if (d.data.children && d.data.children.length > 0) {
          if (collapsedIds.current.has(d.data.id)) {
            collapsedIds.current.delete(d.data.id);
          } else {
            collapsedIds.current.add(d.data.id);
          }
          setRenderTrigger(prev => prev + 1);
        }
        
        setSelectedNodeId(d.data.id);

        // Center the clicked node
        if (zoomRef.current && svgRef.current) {
          const currentTransform = d3.zoomTransform(svgRef.current);
          const scale = currentTransform.k;
          d3.select(svgRef.current).transition().duration(750).call(
            zoomRef.current.transform,
            d3.zoomIdentity.translate(width / 2 - d.y * scale, height / 2 - d.x * scale).scale(scale)
          );
        }
      });

    node.append('circle')
      .attr('r', (d: any) => d.data.id === selectedNodeId ? 8 : 6)
      .attr('fill', (d: any) => getNodeColor(getNodeMastery(d.data.id)))
      .attr('stroke', (d: any) => d.data.id === selectedNodeId ? '#3b82f6' : '#fff')
      .attr('stroke-width', 2);

    // Text with white outline to prevent overlap issues
    node.append('text')
      .attr('dy', '.35em')
      .attr('x', (d: any) => (d.children || d._children) ? -12 : 12)
      .style('text-anchor', (d: any) => (d.children || d._children) ? 'end' : 'start')
      .text((d: any) => d.data.name)
      .attr('font-size', (d: any) => d.data.id === selectedNodeId ? '14px' : '12px')
      .attr('fill', (d: any) => d.data.id === selectedNodeId ? '#2563eb' : '#334155')
      .attr('font-weight', (d: any) => d.data.id === selectedNodeId ? '700' : '500')
      .clone(true).lower()
      .attr('stroke', 'white')
      .attr('stroke-width', 3)
      .attr('stroke-linejoin', 'round');

  }, [state.knowledgeNodes, state.memories, state.currentSubject, renderTrigger, selectedNodeId]);

  const handleAdjust = async () => {
    if (!command.trim() || loading) return;
    setLoading(true);

    try {
      const subjectNodes = state.knowledgeNodes.filter(n => n.subject === state.currentSubject);
      const operations = await adjustKnowledgeGraph(command, state.currentSubject, subjectNodes, state.settings);
      
      for (const op of operations) {
        if (op.action === 'add') {
          dispatch({
            type: 'ADD_NODE',
            payload: { id: uuidv4(), subject: state.currentSubject, name: op.name, parentId: op.parentId }
          });
        } else if (op.action === 'delete') {
          dispatch({ type: 'DELETE_NODE', payload: op.nodeId });
        } else if (op.action === 'rename') {
          const node = state.knowledgeNodes.find(n => n.id === op.nodeId);
          if (node) {
            dispatch({ type: 'UPDATE_NODE', payload: { ...node, name: op.name } });
          }
        } else if (op.action === 'move') {
          const node = state.knowledgeNodes.find(n => n.id === op.nodeId);
          if (node) {
            dispatch({ type: 'UPDATE_NODE', payload: { ...node, parentId: op.parentId } });
          }
        }
      }
      setCommand('');
    } catch (error) {
      console.error('Failed to adjust graph:', error);
      alert('调整失败，请检查指令或网络。');
    } finally {
      setLoading(false);
    }
  };

  const selectedNode = state.knowledgeNodes.find(n => n.id === selectedNodeId);
  const nodeMemories = selectedNode 
    ? state.memories.filter(m => m.knowledgeNodeIds.includes(selectedNode.id))
    : [];
  const nodeMastery = nodeMemories.length > 0 
    ? nodeMemories.reduce((acc, m) => acc + m.confidence, 0) / nodeMemories.length 
    : null;

  return (
    <div className="p-6 h-full flex flex-col">
      <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <BrainCircuit className="w-5 h-5 text-blue-500" />
        {state.currentSubject} 知识图谱
        <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-md">支持拖拽、滚轮缩放、点击折叠</span>
      </h2>
      
      <div className="flex-1 flex gap-4 overflow-hidden">
        <div 
          ref={containerRef}
          className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative"
        >
          <svg ref={svgRef} className="w-full h-full cursor-grab active:cursor-grabbing"></svg>
          
          {/* AI Adjustment Bar */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4">
            <div className="bg-white/90 backdrop-blur-md border border-slate-200 shadow-lg rounded-xl p-2 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                <Wand2 className="w-4 h-4 text-purple-600" />
              </div>
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdjust()}
                placeholder="AI 助手：输入指令调整图谱，如“在代数下添加复数节点”..."
                className="flex-1 bg-transparent border-none outline-none text-sm text-slate-700 placeholder:text-slate-400"
              />
              <button
                onClick={handleAdjust}
                disabled={!command.trim() || loading}
                className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Side Panel for Selected Node */}
        {selectedNode && (
          <div className="w-80 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden shrink-0">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              {editingNodeId === selectedNode.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editNodeName}
                    onChange={(e) => setEditNodeName(e.target.value)}
                    className="flex-1 p-1.5 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      dispatch({ type: 'UPDATE_NODE', payload: { ...selectedNode, name: editNodeName } });
                      setEditingNodeId(null);
                    }}
                    className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => setEditingNodeId(null)}
                    className="text-xs px-2 py-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-500" />
                    {selectedNode.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingNodeId(selectedNode.id);
                        setEditNodeName(selectedNode.name);
                      }}
                      className="text-slate-400 hover:text-blue-500"
                      title="编辑节点名称"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    </button>
                    {selectedNode.parentId !== null && (
                      <button
                        onClick={() => {
                          if (confirm('确定要删除此节点吗？相关的记忆将失去此节点的关联。')) {
                            dispatch({ type: 'DELETE_NODE', payload: selectedNode.id });
                            setSelectedNodeId(null);
                          }
                        }}
                        className="text-slate-400 hover:text-red-500"
                        title="删除节点"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                      </button>
                    )}
                    <button onClick={() => setSelectedNodeId(null)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
            
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600">知识掌握度</span>
                <span className={clsx(
                  "text-sm font-bold",
                  nodeMastery === null ? "text-slate-400" :
                  nodeMastery < 40 ? "text-red-500" :
                  nodeMastery < 70 ? "text-amber-500" : "text-green-500"
                )}>
                  {nodeMastery === null ? '暂无数据' : `${Math.round(nodeMastery)}%`}
                </span>
              </div>
              {nodeMastery !== null && (
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className={clsx(
                      "h-full transition-all duration-500",
                      nodeMastery < 40 ? "bg-red-500" :
                      nodeMastery < 70 ? "bg-amber-500" : "bg-green-500"
                    )}
                    style={{ width: `${nodeMastery}%` }}
                  />
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <BookOpen className="w-3 h-3" />
                关联记忆 ({nodeMemories.length})
              </h4>
              <div className="space-y-3">
                {nodeMemories.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">暂无关联记忆</p>
                ) : (
                  nodeMemories.map(m => (
                    <div key={m.id} className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                      <p className="text-slate-700 line-clamp-3 mb-2">{m.content}</p>
                      {m.analysisProcess && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded text-xs text-blue-800 whitespace-pre-wrap leading-relaxed mb-2">
                          <span className="font-semibold">AI 分析：</span>{m.analysisProcess}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs">
                        <span className={clsx(
                          "px-2 py-0.5 rounded-full",
                          m.isMistake ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                        )}>
                          {m.isMistake ? '错题' : m.functionType}
                        </span>
                        <span className="text-slate-400">{Math.round(m.confidence)}% 掌握</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
