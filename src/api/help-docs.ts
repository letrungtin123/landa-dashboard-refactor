// ============================================================
// Help Docs API — Folders, Pages, Image Upload
// Endpoints trên LMS: /api/landa/admin/help-*
// Auth: Bearer token (OAuth2) — tự động qua apiClient
// ============================================================

import { apiClient } from './client';

// ── Types ──

export interface HelpFolder {
  id: number;
  title: string;
  slug: string;
  icon: string;
  sort_order: number;
  page_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface HelpPageSummary {
  id: number;
  folder_id: number;
  folder_title: string;
  title: string;
  slug: string;
  sort_order: number;
  is_published: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface HelpPageDetail extends HelpPageSummary {
  content: string;
  created_by: string | null;
  updated_by: string | null;
}

const BASE = '/api/landa/admin';

// ══════════════════════════════════════════════
// Folders API
// ══════════════════════════════════════════════

export async function getHelpFolders(): Promise<{ folders: HelpFolder[]; total: number }> {
  const { data } = await apiClient.get(`${BASE}/help-folders/`);
  return data;
}

export async function createHelpFolder(payload: {
  title: string;
  icon?: string;
}): Promise<{ success: boolean; id: number; slug: string }> {
  const { data } = await apiClient.post(`${BASE}/help-folders/`, payload);
  return data;
}

export async function updateHelpFolder(
  folderId: number,
  payload: { title?: string; icon?: string },
): Promise<{ success: boolean }> {
  const { data } = await apiClient.patch(`${BASE}/help-folders/${folderId}/`, payload);
  return data;
}

export async function deleteHelpFolder(folderId: number): Promise<{ success: boolean }> {
  const { data } = await apiClient.delete(`${BASE}/help-folders/${folderId}/`);
  return data;
}

export async function reorderHelpFolders(orderedIds: number[]): Promise<{ success: boolean }> {
  const { data } = await apiClient.patch(`${BASE}/help-folders/reorder/`, { ordered_ids: orderedIds });
  return data;
}

// ══════════════════════════════════════════════
// Pages API
// ══════════════════════════════════════════════

export async function getHelpPages(folderId?: number): Promise<{ pages: HelpPageSummary[]; total: number }> {
  const params: Record<string, unknown> = {};
  if (folderId) params.folder_id = folderId;
  const { data } = await apiClient.get(`${BASE}/help-pages/`, { params });
  return data;
}

export async function getHelpPage(pageId: number): Promise<HelpPageDetail> {
  const { data } = await apiClient.get(`${BASE}/help-pages/${pageId}/`);
  return data;
}

export async function createHelpPage(payload: {
  folder_id: number;
  title: string;
  content?: string;
}): Promise<{ success: boolean; id: number; slug: string }> {
  const { data } = await apiClient.post(`${BASE}/help-pages/`, payload);
  return data;
}

export async function updateHelpPage(
  pageId: number,
  payload: { title?: string; content?: string; is_published?: boolean },
): Promise<{ success: boolean }> {
  const { data } = await apiClient.patch(`${BASE}/help-pages/${pageId}/`, payload);
  return data;
}

export async function deleteHelpPage(pageId: number): Promise<{ success: boolean }> {
  const { data } = await apiClient.delete(`${BASE}/help-pages/${pageId}/`);
  return data;
}

export async function reorderHelpPages(
  folderId: number,
  orderedIds: number[],
): Promise<{ success: boolean }> {
  const { data } = await apiClient.patch(`${BASE}/help-pages/reorder/`, {
    folder_id: folderId,
    ordered_ids: orderedIds,
  });
  return data;
}

// ══════════════════════════════════════════════
// Image Upload
// ══════════════════════════════════════════════

export async function uploadHelpImage(
  file: File,
): Promise<{ success: boolean; url: string; filename: string }> {
  const formData = new FormData();
  formData.append('image', file);
  const { data } = await apiClient.post(`${BASE}/help-pages/upload-image/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
