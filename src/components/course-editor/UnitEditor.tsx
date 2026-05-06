/**
 * UnitEditor.tsx — Hiển thị và chỉnh sửa components trong một Unit
 * Hỗ trợ: video, html, problem (5 dạng), la_crossword, la_sortable
 */
import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  getUnitChildren, createXBlock, updateXBlock, deleteXBlock, studioSubmit, getBlockInfo,
} from '@/api/course-authoring';
import { apiClient } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Trash2, GripVertical, Plus, Video, Type, HelpCircle,
  Save, Edit2, ChevronDown, Puzzle, List, Check, X
} from 'lucide-react';
import { toast } from 'sonner';
import VideoEditor from './editors/VideoEditor';
import HtmlEditor from './editors/HtmlEditor';
import ProblemEditor, { PROBLEM_TYPES, parseProblemXml } from './editors/ProblemEditor';
import CrosswordEditor, { CrosswordWord } from './editors/CrosswordEditor';
import SortableEditor, { SortableItem } from './editors/SortableEditor';
import { CrosswordPreviewInteractive } from './CrosswordPreview';

const LMS_BASE = (import.meta as any).env?.VITE_OPENEDX_LMS_URL || 'http://local.openedx.io';

function rewriteHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/src="(\/asset-v1:[^"]+)"/g, `src="${LMS_BASE}$1"`)
    .replace(/src="(\/c4x\/[^"]+)"/g, `src="${LMS_BASE}$1"`)
    .replace(/src="(\/static\/[^"]+)"/g, `src="${LMS_BASE}$1"`)
    .replace(/src="(\/assets\/[^"]+)"/g, `src="${LMS_BASE}$1"`);
}

// ─── Component type registry ──────────────────────────────────────────────────

interface ComponentType {
  id: string;
  category: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
  colorClass: string;
  subTypes?: { id: string; label: string; boilerplate: string }[];
}

const COMPONENT_TYPES: ComponentType[] = [
  {
    id: 'video', category: 'video', label: 'Video', desc: 'YouTube / edX video',
    icon: <Video className="h-6 w-6" />,
    colorClass: 'border-red-200 bg-red-50 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300',
  },
  {
    id: 'html', category: 'html', label: 'Text', desc: 'Văn bản + hình ảnh',
    icon: <Type className="h-6 w-6" />,
    colorClass: 'border-blue-200 bg-blue-50 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  },
  {
    id: 'problem', category: 'problem', label: 'Problem', desc: '5 dạng câu hỏi',
    icon: <HelpCircle className="h-6 w-6" />,
    colorClass: 'border-amber-200 bg-amber-50 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300',
    subTypes: PROBLEM_TYPES.map(p => ({ id: p.id, label: p.label, boilerplate: p.boilerplate })),
  },
  {
    id: 'la_crossword', category: 'la_crossword', label: 'Ô chữ', desc: 'Crossword tương tác',
    icon: <Puzzle className="h-6 w-6" />,
    colorClass: 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  },
  {
    id: 'la_sortable', category: 'la_sortable', label: 'Sắp xếp', desc: 'Kéo thả thứ tự',
    icon: <List className="h-6 w-6" />,
    colorClass: 'border-violet-200 bg-violet-50 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/30 dark:hover:bg-violet-900/40 text-violet-700 dark:text-violet-300',
  },
];

// ─── ChildBlock type ──────────────────────────────────────────────────────────

interface ChildBlock {
  id: string;
  block_id: string;
  display_name: string;
  block_type: string;
  has_changes: boolean;
  published: boolean;
}

// ─── Fetch block detail helper ────────────────────────────────────────────────

async function fetchBlockDetail(block: ChildBlock): Promise<any> {
  const blockId = block.id || block.block_id;
  try {
    const data = await getBlockInfo(blockId);
    return {
      ...data,
      id: blockId,
      category: data.category || (data as any).block_type || block.block_type,
      block_type: block.block_type,
      display_name: data.display_name || block.display_name,
    };
  } catch {
    return {
      id: blockId,
      category: block.block_type,
      block_type: block.block_type,
      display_name: block.display_name,
      metadata: {},
      data: '',
    };
  }
}

// ─── UnitEditor (main) ────────────────────────────────────────────────────────

export default function UnitEditor({ unitId, courseId, onContentChange }: {
  unitId: string;
  courseId?: string;
  onContentChange: () => void;
}) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [subTypeSelector, setSubTypeSelector] = useState<ComponentType | null>(null);

  const { data: unitChildren, isLoading, refetch } = useQuery({
    queryKey: ['unit-children', unitId],
    queryFn: () => getUnitChildren(unitId),
    staleTime: 10_000,
  });

  const children: ChildBlock[] = unitChildren?.children || [];

  const addMut = useMutation({
    mutationFn: ({ category, boilerplate }: { category: string; boilerplate?: string }) =>
      createXBlock({ type: category, category, parent_locator: unitId, boilerplate }),
    onSuccess: () => {
      toast.success('Đã thêm component');
      setShowAddDialog(false);
      setSubTypeSelector(null);
      refetch();
      onContentChange();
    },
    onError: (err: any) => {
      toast.error(`Thêm thất bại: ${err?.response?.data?.error || err?.message || 'Lỗi không rõ'}`);
    },
  });

  const handleSelectType = useCallback((type: ComponentType) => {
    if (type.subTypes?.length) {
      setSubTypeSelector(type);
    } else {
      addMut.mutate({ category: type.category });
    }
  }, [addMut]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-20">
      {children.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center">
            <Plus className="h-8 w-8 opacity-20" />
          </div>
          <p className="text-sm">Unit chưa có nội dung. Thêm component đầu tiên!</p>
        </div>
      )}

      <div className="space-y-4">
        {children.map(child => (
          <ComponentCard
            key={child.id || child.block_id}
            block={child}
            courseId={courseId}
            onDelete={() => { refetch(); onContentChange(); }}
            onSaved={() => { refetch(); onContentChange(); }}
          />
        ))}
      </div>

      <div className="pt-2">
        <Button
          variant="outline"
          className="w-full h-12 border-dashed border-2 rounded-xl hover:border-primary/60 hover:text-primary hover:bg-primary/5"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="h-5 w-5 mr-2" /> Thêm Component
        </Button>
      </div>

      {/* Add Component Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(o) => { setShowAddDialog(o); if (!o) setSubTypeSelector(null); }}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden">
          <DialogHeader className="px-7 pt-6 pb-4">
            <DialogTitle className="text-xl font-bold text-center">
              {subTypeSelector ? `Chọn dạng ${subTypeSelector.label}` : 'Thêm component mới'}
            </DialogTitle>
          </DialogHeader>
          <div className="px-7 pb-7">
            {subTypeSelector ? (
              <div className="space-y-2">
                {subTypeSelector.subTypes!.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => addMut.mutate({ category: subTypeSelector.category, boilerplate: sub.boilerplate })}
                    disabled={addMut.isPending}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border bg-background hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all text-left disabled:opacity-50"
                  >
                    <HelpCircle className="h-5 w-5 text-amber-500 shrink-0" />
                    <span className="font-semibold text-sm">{sub.label}</span>
                  </button>
                ))}
                <Button variant="ghost" className="w-full mt-1 text-sm" onClick={() => setSubTypeSelector(null)}>
                  ← Quay lại
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {COMPONENT_TYPES.map(type => (
                  <button
                    key={type.id}
                    onClick={() => handleSelectType(type)}
                    disabled={addMut.isPending}
                    className={`flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all disabled:opacity-50 ${type.colorClass}`}
                  >
                    {type.icon}
                    <div className="text-center">
                      <div className="font-bold text-sm">{type.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 leading-tight">{type.desc}</div>
                    </div>
                    {type.subTypes && <ChevronDown className="h-3 w-3 opacity-50" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── ComponentCard ────────────────────────────────────────────────────────────

function ComponentCard({ block, courseId, onDelete, onSaved }: {
  block: ChildBlock;
  courseId?: string;
  onDelete: () => void;
  onSaved: () => void;
}) {
  const blockId = block.id || block.block_id;
  const [isEditing, setIsEditing] = useState(false);
  const [blockData, setBlockData] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);

  const loadDetail = useCallback(async () => {
    setLoadingDetail(true);
    const detail = await fetchBlockDetail(block);
    setBlockData(detail);
    setLoadingDetail(false);
  }, [blockId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch ngay khi mount
  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const delMut = useMutation({
    mutationFn: () => deleteXBlock(blockId),
    onSuccess: () => { toast.success('Đã xóa'); onDelete(); },
    onError: () => toast.error('Xóa thất bại'),
  });

  const handleSaved = useCallback(async () => {
    setIsEditing(false);
    await loadDetail(); // Refresh preview sau save
    onSaved();
  }, [loadDetail, onSaved]);

  return (
    <div className="border border-border rounded-xl bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
      {/* Header */}
      <div className="flex items-center justify-between bg-muted/30 px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <GripVertical className="h-4 w-4 text-muted-foreground/30 cursor-move shrink-0" />
          <span className="px-2 py-0.5 rounded bg-background border text-[10px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">
            {block.block_type}
          </span>
          <span className="text-sm font-semibold truncate">
            {blockData?.display_name || block.display_name}
          </span>
          {block.has_changes && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 font-medium shrink-0">
              draft
            </span>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditing(true)}>
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Xóa component này?</AlertDialogTitle>
                <AlertDialogDescription>
                  Hành động này không thể hoàn tác. Component sẽ bị xóa vĩnh viễn khỏi hệ thống.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Hủy</AlertDialogCancel>
                <AlertDialogAction 
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => delMut.mutate()}
                >
                  Xóa
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Preview */}
      <div className="p-4 bg-background min-h-[52px]">
        {loadingDetail ? (
          <div className="flex gap-2 items-center animate-pulse">
            <div className="h-3 w-3 rounded-full bg-muted" />
            <div className="h-3 w-36 rounded bg-muted" />
          </div>
        ) : (
          <ComponentPreview blockType={block.block_type} blockData={blockData} />
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="w-[95vw] sm:max-w-7xl max-h-[92vh] flex flex-col overflow-hidden p-0">
          <DialogHeader className="px-6 py-4 border-b bg-muted/20 shrink-0">
            <DialogTitle className="text-lg font-bold">
              Chỉnh sửa: <span className="text-primary">{blockData?.display_name || block.display_name}</span>
              <span className="ml-2 text-xs font-normal text-muted-foreground uppercase tracking-wider">
                [{block.block_type}]
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {loadingDetail ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : (
              <ComponentEditForm
                key={blockId}
                blockInfo={blockData}
                courseId={courseId}
                onSaved={handleSaved}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Custom Interactive Previews ───────────────────────────────────────────────

function SortablePreviewInteractive({ parsed, questionText }: { parsed: any, questionText: string }) {
  const correctItems = parsed?.items || [];
  const [items, setItems] = useState<any[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);

  useEffect(() => {
    setItems([...correctItems].sort(() => Math.random() - 0.5));
  }, [correctItems]);

  const moveItem = (from: number, to: number) => {
    if (submitted) return;
    const arr = [...items];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    setItems(arr);
  };

  const handleDragStart = (idx: number) => {
    if (submitted) return;
    setDragging(idx);
  }
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragging !== null && dragging !== idx && !submitted) {
      moveItem(dragging, idx);
      setDragging(idx);
    }
  };
  const handleDragEnd = () => setDragging(null);

  const isCorrect = items.every((item, i) => item.id === correctItems[i]?.id);

  if (correctItems.length === 0) {
    return <div className="text-muted-foreground p-4 border rounded-xl text-center">Chưa có danh sách sắp xếp</div>;
  }

  return (
    <div className="border border-border rounded-xl p-5 bg-card space-y-5">
      {questionText && <p className="text-[15px] prose dark:prose-invert max-w-none">{questionText}</p>}
      
      <div className="space-y-2 mt-4">
        {items.map((item, idx) => {
          const isItemCorrect = item.id === correctItems[idx]?.id;
          let borderClass = "border-border";
          if (submitted) {
            borderClass = isItemCorrect ? "border-green-500 bg-green-500/10" : "border-red-500 bg-red-500/10";
          }
          
          return (
            <div
              key={item.id}
              draggable={!submitted}
              onDragStart={() => handleDragStart(idx)}
              onDragOver={e => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 p-3 rounded-md border bg-background transition-all ${dragging === idx ? 'opacity-50 scale-[0.99] border-primary' : borderClass} ${submitted ? 'cursor-default' : 'cursor-grab hover:bg-muted/50'}`}
            >
              <div className="text-muted-foreground/40 shrink-0">
                <GripVertical className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded shrink-0 min-w-[32px] text-center">
                {idx + 1}
              </span>
              <div className="flex-1 text-[15px] prose dark:prose-invert max-w-none [&_p]:m-0 leading-tight">
                {item.text}
              </div>
              {submitted && (
                <div className="shrink-0">
                   {isItemCorrect ? <Check className="w-5 h-5 text-green-500 stroke-[3]" /> : <X className="w-5 h-5 text-red-500 stroke-[3]" />}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-2 flex items-center justify-between border-t border-border/50">
        <Button 
          variant={submitted ? "outline" : "default"} 
          className="min-w-[120px] font-semibold"
          onClick={() => {
            if (submitted) {
               setSubmitted(false);
               setItems([...correctItems].sort(() => Math.random() - 0.5));
            } else {
               setSubmitted(true);
            }
          }}
        >
          {submitted ? 'Retry' : 'Submit'}
        </Button>
      </div>
    </div>
  );
}


// ─── ComponentPreview ─────────────────────────────────────────────────────────

function parseMaybeJson(raw: any): any {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return raw;
}

function ComponentPreview({ blockType, blockData }: { blockType: string; blockData: any }) {
  switch (blockType) {
    case 'video': {
      let ytId = blockData?.metadata?.youtube_id_1_0 || blockData?.data?.youtube_id_1_0;
      
      // Fallback extraction from XML data if it's stored in XML block
      if (!ytId && typeof blockData?.data === 'string') {
        const xmlMatch = blockData.data.match(/youtube_id_1_0="([^"]+)"/);
        if (xmlMatch) ytId = xmlMatch[1];
      }
      
      // Open edX default video ID if no ID is found
      if (!ytId) ytId = '3_yD_cEKoCk';

      return ytId ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-red-500/10 text-red-500">
              <Video className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">YouTube Video</span>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
              <code className="text-[11px] font-mono font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">{ytId}</code>
            </div>
          </div>
          <div className="p-1 rounded-xl bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/5 border border-primary/10 shadow-lg shadow-primary/5">
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-black shadow-inner">
              <iframe
                key={ytId}
                width="100%" height="100%"
                src={`https://www.youtube.com/embed/${ytId}?rel=0`}
                title="YouTube Preview"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-border bg-muted/30 text-muted-foreground gap-3">
          <div className="p-3 bg-background rounded-full shadow-sm">
            <Video className="h-6 w-6 text-muted-foreground/60" />
          </div>
          <span className="text-sm font-medium">Video — hover để Edit cấu hình YouTube ID</span>
        </div>
      );
    }

    case 'html': {
      const html = blockData?.data || '';
      return html.trim() ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500">
              <Type className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">Văn bản & Hình ảnh</span>
          </div>
          <div className="p-4 rounded-xl bg-background border border-border shadow-sm">
            <div
              dangerouslySetInnerHTML={{ __html: rewriteHtml(html) }}
              className="prose dark:prose-invert max-w-none text-sm max-h-[300px] overflow-y-auto relative custom-scrollbar
                [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6
                [&_img]:max-h-48 [&_img]:object-contain [&_img]:rounded-lg [&_img]:shadow-sm [&_img]:border [&_img]:border-border [&_img]:my-2
                [&_p]:leading-relaxed [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm"
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-border bg-muted/30 text-muted-foreground gap-3">
          <div className="p-3 bg-background rounded-full shadow-sm">
            <Type className="h-6 w-6 text-muted-foreground/60" />
          </div>
          <span className="text-sm font-medium">Text/HTML — hover để nhập nội dung & hình ảnh</span>
        </div>
      );
    }

    case 'problem': {
      const xml = blockData?.data || '';
      const parsed = parseProblemXml(xml);
      
      if (!parsed) {
        const trimmed = xml.trim().replace(/<\/?problem>/g, '').trim();
        return trimmed ? (
          <div className="flex items-start gap-2">
            <HelpCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <pre className="text-xs text-muted-foreground font-mono max-h-24 overflow-hidden line-clamp-4 whitespace-pre-wrap">
              {trimmed.slice(0, 300)}{trimmed.length > 300 ? '...' : ''}
            </pre>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <HelpCircle className="h-4 w-4" />
            <span>Problem — hover để Edit câu hỏi</span>
          </div>
        );
      }

      return <ProblemPreviewInteractive parsed={parsed} weight={blockData?.metadata?.weight ?? 1.0} />;
    }

    case 'la_crossword': {
      const parsed = parseMaybeJson(blockData?.metadata?.crossword_data || blockData?.crossword_data);
      return <CrosswordPreviewInteractive parsed={parsed} />;
    }

    case 'la_sortable': {
      const parsed = parseMaybeJson(blockData?.metadata?.sortable_data || blockData?.sortable_data);
      const qt = blockData?.metadata?.question_text || blockData?.question_text || '';
      return <SortablePreviewInteractive parsed={parsed} questionText={qt} />;
    }

    default:
      return (
        <div className="text-sm text-muted-foreground">[{blockType}] — hover để Edit cấu hình</div>
      );
  }
}

// ─── Interactive Problem Preview ────────────────────────────────────────────────

function ProblemPreviewInteractive({ parsed, weight }: { parsed: any; weight: number }) {
  const isMulti = parsed.type === 'choiceresponse';
  const isInput = parsed.type === 'numericalresponse' || parsed.type === 'stringresponse';
  const isDropdown = parsed.type === 'optionresponse';
  
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [inputValue, setInputValue] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const toggleChoice = (id: string) => {
    if (submitted || isInput || isDropdown) return;
    const next = new Set(selected);
    if (!isMulti) {
      next.clear();
      next.add(id);
    } else {
      if (next.has(id)) next.delete(id);
      else next.add(id);
    }
    setSelected(next);
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  let isCorrect = false;
  if (submitted) {
    if (isInput) {
       const correctAnswers = parsed.choices.map((c: any) => c.html);
       if (parsed.type === 'numericalresponse') {
          // Simple parsing for tolerance/preview, ignoring actual tolerance for now as it can be complex (e.g. 5%)
          isCorrect = correctAnswers.some((ans: string) => Math.abs(parseFloat(ans) - parseFloat(inputValue)) <= 0.0001); 
       } else {
          isCorrect = correctAnswers.some((ans: string) => ans.toLowerCase().trim() === inputValue.toLowerCase().trim());
       }
    } else if (isDropdown) {
       const correctChoice = parsed.choices.find((c: any) => c.correct);
       isCorrect = inputValue === correctChoice?.html;
    } else {
      const correctIds = new Set(parsed.choices.filter((c: any) => c.correct).map((c: any) => c.id));
      if (isMulti) {
         isCorrect = selected.size === correctIds.size && [...selected].every(id => correctIds.has(id));
      } else {
         isCorrect = selected.size === 1 && correctIds.has([...selected][0]);
      }
    }
  }

  return (
    <div className="space-y-4 max-w-4xl py-1">
      <div className="text-[13px] text-muted-foreground">
        {submitted ? `${isCorrect ? weight.toFixed(1) : '0.0'}/${weight.toFixed(1)} point (graded)` : `0.0/${weight.toFixed(1)} point (ungraded)`}
      </div>
      
      <div 
        className="text-[15px] prose dark:prose-invert max-w-none [&_p]:m-0" 
        dangerouslySetInnerHTML={{ __html: rewriteHtml(parsed.questionHtml) }} 
      />
      
      {isInput ? (
        <div className="mt-4 flex items-center gap-3">
          <input
            type="text"
            disabled={submitted}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className={`w-64 h-10 rounded-md border px-3 py-2 text-[15px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors disabled:opacity-100 ${submitted ? (isCorrect ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10') : 'border-input bg-background'}`}
            placeholder="Nhập câu trả lời của bạn..."
            onClick={(e) => e.stopPropagation()}
          />
          {submitted && (
            <div className="shrink-0">
              {isCorrect ? <Check className="w-5 h-5 text-green-500 stroke-[3]" /> : <X className="w-5 h-5 text-red-500 stroke-[3]" />}
            </div>
          )}
        </div>
      ) : isDropdown ? (
        <div className="mt-4 flex items-center gap-3">
          <Select 
            value={inputValue} 
            onValueChange={setInputValue} 
            disabled={submitted}
          >
            <SelectTrigger 
              className={`w-full h-10 ${submitted ? (isCorrect ? 'border-green-500 bg-green-500/10 text-green-900 dark:text-green-200' : 'border-red-500 bg-red-500/10 text-red-900 dark:text-red-200') : 'border-input bg-background'}`}
            >
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {parsed.choices.map((c: any) => (
                <SelectItem key={c.id} value={c.html}>{c.html}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {submitted && (
            <div className="shrink-0">
              {isCorrect ? <Check className="w-5 h-5 text-green-500 stroke-[3]" /> : <X className="w-5 h-5 text-red-500 stroke-[3]" />}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2 mt-4">
          {parsed.choices.map((choice: any) => {
            const isSelected = selected.has(choice.id);
            const showCorrectness = submitted && isSelected;
            const isChoiceCorrect = isMulti ? isCorrect : choice.correct;

            let borderClass = "border-border";
            if (showCorrectness) {
              borderClass = isChoiceCorrect ? "border-green-500 bg-green-500/10" : "border-red-500 bg-red-500/10";
            } else if (isSelected) {
              borderClass = "border-primary";
            }

            return (
              <div 
                key={choice.id} 
                className={`flex items-start gap-3 p-3 rounded-md border bg-background cursor-pointer transition-colors ${borderClass} hover:bg-muted/50`}
                onClick={(e) => { e.stopPropagation(); toggleChoice(choice.id); }}
              >
                <div className="pt-[1px]">
                  <div className={`w-[18px] h-[18px] rounded-${isMulti ? 'sm' : 'full'} border flex items-center justify-center shrink-0 ${isSelected ? (isMulti ? 'bg-primary border-primary' : 'border-primary') : 'border-input'}`}>
                    {isSelected && (
                      isMulti ? <Check className="w-3.5 h-3.5 text-primary-foreground stroke-[3]" /> : <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    )}
                  </div>
                </div>
                <div 
                  className="flex-1 text-[15px] prose dark:prose-invert max-w-none [&_p]:m-0 leading-tight"
                  dangerouslySetInnerHTML={{ __html: rewriteHtml(choice.html) }}
                />
                {showCorrectness && (
                  <div className="shrink-0 pt-[1px]">
                    {isChoiceCorrect ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <X className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      
      {submitted && parsed.explanationHtml && (
        <div className="mt-4 p-4 rounded-md bg-muted/40 border border-border">
          <div className="font-semibold text-sm mb-2">Giải thích:</div>
          <div 
            className="text-[14px] prose dark:prose-invert max-w-none [&_p]:m-0"
            dangerouslySetInnerHTML={{ __html: rewriteHtml(parsed.explanationHtml) }}
          />
        </div>
      )}

      {showHint && parsed.hints.length > 0 && (
        <div className="mt-4 space-y-2">
          {parsed.hints.map((hint: string, i: number) => (
             <div key={i} className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-sm text-amber-900 dark:text-amber-200">
               <span className="font-semibold mr-2">Gợi ý {i+1}:</span> {hint}
             </div>
          ))}
        </div>
      )}
      
      <div className="flex justify-between items-center mt-6">
        <Button 
          variant={submitted ? "secondary" : "default"} 
          size="sm" 
          onClick={(e) => { 
            e.stopPropagation(); 
            if (submitted) {
              setSubmitted(false);
              setSelected(new Set());
              setInputValue('');
            } else {
              handleSubmit(); 
            }
          }}
          disabled={(isInput || isDropdown ? inputValue.trim().length === 0 : selected.size === 0) && !submitted}
        >
          {submitted ? "Làm lại (Retry)" : "Submit"}
        </Button>
        {parsed.hints.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-sm font-medium bg-muted/50 hover:bg-muted"
            onClick={(e) => { e.stopPropagation(); setShowHint(true); }}
            disabled={showHint}
          >
            Hint
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── ComponentEditForm ────────────────────────────────────────────────────────

function ComponentEditForm({ blockInfo, courseId, onSaved }: {
  blockInfo: any;
  courseId?: string;
  onSaved: () => void;
}) {
  const category = blockInfo?.category || blockInfo?.block_type || '';

  const [displayName, setDisplayName] = useState(blockInfo?.display_name || '');
  const [htmlContent, setHtmlContent] = useState(blockInfo?.data || '');
  const [problemXml, setProblemXml] = useState(blockInfo?.data || '');

  const [metadata, setMetadata] = useState<any>(() => {
    const meta = { ...(blockInfo?.metadata || {}) };
    if (category === 'video') {
      let ytId = meta.youtube_id_1_0 || meta.youtube_id;
      if (!ytId && typeof blockInfo?.data === 'string') {
        const xmlMatch = blockInfo.data.match(/youtube_id_1_0="([^"]+)"/);
        if (xmlMatch) ytId = xmlMatch[1];
      }
      if (!ytId) ytId = '3_yD_cEKoCk';
      meta.youtube_id_1_0 = ytId;
    }
    return meta;
  });

  const [cwWords, setCwWords] = useState<CrosswordWord[]>(() => {
    const raw = blockInfo?.metadata?.crossword_data || blockInfo?.crossword_data;
    const parsed = parseMaybeJson(raw);
    return Array.isArray(parsed.words) ? parsed.words : [];
  });

  const [cwKeywordCol, setCwKeywordCol] = useState<number>(() => {
    const raw = blockInfo?.metadata?.crossword_data || blockInfo?.crossword_data;
    const parsed = parseMaybeJson(raw);
    const kc = parsed?.keyword_coordinates;
    if (Array.isArray(kc) && kc.length > 0) {
      return kc[0].col ?? 0;
    }
    return 0;
  });

  const [soQuestionText, setSoQuestionText] = useState(
    blockInfo?.metadata?.question_text || blockInfo?.question_text || ''
  );
  const [soItems, setSoItems] = useState<SortableItem[]>(() => {
    const raw = blockInfo?.metadata?.sortable_data || blockInfo?.sortable_data;
    const parsed = parseMaybeJson(raw);
    return Array.isArray(parsed.items) ? parsed.items : [];
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const id = blockInfo?.id;
      if (!id) throw new Error('Block ID không hợp lệ');

      if (category === 'video') {
        return updateXBlock(id, {
          metadata: { display_name: displayName, ...metadata },
        });
      }
      if (category === 'html') {
        return updateXBlock(id, {
          metadata: { display_name: displayName },
          data: htmlContent,
        });
      }
      if (category === 'problem') {
        return updateXBlock(id, {
          metadata: { display_name: displayName },
          data: problemXml,
        });
      }
      if (category === 'la_crossword') {
        const kwCoords = cwWords.map((_, idx) => ({ row: idx, col: cwKeywordCol }));
        return studioSubmit(id, {
          display_name: displayName,
          crossword_data: JSON.stringify({ words: cwWords, keyword_coordinates: kwCoords }),
        });
      }
      if (category === 'la_sortable') {
        return studioSubmit(id, {
          display_name: displayName,
          question_text: soQuestionText,
          sortable_data: JSON.stringify({ items: soItems }),
        });
      }
      return updateXBlock(id, { metadata: { display_name: displayName } });
    },
    onSuccess: () => { toast.success('Đã lưu thành công!'); onSaved(); },
    onError: (err: any) => toast.error('Lưu thất bại: ' + (err?.message || 'Unknown')),
  });

  const renderEditor = () => {
    switch (category) {
      case 'video':
        return (
          <VideoEditor
            displayName={displayName}
            onDisplayNameChange={setDisplayName}
            metadata={metadata}
            onMetadataChange={setMetadata}
          />
        );
      case 'html':
        return (
          <HtmlEditor
            displayName={displayName}
            onDisplayNameChange={setDisplayName}
            htmlContent={htmlContent}
            onHtmlChange={setHtmlContent}
            courseId={courseId || ''}
          />
        );
      case 'problem':
        return (
          <ProblemEditor
            displayName={displayName}
            onDisplayNameChange={setDisplayName}
            problemXml={problemXml}
            onXmlChange={setProblemXml}
          />
        );
      case 'la_crossword':
        return (
          <CrosswordEditor
            displayName={displayName}
            onDisplayNameChange={setDisplayName}
            words={cwWords}
            onWordsChange={setCwWords}
            keywordCol={cwKeywordCol}
            onKeywordColChange={setCwKeywordCol}
          />
        );
      case 'la_sortable':
        return (
          <SortableEditor
            displayName={displayName}
            onDisplayNameChange={setDisplayName}
            questionText={soQuestionText}
            onQuestionChange={setSoQuestionText}
            items={soItems}
            onItemsChange={setSoItems}
          />
        );
      default:
        return (
          <div className="space-y-2">
            <label className="text-sm font-medium">Tên hiển thị</label>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
            />
            <p className="text-sm text-muted-foreground italic">
              Chưa có editor cho [{category}].
            </p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-5">
      {renderEditor()}
      <DialogFooter className="pt-5 border-t border-border">
        <Button
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending}
          className="gap-2 min-w-[130px]"
        >
          <Save className="h-4 w-4" />
          {saveMut.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
      </DialogFooter>
    </div>
  );
}
