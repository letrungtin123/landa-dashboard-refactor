import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Link } from 'lucide-react';

export type DiagramNodeData = {
  label: string;
  shape: 'rectangle' | 'rounded' | 'ellipse';
  bgColor: string;
  textColor: string;
  tooltip?: string;
  target_diagram_id?: string;
};

export default function CustomShapeNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as DiagramNodeData;
  const { label, shape, bgColor, textColor, tooltip, target_diagram_id } = nodeData;

  let borderRadius = '0px';
  if (shape === 'rounded') borderRadius = '8px';
  else if (shape === 'ellipse') borderRadius = '9999px';

  const content = (
    <div
      className={`relative flex items-center justify-center border-2 px-4 py-2 min-w-[100px] min-h-[40px] shadow-sm transition-all ${selected ? 'border-primary ring-2 ring-primary/20' : 'border-transparent'}`}
      style={{
        backgroundColor: bgColor || '#ffffff',
        color: textColor || '#000000',
        borderRadius,
      }}
    >
      <Handle type="target" position={Position.Top} id="top" className="w-2 h-2 !bg-muted-foreground" />
      <Handle type="target" position={Position.Left} id="left" className="w-2 h-2 !bg-muted-foreground" />
      <div className="text-sm font-semibold text-center whitespace-pre-wrap flex items-center gap-1">
        {label || 'Trống'}
        {target_diagram_id && <Link className="w-3 h-3 opacity-50" />}
      </div>
      <Handle type="source" position={Position.Bottom} id="bottom" className="w-2 h-2 !bg-muted-foreground" />
      <Handle type="source" position={Position.Right} id="right" className="w-2 h-2 !bg-muted-foreground" />
    </div>
  );

  if (tooltip && tooltip.trim().length > 0) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[250px] text-center">
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}
