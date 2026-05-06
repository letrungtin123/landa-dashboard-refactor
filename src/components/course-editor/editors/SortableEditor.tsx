import React, { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from './VideoEditor';

interface SortableItem {
  id: number;
  text: string;
}

interface SortableEditorProps {
  displayName: string;
  onDisplayNameChange: (v: string) => void;
  questionText: string;
  onQuestionChange: (v: string) => void;
  items: SortableItem[];
  onItemsChange: (items: SortableItem[]) => void;
}

export default function SortableEditor({
  displayName, onDisplayNameChange,
  questionText, onQuestionChange,
  items, onItemsChange,
}: SortableEditorProps) {
  const [nextId, setNextId] = useState(() => {
    const maxId = items.reduce((m, i) => Math.max(m, i.id), 0);
    return maxId + 1;
  });
  const [dragging, setDragging] = useState<number | null>(null);

  const addItem = () => {
    onItemsChange([...items, { id: nextId, text: '' }]);
    setNextId(nextId + 1);
  };

  const updateItem = (idx: number, text: string) => {
    onItemsChange(items.map((item, i) => i === idx ? { ...item, text } : item));
  };

  const removeItem = (idx: number) => {
    onItemsChange(items.filter((_, i) => i !== idx));
  };

  const moveItem = (from: number, to: number) => {
    const arr = [...items];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    onItemsChange(arr);
  };

  const handleDragStart = (idx: number) => setDragging(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragging !== null && dragging !== idx) {
      moveItem(dragging, idx);
      setDragging(idx);
    }
  };
  const handleDragEnd = () => setDragging(null);

  return (
    <div className="space-y-5">
      <Field label="Tên hiển thị">
        <input
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={displayName}
          onChange={e => onDisplayNameChange(e.target.value)}
        />
      </Field>

      <Field label="Câu hỏi / Hướng dẫn">
        <textarea
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
          rows={3}
          value={questionText}
          onChange={e => onQuestionChange(e.target.value)}
          placeholder="Hãy sắp xếp các bước theo đúng thứ tự..."
        />
      </Field>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium">Các bước / Items ({items.length})</label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kéo thả để đổi thứ tự. Thứ tự này là thứ tự <strong>đúng</strong> — học sinh sẽ thấy thứ tự xáo trộn.
            </p>
          </div>
          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs shrink-0" onClick={addItem}>
            <Plus className="h-3.5 w-3.5" /> Thêm bước
          </Button>
        </div>

        {items.length === 0 && (
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
            Chưa có bước nào. Nhấn "Thêm bước" để bắt đầu.
          </div>
        )}

        <div className="space-y-2">
          {items.map((item, idx) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={e => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 border rounded-xl px-3 py-2.5 bg-card transition-all ${dragging === idx ? 'opacity-50 scale-[0.99] border-primary' : 'border-border hover:border-primary/30'}`}
            >
              <div className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground shrink-0">
                <GripVertical className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded shrink-0 min-w-[32px] text-center">
                {idx + 1}
              </span>
              <input
                className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                value={item.text}
                onChange={e => updateItem(idx, e.target.value)}
                placeholder={`Bước ${idx + 1}...`}
              />
              <Button
                variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0"
                onClick={() => removeItem(idx)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 rounded-lg bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 text-xs text-violet-700 dark:text-violet-300">
        <strong>Lưu ý:</strong> Học sinh sẽ thấy các bước bị xáo trộn ngẫu nhiên. Thứ tự bạn đặt ở đây là thứ tự <strong>đúng</strong> để chấm điểm.
      </div>
    </div>
  );
}

export type { SortableItem };
