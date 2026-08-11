"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, FileText, LogOut, Plus } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function WorkspaceShell({ email, children }: { email: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="workspace">
      <aside className="sidebar">
        <Link className="wordmark" href="/documents">Ledgerly<span>.</span></Link>
        <nav aria-label="Primary navigation">
          <Link className={pathname.startsWith("/documents") ? "nav-link active" : "nav-link"} href="/documents"><FileText size={18} />Documents</Link>
          <Link className={pathname.startsWith("/reports") ? "nav-link active" : "nav-link"} href="/reports"><BarChart3 size={18} />Reports</Link>
        </nav>
        <Link className="sidebar-create" href="/documents?create=1"><Plus size={17} />New document</Link>
        <div className="sidebar-account">
          <div className="avatar">{email.charAt(0).toUpperCase()}</div>
          <div><strong>{email}</strong><span>Workspace owner</span></div>
          <button onClick={signOut} aria-label="Log out" title="Log out"><LogOut size={17} /></button>
        </div>
      </aside>
      <div className="workspace-main">{children}</div>
    </div>
  );
}
