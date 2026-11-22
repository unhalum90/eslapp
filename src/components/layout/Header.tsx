import Link from "next/link";
import { BookOpenCheck, PanelLeftClose, PanelLeftOpen } from "lucide-react";

interface HeaderProps {
    sidebarCollapsed: boolean;
    onSidebarCollapsedChange: (collapsed: boolean) => void;
    showNavigationToggle?: boolean;
}

export function Header({
    sidebarCollapsed,
    onSidebarCollapsedChange,
    showNavigationToggle = true,
}: HeaderProps) {
    return (
        <header className="h-16 border-b bg-white px-3 sm:px-6 flex items-center justify-between z-10 sticky top-0">
            <div className="flex items-center gap-2">
                <div className="rounded-lg bg-[#285d68] p-2 text-white">
                    <BookOpenCheck size={23} />
                </div>
                <Link href="/workspace" className="hidden md:block">
                    <span className="block text-lg font-black tracking-tight text-[#18282b]">Atelier de séquences</span>
                    <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#758184]">Anglais · collège</span>
                </Link>
                {showNavigationToggle ? <button
                    type="button"
                    onClick={() => onSidebarCollapsedChange(!sidebarCollapsed)}
                    aria-controls="app-sidebar"
                    aria-expanded={!sidebarCollapsed}
                    aria-label={sidebarCollapsed ? "Show app navigation" : "Hide app navigation"}
                    title={sidebarCollapsed ? "Show app navigation" : "Hide app navigation"}
                    data-onboarding="app-sidebar-toggle"
                    className="ml-2 hidden items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-500 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 md:inline-flex"
                >
                    {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                </button> : null}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 sm:gap-4">
                <span className="hidden rounded-full bg-[#e8f3f1] px-3 py-1.5 text-xs font-black text-[#285d68] sm:inline">
                    Mode enseignant
                </span>
                <Link href="/account" className="rounded-full bg-slate-100 px-3 py-2 font-semibold hover:bg-[#e8f3f1] hover:text-[#285d68]">
                    Compte
                </Link>
            </div>
        </header>
    );
}
