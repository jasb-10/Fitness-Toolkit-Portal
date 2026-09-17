import { useRef, useState } from "react";
import {
  Plus,
  Trash2,
  Upload,
  Loader2,
  Link as LinkIcon,
  FileDown,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { basePath, cn } from "@/lib/utils";

export interface AttachmentDraft {
  label: string;
  url: string;
  type: "link" | "file";
}

const MAX_BYTES = 25 * 1024 * 1024;

async function uploadFile(file: File): Promise<string> {
  const reqRes = await fetch(`${basePath}/api/storage/uploads/request-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: file.name,
      size: file.size,
      contentType: file.type || "application/octet-stream",
    }),
  });
  if (!reqRes.ok) throw new Error("Failed to get upload URL");
  const { uploadURL, objectPath } = (await reqRes.json()) as {
    uploadURL: string;
    objectPath: string;
  };
  const putRes = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!putRes.ok) throw new Error("Upload failed");
  return `${basePath}/api/storage${objectPath}`;
}

export function LessonAttachmentsEditor({
  items,
  onChange,
}: {
  items: AttachmentDraft[];
  onChange: (items: AttachmentDraft[]) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Templates &amp; resources</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              onChange([...items, { label: "", url: "", type: "link" }])
            }
            data-testid="add-attachment-link"
          >
            <LinkIcon className="mr-1 h-3.5 w-3.5" />
            Add link
          </Button>
          <FileAddButton
            onUploaded={(label, url) =>
              onChange([...items, { label, url, type: "file" }])
            }
          />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          No templates or resources yet. Add a link or upload a file.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it, i) => (
            <AttachmentRow
              key={i}
              item={it}
              onChange={(next) => {
                const copy = [...items];
                copy[i] = next;
                onChange(copy);
              }}
              onRemove={() => onChange(items.filter((_, j) => j !== i))}
              onMoveUp={
                i > 0
                  ? () => {
                      const copy = [...items];
                      [copy[i - 1], copy[i]] = [copy[i]!, copy[i - 1]!];
                      onChange(copy);
                    }
                  : undefined
              }
              onMoveDown={
                i < items.length - 1
                  ? () => {
                      const copy = [...items];
                      [copy[i + 1], copy[i]] = [copy[i]!, copy[i + 1]!];
                      onChange(copy);
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AttachmentRow({
  item,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  item: AttachmentDraft;
  onChange: (next: AttachmentDraft) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const Icon = item.type === "file" ? FileDown : LinkIcon;
  return (
    <div className="grid grid-cols-[auto_auto_1fr_1.5fr_auto] items-center gap-2 rounded-md border border-border bg-card px-2 py-2">
      <div className="flex flex-col text-muted-foreground">
        <button
          type="button"
          className={cn(
            "h-3 leading-none",
            onMoveUp ? "hover:text-foreground" : "opacity-30",
          )}
          disabled={!onMoveUp}
          onClick={onMoveUp}
        >
          ▴
        </button>
        <button
          type="button"
          className={cn(
            "h-3 leading-none",
            onMoveDown ? "hover:text-foreground" : "opacity-30",
          )}
          disabled={!onMoveDown}
          onClick={onMoveDown}
        >
          ▾
        </button>
      </div>
      <div className="flex h-9 w-9 items-center justify-center rounded border border-border text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <Input
        placeholder="Label (e.g. Lesson Workbook)"
        value={item.label}
        onChange={(e) => onChange({ ...item, label: e.target.value })}
      />
      <Input
        placeholder={item.type === "file" ? "Uploaded file URL" : "https://…"}
        value={item.url}
        readOnly={item.type === "file"}
        onChange={(e) => onChange({ ...item, url: e.target.value })}
        className={item.type === "file" ? "bg-muted/50 text-xs" : ""}
      />
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={onRemove}
        title="Remove"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function FileAddButton({
  onUploaded,
}: {
  onUploaded: (label: string, url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  async function handle(file: File) {
    if (file.size > MAX_BYTES) {
      toast({
        title: "File too large",
        description: "Max size is 25 MB.",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    try {
      const url = await uploadFile(file);
      const label = file.name.replace(/\.[^.]+$/, "");
      onUploaded(label, url);
      toast({ title: "File uploaded" });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handle(f);
        }}
        data-testid="add-attachment-file-input"
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        data-testid="add-attachment-file"
      >
        {busy ? (
          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="mr-1 h-3.5 w-3.5" />
        )}
        Upload file
      </Button>
    </>
  );
}

// preserve unused-import safety
void GripVertical;
void Plus;
