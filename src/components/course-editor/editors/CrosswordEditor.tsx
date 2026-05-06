import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from './VideoEditor';
import { CrosswordPreviewInteractive } from '../CrosswordPreview';

interface CrosswordWord {
  id: number;
  answer: string;
  clue: string;
  row: number;
  col: number;
  direction: 'across' | 'down';
}

interface CrosswordEditorProps {
  displayName: string;
  onDisplayNameChange: (v: string) => void;
  words: CrosswordWord[];
  onWordsChange: (words: CrosswordWord[]) => void;
  keywordCol?: number;
  onKeywordColChange?: (v: number) => void;
}

export default function CrosswordEditor({
  displayName, onDisplayNameChange, words, onWordsChange,
  keywordCol = 0, onKeywordColChange,
}: CrosswordEditorProps) {

  const addWord = () => {
    const nextId = words.length > 0 ? Math.max(...words.map(w => w.id)) + 1 : 1;
    onWordsChange([...words, {
      id: nextId,
      answer: '',
      clue: '',
      row: words.length,
      col: 0,
      direction: 'across',
    }]);
  };

  const updateWord = (idx: number, field: keyof CrosswordWord, value: any) => {
    const updated = words.map((w, i) => i === idx ? { ...w, [field]: value } : w);
    onWordsChange(updated);
  };

  const removeWord = (idx: number) => {
    // Sau khi xóa, re-assign id và row theo index (giống XBlock gốc)
    const filtered = words.filter((_, i) => i !== idx);
    const reindexed = filtered.map((w, i) => ({
      ...w,
      id: i + 1,
      row: i,
    }));
    onWordsChange(reindexed);
  };

  // Tạo keyword_coordinates cho preview
  const keywordCoordinates = words.map((_, idx) => ({ row: idx, col: keywordCol }));

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Cột trái: Form nhập liệu */}
      <div className="flex-1 space-y-5 lg:max-w-[450px] xl:max-w-[500px] shrink-0">
        <Field label="Tên bài tập">
          <input
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={displayName}
            onChange={e => onDisplayNameChange(e.target.value)}
          />
        </Field>

        <Field label="Cột chữ khóa dọc (Từ khóa chính)">
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              className="flex h-10 w-24 rounded-md border border-input bg-background px-3 text-sm"
              value={keywordCol}
              onChange={e => onKeywordColChange?.(parseInt(e.target.value) || 0)}
            />
            <span className="text-xs text-muted-foreground">
              Chỉ số cột sẽ được highlight tạo thành từ khóa dọc
            </span>
          </div>
        </Field>

        <hr className="border-border" />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold">Danh sách Câu Hỏi - Hàng Ngang ({words.length})</h4>
            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={addWord}>
              <Plus className="h-3.5 w-3.5" /> Thêm hàng
            </Button>
          </div>

          {words.length === 0 && (
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
              Chưa có từ khóa nào. Bấm "Thêm hàng" để bắt đầu.
            </div>
          )}

          <div className="space-y-2">
            {words.map((word, idx) => (
              <div key={word.id} className="border border-border rounded-xl p-4 bg-card space-y-3 hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Hàng #{word.id}
                    {word.answer && (
                      <span className="ml-2 text-primary normal-case font-normal">
                        {word.answer.length} ô
                      </span>
                    )}
                  </span>
                  <Button
                    variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10"
                    onClick={() => removeWord(idx)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Câu hỏi gợi ý</label>
                    <input
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={word.clue}
                      onChange={e => updateWord(idx, 'clue', e.target.value)}
                      placeholder="Gợi ý cho hàng ngang..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Đáp án (Viết liền không dấu)</label>
                    <input
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm font-mono uppercase"
                      value={word.answer}
                      onChange={e => {
                        const val = e.target.value.toUpperCase().replace(/[^A-ZĐ0-9]/g, '');
                        updateWord(idx, 'answer', val);
                      }}
                      placeholder="DAPAN"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Căn lề cột (Thụt hàng)</label>
                  <input
                    type="number" min={0} max={20}
                    className="flex h-9 w-24 rounded-md border border-input bg-background px-3 text-sm"
                    value={word.col}
                    onChange={e => {
                      const v = parseInt(e.target.value) || 0;
                      updateWord(idx, 'col', Math.min(Math.max(v, 0), 20));
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
          <strong>Lưu ý:</strong> Đáp án phải IN HOA, viết liền không dấu tiếng Việt. "Căn lề cột" dùng để thụt đầu hàng sao cho cột chữ khóa dọc thẳng hàng.
        </div>
      </div>

      {/* Cột phải: Live Preview */}
      <div className="flex-1 sticky top-0 self-start">
        <div className="mb-4">
          <h3 className="text-sm font-bold flex items-center gap-2 text-[#0B57D0]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0B57D0]"></span>
            </span>
            Xem trước Ma trận lưới
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Ô màu xanh đậm = cột chữ khóa dọc (cột {keywordCol}). Thay đổi đáp án/căn lề để canh chỉnh từ khóa chính.
          </p>
        </div>
        <CrosswordPreviewInteractive
          parsed={{ words, keyword_coordinates: keywordCoordinates }}
          showAnswers={true}
        />
      </div>
    </div>
  );
}

export type { CrosswordWord };
