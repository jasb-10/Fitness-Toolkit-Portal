import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import {
  useListSupportConversations,
  useCreateSupportConversation,
  useListSupportMessages,
  useSendSupportMessage,
  getListSupportConversationsQueryKey,
  getListSupportMessagesQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, X, Send, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const HIDDEN_PREFIXES = ["/sign-in", "/sign-up", "/"];

export function SupportWidget() {
  const { isSignedIn, isLoaded } = useUser();
  const [loc] = useLocation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  const enabled = isLoaded && isSignedIn && !HIDDEN_PREFIXES.includes(loc);

  const { data: convs } = useListSupportConversations({
    query: {
      enabled: !!enabled,
      queryKey: getListSupportConversationsQueryKey(),
    },
  });
  const createConv = useCreateSupportConversation();
  const sendMsg = useSendSupportMessage();

  useEffect(() => {
    if (!activeId && convs && convs.length > 0) setActiveId(convs[0]!.id);
  }, [convs, activeId]);

  useEffect(() => {
    const openWidget = () => setOpen(true);
    window.addEventListener("open-support-widget", openWidget);
    return () => window.removeEventListener("open-support-widget", openWidget);
  }, []);

  const { data: messages, isLoading: msgsLoading } = useListSupportMessages(
    activeId ?? "",
    {
      query: {
        enabled: !!activeId && open,
        queryKey: getListSupportMessagesQueryKey(activeId ?? ""),
      },
    },
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, sendMsg.isPending, open]);

  const ensureConversation = async () => {
    if (activeId) return activeId;
    const c = await createConv.mutateAsync();
    await qc.invalidateQueries({
      queryKey: getListSupportConversationsQueryKey(),
    });
    setActiveId(c.id);
    return c.id;
  };

  const handleSend = async () => {
    if (!draft.trim()) return;
    const text = draft.trim();
    setDraft("");
    try {
      const id = await ensureConversation();
      await sendMsg.mutateAsync({
        conversationId: id,
        data: { content: text },
      });
      await qc.invalidateQueries({
        queryKey: getListSupportMessagesQueryKey(id),
      });
      await qc.invalidateQueries({
        queryKey: getListSupportConversationsQueryKey(),
      });
    } catch (e) {
      toast({
        title: "Could not send",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    }
  };

  const startNew = async () => {
    const c = await createConv.mutateAsync();
    await qc.invalidateQueries({
      queryKey: getListSupportConversationsQueryKey(),
    });
    setActiveId(c.id);
  };

  if (!enabled) return null;

  return (
    <>
      {open && (
        <div
          className="fixed bottom-24 right-4 z-50 flex h-[560px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl sm:right-6"
          data-testid="support-widget"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <div className="font-display text-base">Support</div>
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                AI assistant
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={startNew}
                title="Start new conversation"
                disabled={createConv.isPending}
                data-testid="widget-new-conv"
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setOpen(false)}
                data-testid="widget-close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
            {!activeId ? (
              <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                Ask a question to get started. The assistant can also process
                refund requests within policy.
              </div>
            ) : msgsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-2/3" />
                <Skeleton className="h-10 w-1/2" />
              </div>
            ) : messages && messages.length > 0 ? (
              <div className="space-y-3">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                      m.role === "user"
                        ? "ml-auto bg-foreground text-background"
                        : "border border-border bg-card",
                    )}
                  >
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  </div>
                ))}
                {sendMsg.isPending && (
                  <div className="max-w-[60%] animate-pulse rounded-2xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                    Thinking…
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                Send your first message to start the conversation.
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className="flex items-end gap-2 border-t border-border p-3"
          >
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask a question or request a refund…"
              rows={1}
              className="max-h-32 min-h-[40px] resize-none"
              data-testid="widget-input"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!draft.trim() || sendMsg.isPending}
              data-testid="widget-send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
           "fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_28px_hsl(var(--primary)/.3)] transition-transform hover:scale-105 sm:bottom-6 sm:right-6",
          open && "rotate-90",
        )}
        aria-label={open ? "Close support" : "Open support"}
        data-testid="support-widget-toggle"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </>
  );
}
