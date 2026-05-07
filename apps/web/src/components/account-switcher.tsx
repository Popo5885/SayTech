"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, Check, ChevronDown, ExternalLink, Loader2, LogIn, Users } from "lucide-react";
import { cn } from "@lottery/ui";
import { roleBadgeClass, roleLabel } from "../lib/rbac";
import type { WorkspaceSummary } from "../lib/rbac";

interface AccountSwitcherProps {
  initialWorkspaces: WorkspaceSummary[];
  initialActiveId: string | null;
  currentUserName?: string;
  currentUserEmail?: string;
}

export function AccountSwitcher({
  initialWorkspaces,
  initialActiveId,
  currentUserName,
  currentUserEmail,
}: AccountSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [workspaces] = useState<WorkspaceSummary[]>(initialWorkspaces);
  const [activeId, setActiveId] = useState<string | null>(initialActiveId);
  const ref = useRef<HTMLDivElement>(null);

  const activeWorkspace = workspaces.find((w) => w.workspaceId === activeId) ?? workspaces[0];
  const otherWorkspaces = workspaces.filter((w) => w.workspaceId !== activeWorkspace?.workspaceId);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function switchWorkspace(workspaceId: string) {
    if (workspaceId === activeWorkspace?.workspaceId) {
      setOpen(false);
      return;
    }

    setSwitching(workspaceId);
    try {
      const res = await fetch("/api/user/active-workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });

      if (!res.ok) throw new Error("Switch failed");

      setActiveId(workspaceId);
      setOpen(false);
      router.refresh();
    } catch {
      // silently ignore — user stays on current workspace
    } finally {
      setSwitching(null);
    }
  }

  if (workspaces.length === 0) return null;

  return (
    <div className="relative" dir="rtl" ref={ref}>
      {/* Trigger */}
      <button
        className={cn(
          "flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-bold transition",
          open
            ? "border-violet-300 bg-violet-50 text-violet-800"
            : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white hover:text-slate-950"
        )}
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <Building2 className="h-4 w-4 shrink-0" />
        <span className="hidden max-w-[140px] truncate sm:block">
          {activeWorkspace?.workspaceName ?? "חשבון"}
        </span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute left-0 top-[calc(100%+8px)] z-50 w-[320px] overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)]"
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Current account header */}
            <div className="bg-gradient-to-l from-emerald-600 to-teal-700 px-4 py-3.5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-200">
                חשבון נוכחי
              </p>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">
                    {activeWorkspace?.workspaceName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-emerald-200">
                    {currentUserEmail ?? activeWorkspace?.ownerEmail ?? ""}
                  </p>
                  {currentUserName && (
                    <p className="mt-0.5 text-xs font-semibold text-emerald-100">
                      {currentUserName}
                    </p>
                  )}
                </div>
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/40">
                  <Check className="h-3.5 w-3.5 text-white" />
                </span>
              </div>
              {activeWorkspace && (
                <span
                  className={cn(
                    "mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold",
                    "bg-white/20 text-white"
                  )}
                >
                  {roleLabel(activeWorkspace.role)}
                </span>
              )}
            </div>

            {/* Accessible accounts */}
            {otherWorkspaces.length > 0 && (
              <>
                <div className="border-b border-slate-100 px-4 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    חשבונות נגישים
                  </p>
                </div>
                <div className="max-h-[220px] overflow-y-auto">
                  {otherWorkspaces.map((ws) => (
                    <button
                      className="group flex w-full items-center gap-3 px-4 py-3 text-right transition hover:bg-slate-50 disabled:opacity-60"
                      disabled={switching !== null}
                      key={ws.workspaceId}
                      onClick={() => switchWorkspace(ws.workspaceId)}
                      type="button"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-violet-100 group-hover:text-violet-600">
                        {switching === ws.workspaceId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Building2 className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-800">
                          {ws.workspaceName}
                        </p>
                        {ws.ownerEmail && (
                          <p className="truncate text-xs text-slate-400">{ws.ownerEmail}</p>
                        )}
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                          roleBadgeClass(ws.role)
                        )}
                      >
                        {roleLabel(ws.role)}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Bottom actions */}
            <div className="border-t border-slate-100 p-2">
              <a
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                href="/dashboard/workspaces"
                onClick={() => setOpen(false)}
              >
                <Users className="h-4 w-4 text-slate-400" />
                החשבונות שלי
              </a>
              <a
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                href="/dashboard/workspaces/request-access"
                onClick={() => setOpen(false)}
              >
                <LogIn className="h-4 w-4 text-slate-400" />
                בקש גישה לחשבון
              </a>
              <a
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                href="/dashboard/workspaces/invite-link"
                onClick={() => setOpen(false)}
              >
                <ExternalLink className="h-4 w-4 text-slate-400" />
                קישור הרשמה לחשבון מקושר
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
