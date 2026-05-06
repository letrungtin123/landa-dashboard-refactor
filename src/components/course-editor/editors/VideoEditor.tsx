import React, { useState } from 'react';
import { Video } from 'lucide-react';

interface VideoEditorProps {
  displayName: string;
  onDisplayNameChange: (v: string) => void;
  metadata: any;
  onMetadataChange: (m: any) => void;
}

function extractYoutubeId(input: string): string {
  if (!input) return '';
  // Nếu là URL đầy đủ thì extract ID
  const regexes = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const r of regexes) {
    const m = input.match(r);
    if (m) return m[1];
  }
  // Nếu đã là ID thuần (11 ký tự)
  if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) return input.trim();
  return input.trim();
}

export default function VideoEditor({ displayName, onDisplayNameChange, metadata, onMetadataChange }: VideoEditorProps) {
  const [inputValue, setInputValue] = useState(() => {
    const id = metadata?.youtube_id_1_0;
    if (!id) return '';
    // Nếu nó đã là URL rồi thì giữ nguyên, còn nếu chỉ là ID 11 ký tự thì map thành URL
    if (id.length === 11 && !id.includes('/')) {
      return `https://www.youtube.com/watch?v=${id}`;
    }
    return id;
  });

  const youtubeId = extractYoutubeId(inputValue);

  const handleChange = (val: string) => {
    setInputValue(val);
    const id = extractYoutubeId(val);
    onMetadataChange({ ...metadata, youtube_id_1_0: id });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Tên hiển thị">
          <input
            className="flex h-11 w-full rounded-xl border border-input bg-background/50 px-4 text-sm font-medium shadow-sm transition-all duration-200 hover:bg-background focus:border-primary focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/10"
            value={displayName}
            onChange={e => onDisplayNameChange(e.target.value)}
          />
        </Field>

        <Field label="Start Time (tùy chọn)">
          <input
            className="flex h-11 w-full rounded-xl border border-input bg-background/50 px-4 text-sm font-mono shadow-sm transition-all duration-200 hover:bg-background focus:border-primary focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/10"
            value={metadata?.start_time || ''}
            onChange={e => onMetadataChange({ ...metadata, start_time: e.target.value })}
            placeholder="00:00:00"
          />
        </Field>
      </div>

      <Field label="YouTube URL hoặc Video ID">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Video className="h-5 w-5 text-muted-foreground" />
          </div>
          <input
            className="flex h-11 w-full rounded-xl border border-input bg-background/50 pl-10 pr-4 text-sm font-mono shadow-sm transition-all duration-200 hover:bg-background focus:border-primary focus:bg-background focus:outline-none focus:ring-4 focus:ring-primary/10"
            value={inputValue}
            onChange={e => handleChange(e.target.value)}
            placeholder="https://youtube.com/watch?v=... hoặc dQw4w9WgXcQ"
          />
        </div>
        {youtubeId && youtubeId.length === 11 && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500"></span>
            ID hợp lệ: <span className="font-mono font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">{youtubeId}</span>
          </p>
        )}
      </Field>

      {youtubeId && youtubeId.length === 11 ? (
        <div className="p-1.5 rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/5 to-primary/5 border border-primary/10 shadow-xl shadow-primary/5">
          <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-inner">
            <iframe
              key={youtubeId}
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${youtubeId}?rel=0`}
              title="YouTube Preview"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center aspect-video w-full rounded-2xl border-2 border-dashed border-border bg-muted/30 text-muted-foreground gap-3 transition-colors hover:bg-muted/50 hover:border-primary/30">
          <div className="p-4 bg-background rounded-full shadow-sm">
            <Video className="h-8 w-8 text-muted-foreground/60" />
          </div>
          <span className="text-sm font-medium">Nhập YouTube URL để xem trước video</span>
        </div>
      )}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-foreground/90 tracking-tight">{label}</label>
      {children}
    </div>
  );
}
