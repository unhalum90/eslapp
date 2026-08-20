"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/practice/")) {
    return <main className="min-h-screen flex-1 bg-slate-50 p-5 sm:p-8">{children}</main>;
  }

  return (
    <>
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-slate-50 p-6">{children}</main>
      </div>
    </>
  );
}
