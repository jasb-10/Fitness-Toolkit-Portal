import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Search } from "lucide-react";
import { useAdminListUsers } from "@workspace/api-client-react";
import { AppShell, PageHeader } from "@/components/AppShell";
import { StaffOnly } from "@/components/RoleGate";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, initials } from "@/lib/utils";

export default function AdminUsersPage() {
  return (
    <StaffOnly>
      <Inner />
    </StaffOnly>
  );
}

function Inner() {
  const { data, isLoading } = useAdminListUsers();
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return data ?? [];
    return (data ?? []).filter(
      (u) =>
        u.name.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s),
    );
  }, [data, q]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Admin"
        title="Users"
        description="Search and manage every member of the portal."
      />
      <div className="px-10 py-10">
        <div className="mb-5 flex items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              data-testid="users-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name or email"
              className="w-full rounded-md border border-border bg-background py-2.5 pl-9 pr-3 text-sm focus:border-foreground focus:outline-none focus:ring-0"
            />
          </div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "user" : "users"}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card">
          {isLoading ? (
            <div className="space-y-2 p-6">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Date created</TableHead>
                  <TableHead>Completion</TableHead>
                  <TableHead className="text-right">Lessons</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow
                    key={u.id}
                    data-testid={`user-row-${u.id}`}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={u.avatarUrl ?? undefined} />
                            <AvatarFallback className="bg-foreground text-background text-xs">
                              {initials(u.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium">{u.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {u.email}
                            </div>
                          </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {u.role.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(u.createdAt)}
                    </TableCell>
                    <TableCell className="w-48">
                      <div className="flex items-center gap-3">
                        <Progress
                          value={u.completionPct}
                          className="h-1 flex-1"
                        />
                        <span className="w-9 text-right text-xs text-muted-foreground">
                          {Math.round(u.completionPct)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {u.lessonsCompleted}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="px-6 py-10 text-center text-sm text-muted-foreground"
                    >
                      No users match your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </AppShell>
  );
}
