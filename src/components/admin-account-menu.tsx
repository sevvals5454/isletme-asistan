"use client";

import { useState } from "react";
import { UserCircle, ChevronDown } from "lucide-react";
import { ChangePassword } from "@/components/change-password";
import { LogoutButton } from "@/components/logout-button";

export function AdminAccountMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-3 py-1.5 text-sm hover:bg-muted"
      >
        <UserCircle className="h-4 w-4" />
        <span className="hidden max-w-[160px] truncate sm:inline">{email}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border bg-card p-4 shadow-lg">
            <div className="text-xs text-muted-foreground">Admin hesabı</div>
            <div className="truncate text-sm font-medium">{email}</div>
            <ChangePassword />
            <div className="mt-4 border-t pt-4">
              <LogoutButton />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
