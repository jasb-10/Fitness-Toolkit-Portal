import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import {
  useAdminListTeam,
  useAdminInviteTeamMember,
  useGetMe,
  getAdminListTeamQueryKey,
  getAdminListUsersQueryKey,
  type Role,
} from "@workspace/api-client-react";
import { AdminShell, AdminPageHeader } from "@/components/AdminShell";
import { AdminOnly } from "@/components/RoleGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatDate, initials } from "@/lib/utils";

export default function AdminTeamPage() {
  return (
    <AdminOnly>
      <Inner />
    </AdminOnly>
  );
}

function Inner() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useGetMe();
  const isSuper = me?.user.role === "super_admin";
  const { data, isLoading } = useAdminListTeam();
  const invite = useAdminInviteTeamMember({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getAdminListTeamQueryKey() });
        qc.invalidateQueries({ queryKey: getAdminListUsersQueryKey() });
        toast({ title: "Team member added" });
      },
    },
  });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("team");

  return (
    <AdminShell>
      <AdminPageHeader
        eyebrow="Admin"
        title="Team"
        description="Members with team-level or admin-level access to this portal."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="invite-team"
                className="bg-foreground text-background hover:bg-foreground/90"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Invite member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite team member</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tn">Name</Label>
                  <Input
                    id="tn"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    data-testid="invite-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="te">Email</Label>
                  <Input
                    id="te"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="invite-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={role}
                    onValueChange={(v) => setRole(v as Role)}
                  >
                    <SelectTrigger data-testid="invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="team">Team</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      {isSuper && (
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  data-testid="invite-submit"
                  disabled={!name.trim() || !email.trim() || invite.isPending}
                  onClick={() =>
                    invite.mutate(
                      {
                        data: {
                          name: name.trim(),
                          email: email.trim(),
                          role,
                        },
                      },
                      {
                        onSuccess: () => {
                          setOpen(false);
                          setName("");
                          setEmail("");
                          setRole("team");
                        },
                      },
                    )
                  }
                  className="bg-foreground text-background hover:bg-foreground/90"
                >
                  Add member
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <div className="px-10 py-10">
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : data && data.length > 0 ? (
          <ul className="overflow-hidden rounded-2xl border border-border bg-card">
            {data.map((u) => (
              <li
                key={u.id}
                className="flex items-center gap-4 border-b border-border px-6 py-5 last:border-0"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-foreground text-background text-xs">
                    {initials(u.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{u.name}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </div>
                <Badge variant="outline" className="capitalize">
                  {u.role.replace("_", " ")}
                </Badge>
                <div className="w-32 text-right text-xs uppercase tracking-widest text-muted-foreground">
                  {formatDate(u.createdAt)}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 px-8 py-16 text-center">
            <div className="font-display text-2xl">No team members yet</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Invite your first team member to start collaborating.
            </p>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
