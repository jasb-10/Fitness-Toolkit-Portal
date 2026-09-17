import { Redirect } from "wouter";
import { useGetMe } from "@workspace/api-client-react";
import { isStaff, isAdmin } from "@/lib/utils";

export function StaffOnly({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useGetMe();
  if (isLoading) return null;
  if (!isStaff(data?.user.role)) return <Redirect to="/dashboard" />;
  return <>{children}</>;
}

export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useGetMe();
  if (isLoading) return null;
  if (!isAdmin(data?.user.role)) return <Redirect to="/dashboard" />;
  return <>{children}</>;
}
