import { useEffect, useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExt from "@tiptap/extension-link";
import ImageExt from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Loader2,
  Code,
  Undo2,
  Redo2,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { basePath, cn } from "@/lib/utils";

const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_BYTES = 8 * 1024 * 1024;

async function uploadImage(file: File): Promise<string> {
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
  return `${basePath}/api/storage${objectPath}`;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write the lesson content…",
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      LinkExt.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noreferrer noopener", target: "_blank" },
      }),
      ImageExt.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-neutral max-w-none px-4 py-3 min-h-[220px] focus:outline-none",
        "data-testid": "rich-text-editor",
      },
    },
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      onChange(html === "<p></p>" ? "" : html);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const incoming = value || "";
    if (incoming !== current && incoming !== "" && current === "<p></p>") {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="rounded-md border border-border bg-background">
        <div className="h-12 border-b border-border" />
        <div className="h-[220px]" />
      </div>
    );
  }

  async function handleImageFile(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      toast({
        title: "Unsupported image",
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
    uploadingRef.current = true;
    try {
      const url = await uploadImage(file);
      editor!.chain().focus().setImage({ src: url }).run();
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      uploadingRef.current = false;
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function setLink() {
    const previousUrl = editor!.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", previousUrl ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor!.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor!
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-background">
      <Toolbar
        editor={editor}
        onImageClick={() => fileInputRef.current?.click()}
        onLinkClick={setLink}
        uploading={uploadingRef.current}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImageFile(f);
        }}
        data-testid="rich-text-image-input"
      />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({
  editor,
  onImageClick,
  onLinkClick,
  uploading,
}: {
  editor: Editor;
  onImageClick: () => void;
  onLinkClick: () => void;
  uploading: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-1.5 py-1.5">
      <TBtn
        active={editor.isActive("heading", { level: 1 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run()
        }
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </TBtn>
      <TBtn
        active={editor.isActive("heading", { level: 2 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </TBtn>
      <TBtn
        active={editor.isActive("heading", { level: 3 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
        title="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </TBtn>
      <Divider />
      <TBtn
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      >
        <Bold className="h-4 w-4" />
      </TBtn>
      <TBtn
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </TBtn>
      <TBtn
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </TBtn>
      <TBtn
        active={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
        title="Inline code"
      >
        <Code className="h-4 w-4" />
      </TBtn>
      <Divider />
      <TBtn
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet list"
      >
        <List className="h-4 w-4" />
      </TBtn>
      <TBtn
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered list"
      >
        <ListOrdered className="h-4 w-4" />
      </TBtn>
      <TBtn
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Callout / quote"
      >
        <Quote className="h-4 w-4" />
      </TBtn>
      <TBtn
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Divider"
      >
        <Minus className="h-4 w-4" />
      </TBtn>
      <Divider />
      <TBtn
        active={editor.isActive("link")}
        onClick={onLinkClick}
        title="Insert link"
      >
        <LinkIcon className="h-4 w-4" />
      </TBtn>
      <TBtn onClick={onImageClick} title="Insert image">
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImageIcon className="h-4 w-4" />
        )}
      </TBtn>
      <Divider />
      <TBtn
        onClick={() => editor.chain().focus().undo().run()}
        title="Undo"
        disabled={!editor.can().undo()}
      >
        <Undo2 className="h-4 w-4" />
      </TBtn>
      <TBtn
        onClick={() => editor.chain().focus().redo().run()}
        title="Redo"
        disabled={!editor.can().redo()}
      >
        <Redo2 className="h-4 w-4" />
      </TBtn>
    </div>
  );
}

function TBtn({
  active,
  onClick,
  disabled,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-8 w-8 p-0",
        active ? "bg-foreground text-background hover:bg-foreground/90" : "",
      )}
    >
      {children}
    </Button>
  );
}

function Divider() {
  return <div className="mx-1 h-5 w-px bg-border" />;
}
