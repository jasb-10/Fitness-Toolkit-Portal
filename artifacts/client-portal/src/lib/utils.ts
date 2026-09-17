import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function formatDate(s: string | Date | null | undefined): string {
  if (!s) return "—";
  const d = typeof s === "string" ? new Date(s) : s;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDuration(min: number | null | undefined): string {
  if (!min || min <= 0) return "—";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function isStaff(
  role: string | null | undefined,
): role is "owner" | "staff" | "super_admin" | "admin" | "team" {
  return (
    role === "owner" ||
    role === "staff" ||
    role === "super_admin" ||
    role === "admin" ||
    role === "team"
  );
}

export function isAdmin(
  role: string | null | undefined,
): role is "owner" | "super_admin" | "admin" {
  return role === "owner" || role === "super_admin" || role === "admin";
}

export function getYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/,
  );
  return m ? m[1]! : null;
}

export function statusLabel(s: string): string {
  return s
    .split("_")
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(" ");
}
