"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (pathname.startsWith("/play/matching/") || pathname.startsWith("/embed/matching/") || pathname.startsWith("/play/grouping/") || pathname.startsWith("/embed/grouping/") || pathname.startsWith("/play/ordering/") || pathname.startsWith("/embed/ordering/")) {
    return <main className="min-h-screen w-full overflow-auto bg-slate-50">{children}</main>;
  }

  if (pathname.startsWith("/play/")) {
    return <main className="h-screen w-screen overflow-hidden bg-[#f4f2eb]">{children}</main>;
  }

  if (pathname.startsWith("/practice/")) {
    return <main className="min-h-screen flex-1 bg-slate-50 p-5 sm:p-8">{children}</main>;
  }

  if (pathname.startsWith("/workspace/print/")) return <>{children}</>;

  const immersiveWorkspace = pathname === "/workspace" || /^\/studio\/[^/]+/.test(pathname);

  return (
    <>
      <Header
        sidebarCollapsed={sidebarCollapsed}
        onSidebarCollapsedChange={setSidebarCollapsed}
        showNavigationToggle={!immersiveWorkspace}
      />
      <div className="flex flex-1 overflow-hidden">
        {!immersiveWorkspace ? <Sidebar collapsed={sidebarCollapsed} /> : null}
        <main
          className={`min-w-0 flex-1 overflow-auto ${
            immersiveWorkspace ? "bg-[#f4f2eb] p-0" : "bg-slate-50 p-6"
          }`}
        >
          {children}
        </main>
      </div>
    </>
  );
}
