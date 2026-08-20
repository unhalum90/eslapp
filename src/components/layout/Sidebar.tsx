import Link from "next/link";
import { FileText, Layout, Upload, Gamepad2, Scissors, BookOpenCheck, UserCircle } from "lucide-react";
import { DocumentList } from "@/components/layout/DocumentList";

const NAV_ITEMS = [
    { icon: Layout, label: "Dashboard", href: "/" },
    { icon: BookOpenCheck, label: "Teacher Workspace", href: "/workspace" },
    { icon: Gamepad2, label: "Activity Builder", href: "/activities" },
    { icon: FileText, label: "Resource Canvas", href: "/editor" },
    { icon: Upload, label: "Ingest PDF", href: "/ingest" },
    { icon: Scissors, label: "Audio Trimmer", href: "/tools/audio" },
    { icon: UserCircle, label: "Teacher Account", href: "/account" },
];

export function Sidebar() {
    return (
        <aside className="w-64 border-r bg-slate-50 min-h-[calc(100vh-4rem)] p-4 hidden md:block">
            <nav className="space-y-1">
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

            <DocumentList />
        </aside>
    );
}
