import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCourses, updateCourse, bulkCourseAction, getCourseModalConfig, updateCourseModalConfig, sendCourseNotification, type LandaCourse, type CourseModalConfig } from '@/api/landa-admin';
import { createCourse } from '@/api/course-authoring';
import { apiClient } from '@/api/client';
import { useHeaderInfo } from '@/utils/header-store';
import { useDebounce } from '@/hooks/use-debounce';
import { TableToolbar } from '@/components/shared/table-toolbar';
import { Pagination } from '@/components/shared/pagination';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  BookOpen, GraduationCap, Globe, Edit2, Plus, ImagePlus, Loader2, LayoutTemplate, ArrowRight, FolderOpen, Archive, ArchiveRestore, Settings2, Bell
} from 'lucide-react';
import { CourseFilesModal } from '@/components/course-editor/CourseFilesModal';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function CoursesPage() {
  useHeaderInfo('Courses');

  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [visFilter, setVisFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selected, setSelected] = useState<string[]>([]);
  const [previewCourse, setPreviewCourse] = useState<LandaCourse | null>(null);
  const [selectedCourseFiles, setSelectedCourseFiles] = useState<string | null>(null);
  const [modalConfigCourseId, setModalConfigCourseId] = useState<string | null>(null);
  const [notifyCourseId, setNotifyCourseId] = useState<string | null>(null);

  // --- Tạo course mới ---
  const [showCreate, setShowCreate] = useState(false);
  const [newOrg, setNewOrg] = useState('LAndA2');
  const [newNumber, setNewNumber] = useState('');
  const [newRun, setNewRun] = useState(String(new Date().getFullYear()));
  const [newName, setNewName] = useState('');

  const createMut = useMutation({
    mutationFn: () => createCourse({
      org: newOrg,
      number: newNumber,
      run: newRun,
      display_name: newName,
      start: '2020-01-01T00:00:00Z',
    }),
    onSuccess: (data) => {
      toast.success(`Đã tạo course: ${data.display_name}`);
      setShowCreate(false);
      setNewNumber(''); setNewName('');
      queryClient.invalidateQueries({ queryKey: ['landa-courses'] });
    },
    onError: (err: any) => {
      toast.error('Tạo thất bại: ' + (err?.response?.data?.error || err.message));
    },
  });

  // --- Upload Course Image ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCourseId, setUploadingCourseId] = useState<string | null>(null);

  const handleUploadCourseImage = async (courseId: string, file: File) => {
    setUploadingCourseId(courseId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // 1. Upload to Assets API
      const { data } = await apiClient.post(`/cms-api/landa-admin/api/authoring/assets/${courseId}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      const display_name = data?.asset?.display_name || data?.display_name || file.name;
      if (!display_name) throw new Error("Không nhận được tên file từ server");

      // 2. Update Course Metadata
      const usageKey = courseId.replace('course-v1:', 'block-v1:') + '+type@course+block@course';
      await apiClient.post(`/cms-api/landa-admin/api/authoring/xblock/${usageKey}`, {
        metadata: { course_image: display_name }
      });
      
      toast.success('Đã cập nhật ảnh đại diện khóa học!');
      queryClient.invalidateQueries({ queryKey: ['landa-courses'] });
    } catch (err: any) {
      toast.error('Cập nhật ảnh thất bại: ' + (err?.response?.data?.error || err.message));
    } finally {
      setUploadingCourseId(null);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const courseId = fileInputRef.current?.getAttribute('data-course-id');
    if (!file || !courseId) return;
    
    handleUploadCourseImage(courseId, file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerUpload = (courseId: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('data-course-id', courseId);
      fileInputRef.current.click();
    }
  };

  useEffect(() => { setPage(1); }, [debouncedSearch, visFilter]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['landa-courses', page, limit, debouncedSearch, visFilter],
    queryFn: () => getCourses({
      page, page_size: limit,
      search: debouncedSearch || undefined,
      visibility: visFilter !== 'all' ? visFilter as 'staff_only' | 'public' : undefined,
    }),
  });

  const courses = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  // Toggle visibility
  const toggleVis = useMutation({
    mutationFn: ({ id, visible }: { id: string; visible: boolean }) =>
      updateCourse(id, { visible_to_staff_only: visible }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landa-courses'] });
      toast.success('Đã cập nhật');
    },
    onError: () => toast.error('Cập nhật thất bại'),
  });

  // Bulk
  const bulkMut = useMutation({
    mutationFn: ({ action }: { action: 'staff_only' | 'public' }) =>
      bulkCourseAction(selected, action),
    onSuccess: (result, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['landa-courses'] });
      setSelected([]);
      toast.success(`Đã chuyển ${result.updated} khóa học sang trạng thái ${action === 'public' ? 'hiển thị' : 'lưu trữ'}`);
    },
    onError: () => toast.error('Cập nhật hàng loạt thất bại'),
  });

  // Selection
  const allSelected = courses.length > 0 && courses.every((c) => selected.includes(c.id));
  const toggleAll = () => setSelected(allSelected ? [] : courses.map((c) => c.id));
  const toggleOne = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto pb-10">

      {/* Dialog tạo course */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Tạo Khóa Học Mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Tên khóa học</label>
              <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ví dụ: Văn hóa doanh nghiệp L&A" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Org</label>
                <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={newOrg} onChange={e => setNewOrg(e.target.value)} placeholder="LAndA2" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Course Number</label>
                <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={newNumber} onChange={e => setNewNumber(e.target.value)} placeholder="000010" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Run (năm)</label>
                <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={newRun} onChange={e => setNewRun(e.target.value)} placeholder="2026" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Course ID sẽ là: <span className="font-mono font-semibold">course-v1:{newOrg}+{newNumber}+{newRun}</span></p>
            <p className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-2 rounded-md">💡 Start date được đặt là 01/01/2020 để course tự động publish và hiển thị cho học viên.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button onClick={() => createMut.mutate()} disabled={createMut.isPending || !newName || !newNumber || !newOrg || !newRun}>
              {createMut.isPending ? 'Đang tạo...' : 'Tạo Course'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Preview Card */}
      <Dialog open={!!previewCourse} onOpenChange={(o) => !o && setPreviewCourse(null)}>
        <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-border bg-background gap-0 rounded-2xl">
          <div className="relative h-48 bg-[#3b82f6] flex items-center justify-center">
            {previewCourse?.image_url && !previewCourse.image_url.includes('images/course_image') && !previewCourse.image_url.includes('images_course_image') ? (
              <img src={previewCourse.image_url} alt="course" className="w-full h-full object-cover" />
            ) : (
              <BookOpen className="w-20 h-20 text-white/50" strokeWidth={1.5} />
            )}
          </div>
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 font-medium px-2.5 py-0.5 rounded-full text-xs">Đang học</Badge>
              <Badge variant="outline" className="font-medium text-foreground bg-background rounded-full px-2.5 py-0.5 text-xs shadow-sm">Có hướng dẫn</Badge>
            </div>
            
            <div className="space-y-1">
              <h3 className="text-[22px] font-bold text-[#1a66ff] dark:text-[#3b82f6] leading-snug">
                {previewCourse?.display_name || "L&A System 4"}
              </h3>
              <p className="text-sm text-muted-foreground">{previewCourse?.org || "LAndA"}</p>
            </div>

            <div className="pt-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Tiến độ</span>
                <span className="text-sm font-bold text-[#1a66ff] dark:text-[#3b82f6]">50%</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-[#1a66ff] dark:bg-[#3b82f6] rounded-full" style={{ width: '50%' }} />
              </div>
            </div>

            <div className="pt-1">
              <Button variant="link" className="px-0 text-[#1a66ff] dark:text-[#3b82f6] font-semibold gap-1.5 h-auto text-[15px] hover:no-underline hover:opacity-80">
                Tiếp tục học <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={onFileChange} 
      />

      <TableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm khóa học..."
        filters={[
          {
            key: 'visibility',
            placeholder: 'Trạng thái',
            options: [
              { value: 'public', label: 'Đang hoạt động' },
              { value: 'staff_only', label: 'Đã lưu trữ' },
            ],
          },
        ]}
        filterValues={{ visibility: visFilter }}
        onFilterChange={(key, val) => {
          if (key === 'visibility') setVisFilter(val);
        }}
        onReset={() => { setSearch(''); setVisFilter('all'); }}
        actions={
          <div className="flex items-center gap-2">
            {selected.length > 0 && (
              <>
                <Button size="sm" variant="outline" onClick={() => bulkMut.mutate({ action: 'public' })} className="h-8 text-xs">
                  <Globe className="mr-1 h-3.5 w-3.5" /> Hiển thị ({selected.length})
                </Button>
                <Button size="sm" variant="outline" onClick={() => bulkMut.mutate({ action: 'staff_only' })} className="h-8 text-xs text-slate-600">
                  <Archive className="mr-1 h-3.5 w-3.5" /> Lưu trữ ({selected.length})
                </Button>
              </>
            )}
            <Button size="sm" onClick={() => setShowCreate(true)} className="h-8 text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Tạo Course
            </Button>
          </div>
        }
      />

      <TooltipProvider delayDuration={300}>
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/10">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="w-10 pl-4">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                </TableHead>
                <TableHead className="font-medium text-xs text-muted-foreground uppercase tracking-wider">Khóa học</TableHead>
                <TableHead className="font-medium text-xs text-muted-foreground uppercase tracking-wider">Tổ chức</TableHead>
                <TableHead className="font-medium text-xs text-muted-foreground uppercase tracking-wider">Trạng thái</TableHead>
                <TableHead className="font-medium text-xs text-muted-foreground uppercase tracking-wider">Bắt đầu</TableHead>
                <TableHead className="font-medium text-xs text-muted-foreground uppercase tracking-wider">Kết thúc</TableHead>
                <TableHead className="font-medium text-xs text-muted-foreground uppercase tracking-wider">Cập nhật</TableHead>
                <TableHead className="font-medium text-xs text-muted-foreground uppercase tracking-wider text-right pr-5">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className={isFetching && courses.length > 0 ? 'opacity-50 pointer-events-none' : ''}>
              {isLoading ? (
                Array.from({ length: limit }).map((_, i) => (
                  <TableRow key={i} className="border-border">
                    <TableCell className="pl-4"><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><div className="space-y-1"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-52" /></div></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : courses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <div className="flex flex-col items-center text-muted-foreground">
                      <GraduationCap className="w-8 h-8 mb-2 opacity-20" />
                      <p className="text-sm">Chưa có khóa học</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                courses.map((course) => (
                  <TableRow key={course.id} className="group hover:bg-muted/30 transition-colors border-border">
                    <TableCell className="pl-4">
                      <Checkbox checked={selected.includes(course.id)} onCheckedChange={() => toggleOne(course.id)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <BookOpen className="h-4 w-4 text-primary/60 flex-shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-sm truncate max-w-[280px]">{course.display_name}</span>
                          <span className="text-[11px] text-muted-foreground font-mono truncate max-w-[280px]">{course.id}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono font-medium bg-secondary px-2 py-0.5 rounded border border-border">{course.org}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={course.visible_to_staff_only
                          ? 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/50'
                          : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                        }
                      >
                        {course.visible_to_staff_only ? 'Đã lưu trữ' : 'Đang hoạt động'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{course.start}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{course.end}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{course.modified}</TableCell>
                    <TableCell className="text-right pr-5 flex justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon"
                            onClick={() => setPreviewCourse(course)}
                            className="h-8 w-8 text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/30"
                          >
                            <LayoutTemplate className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Xem preview Card</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon"
                            onClick={() => triggerUpload(course.id)}
                            disabled={uploadingCourseId === course.id}
                            className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                          >
                            {uploadingCourseId === course.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Đổi ảnh đại diện</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon"
                            onClick={() => setSelectedCourseFiles(course.id)}
                            className="h-8 w-8 text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-950/30"
                          >
                            <FolderOpen className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Quản lý File (Files & Uploads)</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon"
                            onClick={() => toggleVis.mutate({ id: course.id, visible: !course.visible_to_staff_only })}
                            className={`h-8 w-8 ${course.visible_to_staff_only ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-500 dark:hover:bg-amber-950/30' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/50'}`}
                          >
                            {course.visible_to_staff_only ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{course.visible_to_staff_only ? 'Khôi phục hiển thị' : 'Lưu trữ khóa học'}</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon"
                            onClick={() => setNotifyCourseId(course.id)}
                            className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                          >
                            <Bell className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Gửi thông báo</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon"
                            onClick={() => setModalConfigCourseId(course.id)}
                            className="h-8 w-8 text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-950/30"
                          >
                            <Settings2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Cấu hình Modal</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link to={`/courses/${course.id}/edit`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10">
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>Chỉnh sửa nội dung</TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

          <Pagination page={page} limit={limit} total={total} totalPages={totalPages} onPageChange={setPage} onLimitChange={setLimit} label="khóa học" />
        </div>
      </TooltipProvider>

      <CourseFilesModal 
        isOpen={!!selectedCourseFiles} 
        onClose={() => setSelectedCourseFiles(null)} 
        courseId={selectedCourseFiles || ''} 
      />

      {/* Dialog cấu hình Modal */}
      {modalConfigCourseId && (
        <CourseModalConfigDialog
          courseId={modalConfigCourseId}
          open={!!modalConfigCourseId}
          onClose={() => setModalConfigCourseId(null)}
        />
      )}

      {/* Dialog gửi thông báo */}
      {notifyCourseId && (
        <SendNotificationDialog
          courseId={notifyCourseId}
          open={!!notifyCourseId}
          onClose={() => setNotifyCourseId(null)}
        />
      )}
    </div>
  );
}

// ── Course Modal Config Dialog (tách ra làm component riêng bên dưới) ──

function CourseModalConfigDialog({ courseId, open, onClose }: { courseId: string; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<CourseModalConfig>>({
    welcome_enabled: true,
    welcome_title: '',
    welcome_description: '',
    confirm_enabled: true,
    confirm_title: '',
    confirm_description: '',
    confirm_checkbox_text: '',
    completion_enabled: true,
    completion_title: '',
    completion_description: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['course-modal-config', courseId],
    queryFn: () => getCourseModalConfig(courseId),
    enabled: open && !!courseId,
  });

  useEffect(() => {
    if (data) {
      setForm({
        welcome_enabled: data.welcome_enabled,
        welcome_title: data.welcome_title,
        welcome_description: data.welcome_description,
        confirm_enabled: data.confirm_enabled,
        confirm_title: data.confirm_title,
        confirm_description: data.confirm_description,
        confirm_checkbox_text: data.confirm_checkbox_text,
        completion_enabled: data.completion_enabled,
        completion_title: data.completion_title,
        completion_description: data.completion_description,
      });
    }
  }, [data]);

  const saveMut = useMutation({
    mutationFn: () => updateCourseModalConfig(courseId, form),
    onSuccess: () => {
      toast.success('Đã lưu cấu hình modal');
      queryClient.invalidateQueries({ queryKey: ['course-modal-config', courseId] });
      onClose();
    },
    onError: () => toast.error('Lưu thất bại'),
  });

  const updateField = (key: string, value: unknown) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Cấu hình Modal — Khóa học</DialogTitle>
          <p className="text-xs text-muted-foreground font-mono break-all">{courseId}</p>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {/* ── Welcome Modal ── */}
            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Welcome Modal (Chào mừng)</Label>
                <Switch
                  checked={form.welcome_enabled}
                  onCheckedChange={(v) => updateField('welcome_enabled', v)}
                />
              </div>
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Tiêu đề {form.welcome_enabled && <span className="text-red-500">*</span>}</label>
                  <input className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" placeholder="Chào mừng bạn đến với khóa học!" value={form.welcome_title || ''} onChange={e => updateField('welcome_title', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Mô tả {form.welcome_enabled && <span className="text-red-500">*</span>}</label>
                  <textarea className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" placeholder="Chúc bạn có một trải nghiệm học tập thật tốt..." value={form.welcome_description || ''} onChange={e => updateField('welcome_description', e.target.value)} />
                </div>
              </div>
            </div>

            {/* ── Confirm Modal ── */}
            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Confirm Modal (0% tiến độ)</Label>
                <Switch
                  checked={form.confirm_enabled}
                  onCheckedChange={(v) => updateField('confirm_enabled', v)}
                />
              </div>
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Tiêu đề {form.confirm_enabled && <span className="text-red-500">*</span>}</label>
                  <input className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" placeholder="Hoàn thành khóa học!" value={form.confirm_title || ''} onChange={e => updateField('confirm_title', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Mô tả {form.confirm_enabled && <span className="text-red-500">*</span>}</label>
                  <textarea className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" placeholder="Cảm ơn bạn đã nỗ lực hoàn thành chương trình đào tạo..." value={form.confirm_description || ''} onChange={e => updateField('confirm_description', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Nội dung checkbox {form.confirm_enabled && <span className="text-red-500">*</span>}</label>
                  <input className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" placeholder="Tôi xác nhận đã hoàn thành khóa học..." value={form.confirm_checkbox_text || ''} onChange={e => updateField('confirm_checkbox_text', e.target.value)} />
                </div>
              </div>
            </div>

            {/* ── Completion Modal ── */}
            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Completion Modal (100% tiến độ)</Label>
                <Switch
                  checked={form.completion_enabled}
                  onCheckedChange={(v) => updateField('completion_enabled', v)}
                />
              </div>
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Tiêu đề {form.completion_enabled && <span className="text-red-500">*</span>}</label>
                  <input className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" placeholder="Congratulations!" value={form.completion_title || ''} onChange={e => updateField('completion_title', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Mô tả {form.completion_enabled && <span className="text-red-500">*</span>}</label>
                  <textarea className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" placeholder="Trở thành đối tác chiến lược..." value={form.completion_description || ''} onChange={e => updateField('completion_description', e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button 
            onClick={() => saveMut.mutate()} 
            disabled={
              saveMut.isPending || 
              (form.welcome_enabled && (!form.welcome_title?.trim() || !form.welcome_description?.trim())) || 
              (form.confirm_enabled && (!form.confirm_title?.trim() || !form.confirm_description?.trim() || !form.confirm_checkbox_text?.trim())) || 
              (form.completion_enabled && (!form.completion_title?.trim() || !form.completion_description?.trim()))
            }
          >
            {saveMut.isPending ? 'Đang lưu...' : 'Lưu cấu hình'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Send Notification Dialog ──

function SendNotificationDialog({ courseId, open, onClose }: { courseId: string; open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const sendMut = useMutation({
    mutationFn: () => sendCourseNotification(courseId, { title, message }),
    onSuccess: (data) => {
      toast.success(`Đã gửi thông báo cho ${data.recipients} learner`);
      setTitle('');
      setMessage('');
      onClose();
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.error;
      if (errMsg === 'No enrolled learners found') {
        toast.error('Không tìm thấy học viên nào! Có thể do khóa học chưa có ai đăng ký hoặc các group được gán khóa học đang trống.');
      } else {
        toast.error(errMsg || 'Gửi thông báo thất bại');
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-500" />
            Gửi thông báo
          </DialogTitle>
          <p className="text-xs text-muted-foreground font-mono break-all">{courseId}</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-sm font-medium">Tiêu đề</label>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              placeholder="Tiêu đề thông báo..."
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Nội dung <span className="text-red-500">*</span></label>
            <textarea
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              placeholder="Nội dung thông báo sẽ gửi cho tất cả learner enrolled..."
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-2 rounded-md">
            ⚠️ Thông báo sẽ được gửi cho <strong>tất cả learner</strong> đang enrolled trong khóa học này.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button
            onClick={() => sendMut.mutate()}
            disabled={sendMut.isPending || !message.trim()}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {sendMut.isPending ? 'Đang gửi...' : 'Gửi thông báo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
