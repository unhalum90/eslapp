import Link from "next/link";
import { FileText, Layout, Settings, Upload, Library, Gamepad2 } from "lucide-react";
import { DocumentList } from "@/components/layout/DocumentList";

const NAV_ITEMS = [
    { icon: Layout, label: "Dashboard", href: "/" },
    { icon: Gamepad2, label: "Activity Builder", href: "/activities" },
    { icon: Library, label: "My Library", href: "/library" },
    { icon: Upload, label: "Ingest PDF", href: "/ingest" },
    { icon: FileText, label: "Templates", href: "/templates" },
    { icon: Settings, label: "Settings", href: "/settings" },
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
