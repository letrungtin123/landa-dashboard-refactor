import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';

/**
 * CrosswordPreviewInteractive
 * 
 * Logic chính xác theo la-crossword-xblock gốc:
 * - Mỗi word = 1 HÀNG NGANG (across), tất cả direction luôn là "across".
 * - word.row = chỉ số hàng (thường = index trong mảng).
 * - word.col = offset cột (thụt đầu hàng).
 * - keywordCol = cột dọc được highlight (tạo thành từ khóa chính).
 * 
 * Props:
 * - parsed.words: mảng CrosswordWord
 * - parsed.keyword_coordinates: mảng {row, col} hoặc rỗng
 * - showAnswers: nếu true, hiển thị đáp án sẵn (dùng trong Editor preview)
 */
export function CrosswordPreviewInteractive({ parsed, showAnswers = false }: { parsed: any; showAnswers?: boolean }) {
  const words: any[] = parsed?.words || [];
  const keywordCoords: any[] = parsed?.keyword_coordinates || [];
  
  // Xác định keywordCol: lấy col từ phần tử đầu tiên của keyword_coordinates
  const keywordCol = keywordCoords.length > 0 ? (keywordCoords[0].col ?? -1) : -1;

  // Tính kích thước lưới
  // Mỗi word chiếm 1 row, bắt đầu từ word.col, dài bằng word.answer.length (hoặc word.length)
  const totalRows = words.length;
  const totalCols = Math.min(30, Math.max(0, ...words.map((w: any) => {
    const ansLen = w.answer ? w.answer.length : (w.length || 0);
    return Math.min((w.col || 0), 20) + ansLen;
  })));

  // State cho input của học viên (chỉ dùng khi showAnswers = false)
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // Tạo map: key "row-col" → ký tự đáp án đúng
  const correctMap: Record<string, string> = {};
  // Tạo set: các ô hợp lệ (có thể gõ vào)
  const validCells = new Set<string>();
  // Tạo map: key "row-col" → true nếu ô đó là keyword column
  const keywordCells = new Set<string>();

  words.forEach((w: any, rowIndex: number) => {
    const row = rowIndex; // Mỗi word = 1 hàng, row = index
    const startCol = w.col || 0;
    const answerStr = w.answer || '';

    for (let i = 0; i < answerStr.length; i++) {
      const col = startCol + i;
      const key = `${row}-${col}`;
      validCells.add(key);
      correctMap[key] = answerStr[i].toUpperCase();

      if (col === keywordCol) {
        keywordCells.add(key);
      }
    }
  });

  // Auto-focus: trong crossword gốc tất cả đều ngang → nhảy sang phải
  const focusCell = useCallback((row: number, col: number) => {
    if (!gridRef.current) return;
    const el = gridRef.current.querySelector(`#cw-cell-${row}-${col}`) as HTMLInputElement;
    if (el && !el.disabled) el.focus();
  }, []);

  const renderGrid = () => {
    const rows = [];
    for (let r = 0; r < totalRows; r++) {
      const word = words[r];
      const startCol = word?.col || 0;
      const answerStr = word?.answer || '';
      const answerLen = answerStr.length || (word?.length || 0);
      const wordId = word?.id ?? (r + 1);
      const cols = [];

      for (let c = 0; c < totalCols; c++) {
        const key = `${r}-${c}`;
        const isValid = validCells.has(key);
        const isKeyword = keywordCells.has(key);

        if (!isValid) {
          // Ô trống (không thuộc từ nào)
          cols.push(<div key={key} className="w-12 h-12 shrink-0"></div>);
        } else {
          // Xác định style
          let bgClass = 'bg-background border-primary/30';
          let textColorClass = 'text-foreground';
          let focusStyle = 'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary';
          let extraStyle = '';

          if (isKeyword && !submitted) {
            bgClass = 'bg-primary border-primary';
            textColorClass = 'text-primary-foreground';
            focusStyle = 'focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/80';
          }

          if (showAnswers) {
            focusStyle = '';
            if (isKeyword) {
              bgClass = 'bg-primary border-primary';
              textColorClass = 'text-primary-foreground';
            } else {
              bgClass = 'bg-primary/10 border-primary';
              textColorClass = 'text-primary';
            }
          }

          if (submitted && !showAnswers) {
            focusStyle = '';
            const userVal = (inputs[key] || '').toUpperCase();
            const correctVal = correctMap[key] || '';
            if (userVal === correctVal) {
              bgClass = 'bg-primary/10 border-primary';
              textColorClass = 'text-primary';
              if (isKeyword) {
                bgClass = 'bg-primary border-primary';
                textColorClass = 'text-primary-foreground';
              }
            } else {
              bgClass = 'bg-destructive/10 border-destructive/60';
              textColorClass = 'text-destructive';
            }
          }

          const displayValue = showAnswers ? (correctMap[key] || '') : (inputs[key] || '');

          cols.push(
            <div key={key} className="relative w-12 h-12 shrink-0">
              <input
                id={`cw-cell-${r}-${c}`}
                maxLength={1}
                disabled={submitted || showAnswers}
                readOnly={showAnswers}
                className={`w-full h-full border-2 rounded-xl text-center font-bold text-xl uppercase transition-colors duration-200 ${bgClass} ${textColorClass} ${focusStyle}`}
                value={displayValue}
                onChange={e => {
                  if (showAnswers) return;
                  const val = e.target.value.toUpperCase().replace(/[^A-ZĐ0-9]/g, '');
                  if (val.length > 1) return;
                  setInputs(prev => ({ ...prev, [key]: val }));
                  if (val) focusCell(r, c + 1);
                }}
                onKeyDown={e => {
                  if (showAnswers) return;
                  if (e.key === 'Backspace' && !inputs[key]) {
                    e.preventDefault();
                    focusCell(r, c - 1);
                  }
                }}
                onClick={e => (e.target as HTMLInputElement).select()}
              />
            </div>
          );
        }
      }

      // Thêm số thứ tự hàng ở bên trái
      rows.push(
        <div key={r} className="flex gap-2 items-center">
          <span className="w-8 text-right text-[15px] font-semibold text-muted-foreground select-none shrink-0">
            {wordId}.
          </span>
          {cols}
        </div>
      );
    }
    return (
      <div ref={gridRef} className="flex flex-col gap-2 w-fit mx-auto">
        {rows}
      </div>
    );
  };

  if (words.length === 0) {
    return (
      <div className="p-8 border-2 border-dashed border-primary/30 rounded-2xl text-center text-muted-foreground bg-background">
        Chưa có từ vựng nào để hiển thị.
      </div>
    );
  }

  return (
    <div className="bg-muted/10 border border-border rounded-[24px] p-6 lg:p-10 space-y-10 shadow-sm w-full h-full font-sans overflow-y-auto">
      {/* Grid */}
      <div className="flex flex-col items-center">
        <div className="w-full overflow-x-auto custom-scrollbar pb-4 pt-2 min-w-0">
          {renderGrid()}
        </div>
      </div>

      {/* Danh sách câu hỏi */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold text-lg mb-6 text-card-foreground">Danh sách câu hỏi</h3>
        <ul className="space-y-3 text-[15px] text-muted-foreground">
          {words.map((w: any, idx: number) => (
            <li
              key={w.id ?? idx}
              className="flex gap-4 items-start bg-muted/30 px-5 py-3.5 rounded-xl border border-transparent hover:border-primary/30 transition-colors"
            >
              <span className="font-bold text-primary shrink-0 mt-0.5">{w.id ?? idx + 1}.</span>
              <span className="leading-relaxed">{w.clue || '(Chưa có gợi ý)'}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Nút Submit — ẩn khi showAnswers */}
      {!showAnswers && (
        <div className="flex justify-center pt-2">
          <Button
            variant="default"
            className="min-w-[200px] h-12 rounded-full font-bold text-[15px] shadow-md transition-transform hover:-translate-y-0.5 active:translate-y-0"
            onClick={() => {
              if (submitted) {
                setSubmitted(false);
                setInputs({});
              } else {
                setSubmitted(true);
              }
            }}
          >
            {submitted ? 'Thử lại' : 'Nộp bài chấm điểm'}
          </Button>
        </div>
      )}
    </div>
  );
}
