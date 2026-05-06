/**
 * OutlineTree.tsx
 * Hiển thị cây Outline (Sections → Subsections → Units)
 * Dùng đúng Studio API: POST /xblock/ để tạo, DELETE /xblock/{id} để xóa
 */
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CourseIndexSection,
  getCourseOutlineIndex,
  createBlock,
  deleteBlock,
  publishBlock,
  renameBlock,
} from '@/api/course-authoring';
import {
  ChevronRight, ChevronDown, Plus, Trash2, Globe, EyeOff,
  MoreVertical, Folder, Layout, FileText, Pencil, Check, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface OutlineTreeProps {
  courseId: string;
  onSelectUnit: (unitId: string) => void;
  selectedUnitId: string | null;
}

export default function OutlineTree({ courseId, onSelectUnit, selectedUnitId }: OutlineTreeProps) {
  const { data: outline, isLoading, isError, refetch } = useQuery({
    queryKey: ['course-outline-index', courseId],
    queryFn: () => getCourseOutlineIndex(courseId),
    staleTime: 30_000,
  });

  const structure = outline?.course_structure;

  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-8 bg-muted/50 rounded animate-pulse" style={{ width: `${80 - i * 10}%` }} />
        ))}
      </div>
    );
  }

  if (isError || !structure) {
    return (
      <div className="p-3 text-xs text-destructive bg-destructive/10 rounded-md m-2">
        Lỗi tải outline. Kiểm tra kết nối CMS.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {structure.child_info?.children?.map((section) => (
        <SectionNode
          key={section.id}
          node={section}
          onSelectUnit={onSelectUnit}
          selectedUnitId={selectedUnitId}
          onStructureChange={() => refetch()}
        />
      ))}
      <AddNodeButton
        parentId={structure.id}
        category="chapter"
        label="Thêm Section"
        onStructureChange={() => refetch()}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// Section Node
// ─────────────────────────────────────────────

function SectionNode({ node, onSelectUnit, selectedUnitId, onStructureChange }: {
  node: CourseIndexSection;
  onSelectUnit: (id: string) => void;
  selectedUnitId: string | null;
  onStructureChange: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <NodeRow
        node={node}
        depth={0}
        icon={<Folder className="h-4 w-4 text-amber-500" />}
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
        isSelectable={false}
        isSelected={false}
        onStructureChange={onStructureChange}
      />
      {expanded && (
        <div className="ml-5 pl-2 border-l border-border/40 mt-0.5 space-y-0.5">
          {node.child_info?.children?.map((sub) => (
            <SubsectionNode
              key={sub.id}
              node={sub}
              onSelectUnit={onSelectUnit}
              selectedUnitId={selectedUnitId}
              onStructureChange={onStructureChange}
            />
          ))}
          <AddNodeButton
            parentId={node.id}
            category="sequential"
            label="Thêm Subsection"
            onStructureChange={onStructureChange}
            small
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Subsection Node
// ─────────────────────────────────────────────

function SubsectionNode({ node, onSelectUnit, selectedUnitId, onStructureChange }: {
  node: CourseIndexSection;
  onSelectUnit: (id: string) => void;
  selectedUnitId: string | null;
  onStructureChange: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <NodeRow
        node={node}
        depth={1}
        icon={<Layout className="h-4 w-4 text-sky-500" />}
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
        isSelectable={false}
        isSelected={false}
        onStructureChange={onStructureChange}
      />
      {expanded && (
        <div className="ml-5 pl-2 border-l border-border/40 mt-0.5 space-y-0.5">
          {node.child_info?.children?.map((unit) => (
            <UnitNode
              key={unit.id}
              node={unit}
              isSelected={selectedUnitId === unit.id}
              onSelect={() => onSelectUnit(unit.id)}
              onStructureChange={onStructureChange}
            />
          ))}
          <AddNodeButton
            parentId={node.id}
            category="vertical"
            label="Thêm Unit"
            onStructureChange={onStructureChange}
            small
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Unit Node (leaf)
// ─────────────────────────────────────────────

function UnitNode({ node, isSelected, onSelect, onStructureChange }: {
  node: CourseIndexSection;
  isSelected: boolean;
  onSelect: () => void;
  onStructureChange: () => void;
}) {
  return (
    <NodeRow
      node={node}
      depth={2}
      icon={<FileText className="h-4 w-4 text-blue-500" />}
      expanded={false}
      onToggle={onSelect}
      isSelectable
      isSelected={isSelected}
      onStructureChange={onStructureChange}
    />
  );
}

// ─────────────────────────────────────────────
// Generic Node Row
// ─────────────────────────────────────────────

function NodeRow({ node, depth, icon, expanded, onToggle, isSelectable, isSelected, onStructureChange }: {
  node: CourseIndexSection;
  depth: number;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  isSelectable: boolean;
  isSelected: boolean;
  onStructureChange: () => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(node.display_name);

  const renameMut = useMutation({
    mutationFn: () => renameBlock(node.id, renameValue),
    onSuccess: () => {
      toast.success('Đã đổi tên');
      setIsRenaming(false);
      onStructureChange();
    },
    onError: () => toast.error('Đổi tên thất bại'),
  });

  const hasChildren = !isSelectable && !!node.child_info?.children?.length;

  return (
    <div
      className={`flex items-center group gap-1 py-1.5 px-2 rounded-md cursor-pointer text-sm transition-colors select-none
        ${isSelected ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted/50 text-foreground/80'}`}
      onClick={isRenaming ? undefined : onToggle}
    >
      {/* Expand chevron (only for non-unit) */}
      <div className="w-4 shrink-0 flex justify-center">
        {hasChildren ? (
          expanded
            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        ) : !isSelectable ? (
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30" />
        ) : null}
      </div>

      {icon}

      {/* Name / Rename */}
      {isRenaming ? (
        <input
          autoFocus
          className="flex-1 h-6 text-sm px-1 rounded border border-input bg-background"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && renameValue) renameMut.mutate();
            if (e.key === 'Escape') setIsRenaming(false);
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 truncate text-sm">{node.display_name || 'Không tên'}</span>
      )}

      {/* Status */}
      {!isRenaming && (
        <span 
          className="shrink-0" 
          title={!node.published ? 'Bản nháp (Draft)' : node.has_changes ? 'Đã xuất bản (Có thay đổi chưa public)' : 'Đã xuất bản'}
        >
          {!node.published ? (
            <EyeOff className="h-3 w-3 text-slate-400" />
          ) : node.has_changes ? (
            <Globe className="h-3 w-3 text-amber-500" />
          ) : (
            <Globe className="h-3 w-3 text-emerald-500" />
          )}
        </span>
      )}

      {/* Rename confirm/cancel */}
      {isRenaming && (
        <div className="flex gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => renameMut.mutate()}>
            <Check className="h-3 w-3 text-emerald-600" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsRenaming(false)}>
            <X className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      )}

      {/* Actions dropdown */}
      {!isRenaming && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
          <NodeActions
            node={node}
            onRename={() => { setIsRenaming(true); setRenameValue(node.display_name); }}
            onStructureChange={onStructureChange}
          />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Node Actions Dropdown
// ─────────────────────────────────────────────

function NodeActions({ node, onRename, onStructureChange }: {
  node: CourseIndexSection;
  onRename: () => void;
  onStructureChange: () => void;
}) {
  const delMut = useMutation({
    mutationFn: () => deleteBlock(node.id),
    onSuccess: () => { toast.success('Đã xóa'); onStructureChange(); },
    onError: () => toast.error('Xóa thất bại'),
  });

  const publishMut = useMutation({
    mutationFn: () => publishBlock(node.id),
    onSuccess: () => { toast.success('Đã publish'); onStructureChange(); },
    onError: () => toast.error('Publish thất bại'),
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <MoreVertical className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={onRename}>
          <Pencil className="h-3.5 w-3.5 mr-2" /> Đổi tên
        </DropdownMenuItem>
        {(!node.published || node.has_changes) && (
          <DropdownMenuItem onClick={() => publishMut.mutate()}>
            <Globe className="h-3.5 w-3.5 mr-2" /> Publish
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => {
            if (confirm(`Xóa "${node.display_name}"?`)) delMut.mutate();
          }}
        >
          <Trash2 className="h-3.5 w-3.5 mr-2" /> Xóa
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─────────────────────────────────────────────
// Add Node Button (inline)
// ─────────────────────────────────────────────

function AddNodeButton({ parentId, category, label, onStructureChange, small = false }: {
  parentId: string;
  category: string;
  label: string;
  onStructureChange: () => void;
  small?: boolean;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');

  const addMut = useMutation({
    mutationFn: () => createBlock(parentId, category, name || undefined),
    onSuccess: () => {
      toast.success('Đã thêm thành công');
      setIsAdding(false);
      setName('');
      onStructureChange();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.message || 'Lỗi không xác định';
      toast.error(`Thêm thất bại: ${msg}`);
    },
  });

  if (isAdding) {
    return (
      <div className="flex items-center gap-1.5 mt-1 px-1">
        <input
          autoFocus
          className="flex h-7 flex-1 rounded border border-input bg-background px-2 text-xs shadow-sm"
          placeholder={`Tên ${category}...`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addMut.mutate();
            if (e.key === 'Escape') setIsAdding(false);
          }}
        />
        <Button size="sm" className="h-7 text-xs" onClick={() => addMut.mutate()} disabled={addMut.isPending}>
          Lưu
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIsAdding(false)}>
          Hủy
        </Button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsAdding(true)}
      className={`flex items-center gap-1.5 w-full text-left px-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors ${small ? 'py-1 text-xs' : 'py-1.5 text-sm'}`}
    >
      <Plus className="h-3 w-3" />
      {label}
    </button>
  );
}
