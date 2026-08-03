"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import NotificationBell from "./NotificationBell";
import UserMenu from "./UserMenu";
import { API_BASE } from "@/lib/config";
import Breadcrumbs from "./Breadcrumbs";

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
  /** Friendly labels for dynamic breadcrumb segments, e.g. { [subject]: "Mathematics" } */
  breadcrumbLabels?: Record<string, string>;
}

export default function FamilyDashboardLayout({
  role,
  children,
  breadcrumbLabels,
}: FamilyDashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const basePath = `/dashboard/${role}`;

  const [userName, setUserName] = useState<string>("User");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    // localStorage is only available client-side, so this can't be read
    // during the initial render — hence the effect instead of lazy state.
    const storedName = localStorage.getItem("name");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a browser-only value, not derived state
    if (storedName) setUserName(storedName);
  }, [role]);

  // There is no child login/dashboard — this layout is now only ever used
  // with role="parent". (The "child" role variant of both the nav items
  // and the "View Child's Dashboard" switcher below were removed along
  // with the child dashboard pages; emotion check-ins are recorded by the
  // shadow teacher instead.)
  const navItems = [
    { label: "Dashboard", href: basePath, icon: DashboardIcon },
    { label: "Notice", href: `${basePath}/notice`, icon: NoticeIcon },
    { label: "Messages", href: `${basePath}/messages`, icon: MessagesIcon },
    { label: "Study Module", href: `${basePath}/study-module`, icon: StudyIcon },
    {
      label: "Emotion History",
      href: `${basePath}/emotion-history`,
      icon: EmotionIcon,
    },
    {
      label: "Symptom History",
      href: `${basePath}/symptom-history`,
      icon: SymptomIcon,
    },
    { label: "Reports", href: `${basePath}/reports`, icon: ReportsIcon },
    {
      label: "Doctor's Recommendation",
      href: `${basePath}/doctor-documents`,
      icon: DoctorIcon,
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    localStorage.removeItem("parentToken");
    localStorage.removeItem("parentName");
    router.push("/login");
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
        <main className="flex-1 p-8 overflow-y-auto">
          <Breadcrumbs labels={breadcrumbLabels} />
          {children}
        </main>
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

function EmotionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2zm-7.536 5.879a1 1 0 011.415 0 3 3 0 004.242 0 1 1 0 111.415 1.415 5 5 0 01-7.072 0 1 1 0 010-1.415z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SymptomIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9 2a1 1 0 00-1 1v1H7a2 2 0 00-2 2v10a2 2 0 002 2h6a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 00-1-1H9zm0 7a1 1 0 012 0v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1H8a1 1 0 110-2h1V9z" />
    </svg>
  );
}

function BreakTimeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function StudyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0z" />
    </svg>
  );
}

function ReportsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1H3a1 1 0 01-1-1v-6zM8 7a1 1 0 011-1h2a1 1 0 011 1v10a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v13a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
    </svg>
  );
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M12 2a1 1 0 01.967.744L14.146 7.2 17.5 8.5a1 1 0 010 1.864l-3.354 1.3-1.18 4.455a1 1 0 01-1.933 0L9.854 11.664 6.5 10.364a1 1 0 010-1.864l3.354-1.3L11.033 2.744A1 1 0 0112 2zM5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1z" />
    </svg>
  );
}
