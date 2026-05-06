import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCourseOutlineIndex } from '@/api/course-authoring';
import { useHeaderInfo } from '@/utils/header-store';
import { Skeleton } from '@/components/ui/skeleton';
import OutlineTree from '@/components/course-editor/OutlineTree';
import { AlertCircle, Menu } from 'lucide-react';
import UnitEditor from '@/components/course-editor/UnitEditor';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

export default function CourseEditorPage() {
  const { courseId } = useParams<{ courseId: string }>();
  useHeaderInfo('Chỉnh sửa khóa học');
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: outline, isLoading, isError } = useQuery({
    queryKey: ['course-outline-index', courseId],
    queryFn: () => getCourseOutlineIndex(courseId as string),
    enabled: !!courseId,
    staleTime: 30_000,
  });

  const courseStructure = outline?.course_structure;

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-64px)] p-6 gap-6">
        <div className="w-80 space-y-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" style={{ width: `${90 - i * 8}%` }} />
          ))}
        </div>
        <div className="flex-1">
          <Skeleton className="h-[500px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !courseStructure) {
    return (
      <div className="p-6">
        <div className="bg-destructive/10 border-l-4 border-destructive text-destructive p-5 rounded-xl flex gap-3">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold">Lỗi tải outline</h3>
            <p className="text-sm mt-1 opacity-80">
              Không thể kết nối đến CMS Studio. Kiểm tra lại kết nối và quyền truy cập.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] bg-background flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-background sticky top-0 z-10 shrink-0">
        <div>
          <h2 className="text-sm font-bold text-foreground truncate w-[200px]" title={courseStructure.display_name}>
            {courseStructure.display_name}
          </h2>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 flex gap-2">
              <Menu className="h-4 w-4" />
              Mục lục
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] p-0 flex flex-col">
            <div className="p-4 border-b border-border bg-background/80 shrink-0">
              <h2 className="text-base font-bold text-foreground truncate">{courseStructure.display_name}</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate opacity-60">{courseId}</p>
            </div>
            <div className="p-3 flex-1 overflow-y-auto">
              <OutlineTree
                courseId={courseId as string}
                onSelectUnit={(unitId) => setSelectedUnit(unitId)}
                selectedUnitId={selectedUnit}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar: Outline Tree */}
      <div className="hidden md:flex w-80 border-r border-border overflow-y-auto bg-muted/20 flex-col shrink-0">
        <div className="p-4 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-10">
          <h2
            className="text-base font-bold text-foreground truncate"
            title={courseStructure.display_name}
          >
            {courseStructure.display_name}
          </h2>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate opacity-60">
            {courseId}
          </p>
        </div>
        <div className="p-3 flex-1 overflow-y-auto">
          <OutlineTree
            courseId={courseId as string}
            onSelectUnit={(unitId) => setSelectedUnit(unitId)}
            selectedUnitId={selectedUnit}
          />
        </div>
      </div>

      {/* Main Content: Unit Editor */}
      <div className="flex-1 overflow-y-auto bg-background/50">
        {selectedUnit ? (
          <div className="p-4 md:p-6">
            <UnitEditor
              key={selectedUnit}
              unitId={selectedUnit}
              courseId={courseId as string}
              onContentChange={() => {
                queryClient.invalidateQueries({ queryKey: ['course-outline-index', courseId] });
              }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground flex-col gap-4">
            <div className="w-20 h-20 bg-muted/40 rounded-full flex items-center justify-center shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" className="opacity-30">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-base font-medium">Chưa chọn Unit nào</p>
              <p className="text-sm opacity-60 mt-1">Chọn Unit ở sidebar trái để bắt đầu chỉnh sửa</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
