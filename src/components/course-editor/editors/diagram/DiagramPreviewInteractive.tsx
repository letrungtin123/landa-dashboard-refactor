import React, { useState } from 'react';
import { ReactFlow, MiniMap, Controls, Background, Node, useNodesState, useEdgesState, ConnectionMode } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import CustomShapeNode, { type DiagramNodeData } from './CustomShapeNode';
import JunctionNode from './JunctionNode';
import { useTheme } from 'next-themes';

const nodeTypes = {
  customShape: CustomShapeNode,
  junction: JunctionNode,
};

export interface Diagram {
  id: string;
  name: string;
  nodes: Node<DiagramNodeData>[];
  edges: any[];
}

interface DiagramPreviewInteractiveProps {
  data: {
    display_name?: string;
    diagrams?: Diagram[];
    start_diagram_id?: string;
  };
}

export default function DiagramPreviewInteractive({ data }: DiagramPreviewInteractiveProps) {
  const { theme } = useTheme();
  const diagrams = data?.diagrams || [];
  const startDiagramId = data?.start_diagram_id || (diagrams.length > 0 ? diagrams[0].id : null);

  const [history, setHistory] = useState<string[]>(startDiagramId ? [startDiagramId] : []);
  
  const currentDiagramId = history.length > 0 ? history[history.length - 1] : startDiagramId;
  const activeDiagram = diagrams.find((d) => d.id === currentDiagramId);

  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    const targetId = (node.data as any)?.target_diagram_id;
    if (targetId && diagrams.some((d) => d.id === targetId)) {
      setHistory((prev) => [...prev, targetId]);
    }
  };

  const goBack = () => {
    if (history.length > 1) {
      setHistory((prev) => prev.slice(0, -1));
    }
  };

  if (!activeDiagram) {
    return (
      <div className="flex flex-col items-center justify-center p-12 rounded-xl border-2 border-dashed border-border text-muted-foreground text-sm">
        Sơ đồ chưa có dữ liệu hoặc đã bị xóa.
      </div>
    );
  }

  const initialNodes = activeDiagram.nodes.map((n) => ({
    ...n,
    draggable: false,
    selectable: false,
    connectable: false,
    data: { ...n.data, hidePorts: true },
  }));

  const initialEdges = activeDiagram.edges.map((e) => ({
    ...e,
    animated: false,
    type: 'step',
  }));

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync state if activeDiagram's nodes/edges change
  React.useEffect(() => {
    setNodes(activeDiagram.nodes.map((n) => ({
      ...n,
      draggable: false,
      selectable: false,
      connectable: false,
      data: { ...n.data, hidePorts: true },
    })));
    setEdges(activeDiagram.edges.map((e) => ({
      ...e,
      animated: false,
      type: 'step',
    })));
  }, [activeDiagram, setNodes, setEdges]);

  return (
    <div className="w-full min-h-[400px] flex flex-col border border-border rounded-xl overflow-hidden bg-background">
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/20">
        <div className="flex items-center gap-3">
          {history.length > 1 && (
            <Button variant="outline" size="sm" onClick={goBack} className="h-8 gap-1 text-xs">
              <ArrowLeft className="w-3.5 h-3.5" /> Quay lại
            </Button>
          )}
          <h3 className="font-semibold text-primary">{activeDiagram.name}</h3>
        </div>
      </div>
      <div className="w-full relative" style={{ height: '400px' }}>
        <ReactFlow
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          colorMode={theme === 'dark' ? 'dark' : 'light'}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          onNodeClick={handleNodeClick}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          zoomOnScroll={false}
          panOnDrag={true}
        >
          <Controls showInteractive={false} />
          <MiniMap />
          <Background gap={12} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
}
