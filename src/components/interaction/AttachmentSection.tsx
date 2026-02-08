"use client";

import { useEffect, useState, useRef } from "react";
import {
  Paperclip,
  Upload,
  Download,
  Trash2,
  FileText,
  FileSpreadsheet,
  Presentation,
  Image,
  File,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { API_ROUTES } from "@/lib/constants";
import { formatFileSize, formatDate } from "@/lib/utils";
import type { InteractionAttachment } from "@/lib/types";

interface AttachmentSectionProps {
  interactionId: number;
  isLocked: boolean;
}

function getFileIcon(fileType: string) {
  if (fileType.includes("pdf") || fileType.includes("word") || fileType.includes("msword")) {
    return <FileText className="h-5 w-5 text-red-500" />;
  }
  if (fileType.includes("spreadsheet") || fileType.includes("excel")) {
    return <FileSpreadsheet className="h-5 w-5 text-green-600" />;
  }
  if (fileType.includes("presentation") || fileType.includes("powerpoint")) {
    return <Presentation className="h-5 w-5 text-orange-500" />;
  }
  if (fileType.startsWith("image/")) {
    return <Image className="h-5 w-5 text-blue-500" />;
  }
  return <File className="h-5 w-5 text-slate-400" />;
}

export function AttachmentSection({ interactionId, isLocked }: AttachmentSectionProps) {
  const [attachments, setAttachments] = useState<InteractionAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(API_ROUTES.INTERACTION_ATTACHMENTS(interactionId))
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAttachments(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [interactionId]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(API_ROUTES.INTERACTION_ATTACHMENTS(interactionId), {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const newAttachment = await res.json();
        setAttachments((prev) => [newAttachment, ...prev]);
      } else {
        const data = await res.json();
        setError(data.error || "アップロードに失敗しました");
      }
    } catch {
      setError("アップロードに失敗しました");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(attachmentId: number) {
    if (!confirm("この添付ファイルを削除しますか？")) return;

    setDeleting(attachmentId);
    try {
      const res = await fetch(
        API_ROUTES.INTERACTION_ATTACHMENT(interactionId, attachmentId),
        { method: "DELETE" }
      );
      if (res.ok) {
        setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      }
    } catch {
      // ignore
    } finally {
      setDeleting(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-slate-400" />
            <h2 className="font-semibold text-slate-900">
              添付ファイル {attachments.length > 0 && `(${attachments.length})`}
            </h2>
          </div>
          {!isLocked && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleUpload}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.eml,.png,.jpg,.jpeg"
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {uploading ? "アップロード中..." : "ファイル追加"}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : attachments.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            添付ファイルはありません
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {getFileIcon(attachment.file_type)}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {attachment.file_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatFileSize(attachment.file_size)}
                      {attachment.uploaded_by_name && ` · ${attachment.uploaded_by_name}`}
                      {" · "}
                      {formatDate(attachment.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-3 shrink-0">
                  <a
                    href={API_ROUTES.INTERACTION_ATTACHMENT_DOWNLOAD(
                      interactionId,
                      attachment.id
                    )}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    title="ダウンロード"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  {!isLocked && (
                    <button
                      onClick={() => handleDelete(attachment.id)}
                      disabled={deleting === attachment.id}
                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      title="削除"
                    >
                      {deleting === attachment.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
