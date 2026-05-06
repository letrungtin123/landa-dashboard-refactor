import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const queryClient = new QueryClient();
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/components/providers/auth-provider';
import { Toaster } from '@/components/ui/sonner';
import { GlobalConfirmDialog } from '@/components/global-confirm-dialog';
import { RouteProgress } from '@/components/route-progress';
import { MotionProvider } from '@/components/motion-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthGuard } from '@/components/auth-guard';
import { config } from '@/config/env';

import AuthLayout from '@/layout/auth-layout';
import DashboardLayout from '@/layout/dashboard-layout';

import LoginPage from '@/pages/login';
import DashboardPage from '@/pages/dashboard';
import ProfilePage from '@/pages/profile';

import UsersPage from '@/pages/users';
import AuditLogsPage from '@/pages/audit-logs';
import ReportSummaryPage from '@/pages/report-summary';
import LibraryPage from '@/pages/library';
import CoursesPage from '@/pages/courses';
import CourseEditorPage from '@/pages/course-editor';

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<AuthGuard requireAuth={false} />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>
      </Route>

      {/* Protected routes */}
      <Route element={<AuthGuard requireAuth={true} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/accounts" element={<UsersPage />} />
          <Route path="/audit-logs" element={<AuditLogsPage />} />
          <Route path="/report-summary" element={<ReportSummaryPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:courseId/edit" element={<CourseEditorPage />} />

          {/* Legacy redirects */}
          <Route path="/user" element={<Navigate to="/accounts" replace />} />
          <Route path="/report" element={<Navigate to="/report-summary" replace />} />
          <Route path="/user/account" element={<Navigate to="/accounts" replace />} />
          <Route path="/user/audit-log" element={<Navigate to="/audit-logs" replace />} />
          <Route path="/report/summary" element={<Navigate to="/report-summary" replace />} />
          <Route path="/users" element={<Navigate to="/accounts" replace />} />
        </Route>
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/library" replace />} />
      <Route path="*" element={<Navigate to="/library" replace />} />
    </Routes>
  );
}

export default function App() {
  // Wrap Google OAuth provider nếu có client ID
  const content = (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider delayDuration={300}>
          <AuthProvider>
            <MotionProvider>
              <Suspense fallback={null}>
                <RouteProgress />
              </Suspense>
              <AppRoutes />
              <Toaster position="top-right" richColors />
              <GlobalConfirmDialog />
            </MotionProvider>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );

  if (config.googleClientId) {
    return (
      <GoogleOAuthProvider clientId={config.googleClientId}>
        {content}
      </GoogleOAuthProvider>
    );
  }

  return content;
}
