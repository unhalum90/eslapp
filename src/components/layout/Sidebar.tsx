import Link from "next/link";
import { AudioLines, FileText, Layout, Upload, Gamepad2, Scissors, BookOpenCheck, MessagesSquare, UserCircle, MousePointerClick, Puzzle } from "lucide-react";
import { DocumentList } from "@/components/layout/DocumentList";

const NAV_ITEMS = [
    { icon: Layout, label: "Dashboard", href: "/" },
    { icon: BookOpenCheck, label: "Teacher Workspace", href: "/workspace" },
    { icon: MousePointerClick, label: "Interactive Studio", href: "/studio" },
    { icon: Puzzle, label: "Interactive Activities", href: "/tools/interactive" },
    { icon: Gamepad2, label: "Activity Builder", href: "/activities" },
    { icon: MessagesSquare, label: "Dialogue Builder", href: "/tools/dialogue" },
    { icon: AudioLines, label: "Student Speaking", href: "/tools/speaking" },
    { icon: FileText, label: "Resource Canvas", href: "/editor" },
    { icon: Upload, label: "Ingest PDF", href: "/ingest" },
    { icon: Scissors, label: "Audio Trimmer", href: "/tools/audio" },
    { icon: UserCircle, label: "Teacher Account", href: "/account" },
];

export function Sidebar({ collapsed }: { collapsed: boolean }) {
    return (
        <aside
            id="app-sidebar"
            aria-hidden={collapsed}
            className={`hidden min-h-[calc(100vh-4rem)] shrink-0 overflow-hidden bg-slate-50 transition-[width,padding,border-color] duration-200 md:block ${
                collapsed ? "invisible w-0 border-r-0 p-0" : "visible w-64 border-r p-4"
            }`}
        >
            <nav className="w-56 space-y-1">
                {NAV_ITEMS.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-white hover:text-indigo-600 hover:shadow-sm rounded-md transition-all text-sm font-medium"
                    >
                        <item.icon size={18} />
                        {item.label}
                    </Link>
                ))}
            </nav>

            <div className="w-56">
                <DocumentList />
            </div>
        </aside>
    );
}
