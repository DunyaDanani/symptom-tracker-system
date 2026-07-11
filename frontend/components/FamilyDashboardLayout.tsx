"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import NotificationBell from "./NotificationBell";
import UserMenu from "./UserMenu";
import { API_BASE } from "@/lib/config";

// Shared dashboard shell for the Parent and Child roles. Their dashboards
// are almost entirely the same UI (same shell, same Notice/Messages/
// Reports/Study Module/Account pages) — the only real differences are a
// couple of nav items and the parent-only "view my child's dashboard"
// switcher, so this single component covers both instead of maintaining
// two near-identical layout files.
type FamilyRole = "parent" | "child";

interface FamilyDashboardLayoutProps {
  role: FamilyRole;
  children: ReactNode;
}

export default function FamilyDashboardLayout({
  role,
  children,
}: FamilyDashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const basePath = `/dashboard/${role}`;

  const [userName, setUserName] = useState<string>("User");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [viewedFromParent, setViewedFromParent] = useState(false);

  useEffect(() => {
    // localStorage is only available client-side, so this can't be read
    // during the initial render — hence the effect instead of lazy state.
    const storedName = localStorage.getItem("name");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a browser-only value, not derived state
    if (storedName) setUserName(storedName);
    if (role === "child") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a browser-only value, not derived state
      if (localStorage.getItem("parentToken")) setViewedFromParent(true);
    }
  }, [role]);

  // Client meeting 20 Feb 2026: the child dashboard should stay focused
  // on Study Module + suggested activities after emotion tracking — no
  // Messages/"serious" content. Messages stay on the parent side only.
  const navItems = [
    { label: "Dashboard", href: basePath, icon: DashboardIcon },
    { label: "Notice", href: `${basePath}/notice`, icon: NoticeIcon },
    ...(role === "parent"
      ? [
          { label: "Messages", href: `${basePath}/messages`, icon: MessagesIcon },
          {
            label: "Doctor's Recommendation",
            href: `${basePath}/doctor-documents`,
            icon: DoctorIcon,
          },
        ]
      : []),
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    localStorage.removeItem("parentToken");
    localStorage.removeItem("parentName");
    router.push("/login");
  };

  // Parent-only: open the linked child's dashboard directly from this
  // session, no separate child login required. The parent's own token is
  // stashed so the child view can offer a way back.
  const handleViewChild = async () => {
    setSwitching(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_BASE}/auth/view-as-child`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (!data.success) {
        alert(data.message || "Could not open your child's dashboard.");
        setSwitching(false);
        return;
      }

      localStorage.setItem("parentToken", localStorage.getItem("token") || "");
      localStorage.setItem("parentName", localStorage.getItem("name") || "");
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("name", data.name || "");

      router.push("/dashboard/child");
    } catch (err) {
      console.error("Failed to switch to child view", err);
      alert("Unable to reach the server.");
      setSwitching(false);
    }
  };

  // Child-only: if this session was opened via a parent's "View Child's
  // Dashboard" button, restores the parent's own session instead of
  // logging out entirely.
  const handleReturnToParent = () => {
    const parentToken = localStorage.getItem("parentToken");
    const parentName = localStorage.getItem("parentName");
    if (!parentToken) return;

    localStorage.setItem("token", parentToken);
    localStorage.setItem("role", "parent");
    localStorage.setItem("name", parentName || "");
    localStorage.removeItem("parentToken");
    localStorage.removeItem("parentName");
    router.push("/dashboard/parent");
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
          {/* Logo */}
          <div className="h-20 flex items-center gap-2 px-6 border-b border-gray-100">
            <Image
              src="/12.jpg"
              alt="OKI International School"
              width={36}
              height={36}
              className="object-contain"
            />
            <div className="leading-tight">
              <p className="text-blue-700 font-bold text-lg tracking-tight">
                OKI
              </p>
              <p className="text-[10px] text-gray-400 -mt-1">School Network</p>
            </div>
          </div>

          {/* Profile */}
          <div className="flex flex-col items-center py-6 border-b border-gray-100">
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              <svg
                className="w-9 h-9 text-gray-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10 9a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 1114 0H3z" />
              </svg>
            </div>
            <p className="mt-3 text-sm font-medium text-gray-700">
              Welcome {userName}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs text-gray-400">Online</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 py-4">
            {navItems.map((item) => {
              const isActive =
                item.href === basePath
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                    isActive
                      ? "bg-blue-900 text-white"
                      : "text-gray-600 hover:bg-slate-50"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top navbar */}
        <header className="h-20 bg-blue-900 flex items-center justify-between gap-6 px-8 shrink-0">
          {/* Hamburger */}
          <button
            type="button"
            onClick={() => setSidebarOpen((prev) => !prev)}
            aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            className="text-white hover:opacity-80 transition-opacity"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <div className="flex items-center gap-6">
            {role === "parent" && (
              <button
                type="button"
                onClick={handleViewChild}
                disabled={switching}
                className="text-xs bg-white/10 hover:bg-white/20 text-white border border-white/30 rounded-full px-3 py-1.5 transition-colors disabled:opacity-60"
              >
                {switching ? "Opening..." : "View Child's Dashboard"}
              </button>
            )}

            {role === "child" && viewedFromParent && (
              <button
                type="button"
                onClick={handleReturnToParent}
                className="text-xs bg-white/10 hover:bg-white/20 text-white border border-white/30 rounded-full px-3 py-1.5 transition-colors"
              >
                &larr; Return to Parent Dashboard
              </button>
            )}

            {role === "parent" && (
              <>
                <Link
                  href={`${basePath}/messages`}
                  className="text-white text-sm hover:opacity-80 transition-opacity"
                >
                  Communication
                </Link>

                <NotificationBell messagesHref={`${basePath}/messages`} />
              </>
            )}

            <UserMenu
              name={userName}
              accountHref={`${basePath}/account`}
              dashboardHref={basePath}
              onLogout={handleLogout}
            />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
    </svg>
  );
}

function NoticeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM8.5 17a1.5 1.5 0 003 0h-3z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function MessagesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
    </svg>
  );
}

function DoctorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 2a1 1 0 011 1v1h4a1 1 0 011 1v3.5c0 4-2.5 6.5-6 7.5-3.5-1-6-3.5-6-7.5V5a1 1 0 011-1h4V3a1 1 0 011-1zm-1 5a1 1 0 112 0v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1H8a1 1 0 110-2h1V7z"
        clipRule="evenodd"
      />
    </svg>
  );
}
