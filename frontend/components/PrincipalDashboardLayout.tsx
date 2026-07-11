"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import NotificationBell from "./NotificationBell";
import UserMenu from "./UserMenu";

interface PrincipalDashboardLayoutProps {
  children: ReactNode;
}

const navItems = [
  { label: "Dashboard", href: "/dashboard/principal", icon: DashboardIcon },
  { label: "Notice", href: "/dashboard/principal/notice", icon: NoticeIcon },
  { label: "Messages", href: "/dashboard/principal/messages", icon: MessagesIcon },
  { label: "Student", href: "/dashboard/principal/students", icon: StudentIcon },
];

export default function PrincipalDashboardLayout({
  children,
}: PrincipalDashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState<string>("User");
  const [branch, setBranch] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    // localStorage is only available client-side, so this can't be read
    // during the initial render — hence the effect instead of lazy state.
    const storedName = localStorage.getItem("name");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a browser-only value, not derived state
    if (storedName) setUserName(storedName);
    const storedBranch = localStorage.getItem("branch");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a browser-only value, not derived state
    if (storedBranch) setBranch(storedBranch);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    localStorage.removeItem("branch");
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
          {branch && (
            <p className="text-xs text-blue-600 font-medium mt-0.5">
              {branch} Branch
            </p>
          )}
          <div className="flex items-center gap-1 mt-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-gray-400">Online</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard/principal"
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
            <Link
              href="/dashboard/principal/messages"
              className="text-white text-sm hover:opacity-80 transition-opacity"
            >
              Communication
            </Link>

            <NotificationBell messagesHref="/dashboard/principal/messages" />

            <UserMenu
              name={userName}
              accountHref="/dashboard/principal/account"
              dashboardHref="/dashboard/principal"
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

function StudentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 9a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 1114 0H3z" />
    </svg>
  );
}
