import React, { useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  ControlButton,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Settings, Trash2, ArrowLeft, Type, Palette, Hexagon, Circle, Square, CornerDownRight, Link as LinkIcon, Undo2, Redo2, Save, Copy } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Field } from './VideoEditor';
import CustomShapeNode, { type DiagramNodeData } from './diagram/CustomShapeNode';
import { useTheme } from 'next-themes';
import { useDiagramHistory } from './diagram/useDiagramHistory';

const nodeTypes = {
  customShape: CustomShapeNode,
};

export interface Diagram {
  id: string;
  name: string;
  nodes: Node<DiagramNodeData>[];
  edges: Edge[];
}

export interface DiagramXBlockData {
  diagrams: Diagram[];
  start_diagram_id: string;
}

interface DiagramEditorProps {
  displayName: string;
  onDisplayNameChange: (v: string) => void;
  diagramData: DiagramXBlockData;
  onDiagramDataChange: (v: DiagramXBlockData) => void;
  onSave?: () => void;
  onCancel?: () => void;
  isSaving?: boolean;
}

const defaultDiagram: Diagram = {
  id: 'root',
  name: 'Main Diagram',
  nodes: [],
  edges: [],
};

export default function DiagramEditor({
  displayName,
  onDisplayNameChange,
  diagramData,
  onDiagramDataChange,
  onSave,
  onCancel,
  isSaving,
}: DiagramEditorProps) {
  const { theme } = useTheme();
  
  const { undo, redo, takeSnapshot, canUndo, canRedo } = useDiagramHistory(diagramData, onDiagramDataChange);
  
  const diagrams = diagramData?.diagrams?.length > 0 ? diagramData.diagrams : [defaultDiagram];
  const startDiagramId = diagramData?.start_diagram_id || diagrams[0].id;

  const [activeDiagramId, setActiveDiagramId] = useState<string>(startDiagramId);
  const activeDiagramIndex = diagrams.findIndex(d => d.id === activeDiagramId) >= 0 ? diagrams.findIndex(d => d.id === activeDiagramId) : 0;
  const activeDiagram = diagrams[activeDiagramIndex];

  const [selectedNode, setSelectedNode] = useState<Node<DiagramNodeData> | null>(null);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const newNodes = applyNodeChanges(changes, activeDiagram.nodes);
      const newDiagrams = [...diagrams];
      newDiagrams[activeDiagramIndex] = { ...activeDiagram, nodes: newNodes as Node<DiagramNodeData>[] };
      onDiagramDataChange({ ...diagramData, diagrams: newDiagrams });
    },
    [activeDiagram, activeDiagramIndex, diagrams, diagramData, onDiagramDataChange]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const newEdges = applyEdgeChanges(changes, activeDiagram.edges);
      const newDiagrams = [...diagrams];
      newDiagrams[activeDiagramIndex] = { ...activeDiagram, edges: newEdges };
      onDiagramDataChange({ ...diagramData, diagrams: newDiagrams });
    },
    [activeDiagram, activeDiagramIndex, diagrams, diagramData, onDiagramDataChange]
  );

  const onNodeDragStop = useCallback(() => {
    takeSnapshot(diagramData);
  }, [diagramData, takeSnapshot]);

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      const newEdges = addEdge(params, activeDiagram.edges);
      const newDiagrams = [...diagrams];
      newDiagrams[activeDiagramIndex] = { ...activeDiagram, edges: newEdges };
      const newData = { ...diagramData, diagrams: newDiagrams };
      onDiagramDataChange(newData);
      takeSnapshot(newData);
    },
    [activeDiagram, activeDiagramIndex, diagrams, diagramData, onDiagramDataChange, takeSnapshot]
  );

  const addNode = (shape: 'rectangle' | 'rounded' | 'ellipse') => {
    const newNode: Node<DiagramNodeData> = {
      id: uuidv4(),
      type: 'customShape',
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      data: {
        label: 'New Shape',
        shape,
        bgColor: '#ffffff',
        textColor: '#000000',
        tooltip: '',
        target_diagram_id: '',
      },
    };
    const newDiagrams = [...diagrams];
    newDiagrams[activeDiagramIndex] = { ...activeDiagram, nodes: [...activeDiagram.nodes, newNode] };
    const newData = { ...diagramData, diagrams: newDiagrams };
    onDiagramDataChange(newData);
    takeSnapshot(newData);
  };

  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    setSelectedNode(node as Node<DiagramNodeData>);
  };

  const updateSelectedNode = (data: Partial<DiagramNodeData>) => {
    if (!selectedNode) return;
    const newNodes = activeDiagram.nodes.map(n => {
      if (n.id === selectedNode.id) {
        const updated = { ...n, data: { ...n.data, ...data } };
        setSelectedNode(updated);
        return updated;
      }
      return n;
    });
    const newDiagrams = [...diagrams];
    newDiagrams[activeDiagramIndex] = { ...activeDiagram, nodes: newNodes };
    const newData = { ...diagramData, diagrams: newDiagrams };
    onDiagramDataChange(newData);
    takeSnapshot(newData);
  };

  const deleteSelectedNode = () => {
    if (!selectedNode) return;
    const newNodes = activeDiagram.nodes.filter(n => n.id !== selectedNode.id);
    const newEdges = activeDiagram.edges.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id);
    const newDiagrams = [...diagrams];
    newDiagrams[activeDiagramIndex] = { ...activeDiagram, nodes: newNodes, edges: newEdges };
    const newData = { ...diagramData, diagrams: newDiagrams };
    onDiagramDataChange(newData);
    takeSnapshot(newData);
    setSelectedNode(null);
  };

  const duplicateSelectedNode = () => {
    if (!selectedNode) return;
    const newNode: Node<DiagramNodeData> = {
      id: uuidv4(),
      type: 'customShape',
      position: { x: selectedNode.position.x + 40, y: selectedNode.position.y + 40 },
      data: { ...selectedNode.data },
    };
    const newDiagrams = [...diagrams];
    newDiagrams[activeDiagramIndex] = { ...activeDiagram, nodes: [...activeDiagram.nodes, newNode] };
    const newData = { ...diagramData, diagrams: newDiagrams };
    onDiagramDataChange(newData);
    takeSnapshot(newData);
    setSelectedNode(newNode);
  };

  const addNewDiagram = () => {
    const newDiagram: Diagram = {
      id: uuidv4(),
      name: `Sub Diagram ${diagrams.length}`,
      nodes: [],
      edges: [],
    };
    const newData = { ...diagramData, diagrams: [...diagrams, newDiagram] };
    onDiagramDataChange(newData);
    takeSnapshot(newData);
    setActiveDiagramId(newDiagram.id);
    setSelectedNode(null);
  };

  const deleteDiagram = (idToDelete: string) => {
    if (diagrams.length <= 1) return; // Không cho xóa diagram cuối cùng
    const newDiagrams = diagrams.filter(d => d.id !== idToDelete);
    const newData = { ...diagramData, diagrams: newDiagrams };
    onDiagramDataChange(newData);
    takeSnapshot(newData);
    
    // Nếu diagram bị xóa là diagram hiện tại, chuyển sang diagram đầu tiên
    if (activeDiagramId === idToDelete) {
      setActiveDiagramId(newDiagrams[0].id);
      setSelectedNode(null);
    }
  };

  const updateActiveDiagramName = (name: string) => {
    const newDiagrams = diagrams.map(d => d.id === activeDiagramId ? { ...d, name } : d);
    const newData = { ...diagramData, diagrams: newDiagrams };
    onDiagramDataChange(newData);
    takeSnapshot(newData);
  };

  return (
    <div className="flex flex-col h-full w-full border-none bg-background overflow-hidden relative">
      <div className="flex flex-1 overflow-hidden h-full w-full">
        {/* Sidebar */}
        <div className="w-64 border-r border-border bg-muted/20 flex flex-col z-10 shadow-sm relative h-full">
          <div className="h-14 px-3 border-b border-border bg-background flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 px-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Trở về
            </Button>
            <span className="text-xs font-semibold uppercase text-muted-foreground ml-auto">Diagram Editor</span>
          </div>
          
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="text-sm font-bold text-foreground mb-3 flex items-center justify-between">
              Sơ đồ (Diagrams)
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={addNewDiagram}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase text-muted-foreground">Tên Block (Display Name)</label>
              <input
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                value={displayName}
                onChange={e => onDisplayNameChange(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {diagrams.map(d => (
              <div
                key={d.id}
                className={`flex items-center w-full px-1 py-1 rounded-md transition-colors group ${activeDiagramId === d.id ? 'bg-primary/10' : 'hover:bg-muted'}`}
              >
                <button
                  onClick={() => { setActiveDiagramId(d.id); setSelectedNode(null); }}
                  className={`flex-1 text-left px-2 py-1 text-sm truncate ${activeDiagramId === d.id ? 'text-primary font-medium' : 'text-muted-foreground'}`}
                >
                  {d.name}
                </button>
                {diagrams.length > 1 && d.id !== startDiagramId && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0" 
                    onClick={(e) => { e.stopPropagation(); deleteDiagram(d.id); }}
                    title="Xóa Sơ đồ này"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-border">
            <div className="text-xs font-semibold uppercase text-muted-foreground mb-3 flex justify-between items-center">
              Thêm Shape
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" onClick={() => addNode('rectangle')}>Vuông</Button>
              <Button size="sm" variant="outline" onClick={() => addNode('rounded')}>Bo góc</Button>
              <Button size="sm" variant="outline" className="col-span-2" onClick={() => addNode('ellipse')}>Tròn (Ellipse)</Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-4 border-t border-border bg-muted/20 mt-auto">
            <Button className="w-full gap-2" size="sm" onClick={onSave} disabled={isSaving}>
              <Save className="h-4 w-4" />
              {isSaving ? 'Đang lưu...' : 'Lưu Sơ đồ'}
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative flex flex-col">
          <div className="h-14 border-b border-border flex items-center px-4 bg-background z-10 shrink-0 gap-4">
            <span className="text-sm font-semibold text-muted-foreground whitespace-nowrap">Tên sơ đồ hiện tại:</span>
            <input
              className="flex h-8 w-64 rounded-md border border-transparent hover:border-input focus:border-input bg-transparent px-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
              value={activeDiagram.name}
              onChange={e => updateActiveDiagramName(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <ReactFlow
              colorMode={theme === 'dark' ? 'dark' : 'light'}
              nodes={activeDiagram.nodes}
              edges={activeDiagram.edges}
              onNodesChange={onNodesChange}
              onNodeDragStop={onNodeDragStop}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={handleNodeClick}
              onPaneClick={() => setSelectedNode(null)}
              nodeTypes={nodeTypes}
              fitView
              deleteKeyCode="Delete"
            >
              <Controls>
                <ControlButton onClick={undo} disabled={!canUndo} title="Undo">
                  <div className="w-full h-full flex items-center justify-center">
                    <Undo2 className="!w-3.5 !h-3.5" style={{ fill: 'none' }} />
                  </div>
                </ControlButton>
                <ControlButton onClick={redo} disabled={!canRedo} title="Redo">
                  <div className="w-full h-full flex items-center justify-center">
                    <Redo2 className="!w-3.5 !h-3.5" style={{ fill: 'none' }} />
                  </div>
                </ControlButton>
              </Controls>
              <MiniMap />
              <Background gap={12} size={1} />
            </ReactFlow>
          </div>
        </div>

        {/* Properties Panel */}
        {selectedNode && (
          <div className="w-72 border-l border-border bg-background flex flex-col h-full z-10 relative">
            <div className="h-14 px-4 border-b border-border bg-background flex items-center gap-2 shrink-0 text-primary">
              <Settings className="w-4 h-4" />
              <h3 className="font-bold text-sm">Thuộc tính Shape</h3>
            </div>
            <div className="p-4 space-y-5 flex-1 overflow-y-auto custom-scrollbar">
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold flex items-center gap-1.5 mb-1 text-foreground">
                  <Type className="w-3.5 h-3.5 text-muted-foreground" /> Text hiển thị
                </label>
                <textarea
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
                  value={selectedNode.data.label}
                  onChange={e => updateSelectedNode({ label: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-lg border border-border/50">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold flex items-center gap-1.5 mb-1 text-muted-foreground">
                    <Palette className="w-3.5 h-3.5" /> Màu nền
                  </label>
                  <div className="flex items-center gap-2 border border-input rounded-md h-9 px-3 bg-background relative overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:border-primary transition-all">
                    <div className="w-4 h-4 rounded-full border border-border shadow-sm shrink-0" style={{ backgroundColor: selectedNode.data.bgColor }} />
                    <span className="text-xs font-mono text-muted-foreground uppercase flex-1">{selectedNode.data.bgColor}</span>
                    <input
                      type="color"
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      value={selectedNode.data.bgColor}
                      onChange={e => updateSelectedNode({ bgColor: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold flex items-center gap-1.5 mb-1 text-muted-foreground">
                    <Type className="w-3.5 h-3.5" /> Màu chữ
                  </label>
                  <div className="flex items-center gap-2 border border-input rounded-md h-9 px-3 bg-background relative overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:border-primary transition-all">
                    <div className="w-4 h-4 rounded-full border border-border shadow-sm shrink-0" style={{ backgroundColor: selectedNode.data.textColor }} />
                    <span className="text-xs font-mono text-muted-foreground uppercase flex-1">{selectedNode.data.textColor}</span>
                    <input
                      type="color"
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      value={selectedNode.data.textColor}
                      onChange={e => updateSelectedNode({ textColor: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold flex items-center gap-1.5 mb-1 text-foreground">
                  <Hexagon className="w-3.5 h-3.5 text-muted-foreground" /> Hình dáng
                </label>
                <Select value={selectedNode.data.shape} onValueChange={(v) => updateSelectedNode({ shape: v as any })}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Chọn hình dáng" />
                  </SelectTrigger>
                  <SelectContent className="z-[10000]">
                    <SelectItem value="rectangle">
                      <div className="flex items-center gap-2"><Square className="w-3.5 h-3.5 text-muted-foreground" /> Chữ nhật vuông</div>
                    </SelectItem>
                    <SelectItem value="rounded">
                      <div className="flex items-center gap-2"><Square className="w-3.5 h-3.5 text-muted-foreground rounded" /> Chữ nhật bo góc</div>
                    </SelectItem>
                    <SelectItem value="ellipse">
                      <div className="flex items-center gap-2"><Circle className="w-3.5 h-3.5 text-muted-foreground" /> Hình oval / tròn</div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold flex items-center gap-1.5 mb-1 text-foreground">
                  <CornerDownRight className="w-3.5 h-3.5 text-muted-foreground" /> Ghi chú (Tooltip)
                </label>
                <textarea
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
                  value={selectedNode.data.tooltip || ''}
                  onChange={e => updateSelectedNode({ tooltip: e.target.value })}
                  placeholder="Hiển thị khi hover chuột..."
                  rows={2}
                />
              </div>
              <div className="space-y-1.5 pt-4 border-t border-border">
                <label className="text-[13px] font-bold flex items-center gap-1.5 mb-1 text-primary">
                  <LinkIcon className="w-3.5 h-3.5" /> Điều hướng (Link)
                </label>
                <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed">Click vào shape này sẽ mở sơ đồ con tương ứng:</p>
                <Select value={selectedNode.data.target_diagram_id || 'none'} onValueChange={(v) => updateSelectedNode({ target_diagram_id: v === 'none' ? '' : v })}>
                  <SelectTrigger className="h-9 border-primary/30 hover:border-primary/50 transition-colors focus:ring-primary/20">
                    <SelectValue placeholder="-- Không có --" />
                  </SelectTrigger>
                  <SelectContent className="z-[10000]">
                    <SelectItem value="none" className="text-muted-foreground italic">-- Không có --</SelectItem>
                    {diagrams.filter(d => d.id !== activeDiagram.id).map(d => (
                      <SelectItem key={d.id} value={d.id} className="font-medium text-primary">{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="p-4 border-t border-border bg-muted/10 space-y-2">
              <Button variant="outline" className="w-full gap-2 shadow-sm" onClick={duplicateSelectedNode}>
                <Copy className="w-4 h-4" /> Nhân bản Shape
              </Button>
              <Button variant="destructive" className="w-full gap-2 shadow-sm" onClick={deleteSelectedNode}>
                <Trash2 className="w-4 h-4" /> Xóa Shape
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
