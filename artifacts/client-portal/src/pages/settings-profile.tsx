import { useEffect, useRef, useState } from "react";
import { useClerk } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMe,
  useUpdateMe,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { initials } from "@/lib/utils";

export default function ProfileSettingsPage() {
  const { data, isLoading } = useGetMe();
  const qc = useQueryClient();
  const { openUserProfile } = useClerk();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (data?.user) {
      setName(data.user.name);
      setBio(data.user.bio ?? "");
      setAvatarUrl(data.user.avatarUrl ?? "");
    }
  }, [data]);

  const update = useUpdateMe({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
        toast({ title: "Profile updated" });
      },
    },
  });

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarUrl(String(reader.result ?? ""));
    reader.readAsDataURL(f);
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description="Update how you appear to the team and across your portal."
      />
      <div className="px-10 py-10">
        <div className="mx-auto max-w-2xl space-y-10">
          {isLoading ? (
            <Skeleton className="h-64 w-full rounded-2xl" />
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                update.mutate({
                  data: {
                    name: name || undefined,
                    bio: bio || null,
                    avatarUrl: avatarUrl || null,
                  },
                });
              }}
              className="rounded-2xl border border-border bg-card p-8 space-y-6"
            >
              <div className="flex items-center gap-5">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback className="bg-foreground text-background text-lg">
                    {initials(name || data?.user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileRef}
                    className="hidden"
                    onChange={handlePick}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileRef.current?.click()}
                    data-testid="choose-photo"
                  >
                    Choose photo
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    Square images look best.
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar-url">Avatar URL</Label>
                <Input
                  id="avatar-url"
                  data-testid="avatar-url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  data-testid="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  data-testid="profile-bio"
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A short note about you and what you're working on."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="submit"
                  disabled={update.isPending}
                  data-testid="save-profile"
                  className="bg-foreground text-background hover:bg-foreground/90"
                >
                  Save changes
                </Button>
              </div>
            </form>
          )}

          <div className="rounded-2xl border border-border bg-card p-8">
            <h3 className="font-display text-xl">Password & account</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your password, connected sign-in methods, and active sessions.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-5"
              onClick={() => openUserProfile()}
              data-testid="open-account"
            >
              Open account settings
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
