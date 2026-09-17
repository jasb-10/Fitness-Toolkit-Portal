import { useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { basePath } from "@/lib/utils";

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export function thumbnailUrl(objectPath: string | null | undefined): string | null {
  if (!objectPath) return null;
  if (/^https?:\/\//i.test(objectPath)) return objectPath;
  return `${basePath}/api/storage${objectPath}`;
}

export function ThumbnailUploader({
  value,
  onChange,
  label = "Thumbnail",
}: {
  value: string | null;
  onChange: (objectPath: string | null) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const previewUrl = thumbnailUrl(value);

  async function handleFile(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      toast({
        title: "Unsupported image type",
        description: "Use PNG, JPG, WebP, or GIF.",
        variant: "destructive",
      });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({
        title: "Image too large",
        description: "Max size is 8 MB.",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    try {
      const reqRes = await fetch(`${basePath}/api/storage/uploads/request-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type,
        }),
      });
      if (!reqRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = (await reqRes.json()) as {
        uploadURL: string;
        objectPath: string;
      };

      const putRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload failed");

      onChange(objectPath);
      toast({ title: "Image uploaded" });
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
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex items-start gap-4">
        <div className="relative h-24 w-40 flex-none overflow-hidden rounded-lg border border-border bg-muted">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Thumbnail preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              No image
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(",")}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
            data-testid="thumbnail-file-input"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            data-testid="thumbnail-upload-button"
          >
            {busy ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="mr-1.5 h-3.5 w-3.5" />
            )}
            {value ? "Replace" : "Upload"}
          </Button>
          {value && !busy && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(null)}
              data-testid="thumbnail-remove-button"
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Remove
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            PNG, JPG, WebP, or GIF · up to 8 MB · 16:10 looks best
          </p>
        </div>
      </div>
    </div>
  );
}
