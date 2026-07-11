"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import AlertsNotificationsBell from "./AlertsNotificationsBell";
import UserMenu from "./UserMenu";

interface DashboardLayoutProps {
  children: ReactNode;
}

const navItems = [
  { label: "Dashboard", href: "/dashboard/admin", icon: DashboardIcon },
  { label: "Branches", href: "/dashboard/admin/students", icon: BranchIcon },
  { label: "Messages", href: "/dashboard/admin/messages", icon: MessagesIcon },
  { label: "Doc Recommendations", href: "/dashboard/admin/doc-reviews", icon: DocIcon },
  { label: "Notice", href: "/dashboard/admin/notice", icon: NoticeIcon },
  { label: "Alerts", href: "/dashboard/admin/alerts", icon: AlertIcon },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState<string>("User");

  useEffect(() => {
    // localStorage is only available client-side, so this can't be read
    // during the initial render — hence the effect instead of lazy state.
    const storedName = localStorage.getItem("name");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a browser-only value, not derived state
    if (storedName) setUserName(storedName);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar */}
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
            <p className="text-blue-700 font-bold text-lg tracking-tight">OKI</p>
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
              item.href === "/dashboard/admin"
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

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top navbar */}
        <header className="h-20 bg-blue-900 flex items-center justify-end gap-6 px-8 shrink-0">
          <Link
            href="/dashboard/admin/messages"
            className="text-white text-sm hover:opacity-80 transition-opacity"
          >
            Communication
          </Link>

          <AlertsNotificationsBell messagesHref="/dashboard/admin/messages" />

          <UserMenu
            name={userName}
            accountHref="/dashboard/admin/account"
            dashboardHref="/dashboard/admin"
            onLogout={handleLogout}
          />
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

function BranchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M10 2a1 1 0 011 1v1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3v2h3a1 1 0 011 1v3a1 1 0 01-1 1h-3v1a1 1 0 11-2 0v-1H6a1 1 0 01-1-1v-3a1 1 0 011-1h3v-2H6a1 1 0 01-1-1V5a1 1 0 011-1h3V3a1 1 0 011-1zM7 6v1h6V6H7zm0 8v1h6v-1H7z"
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

function DocIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function NoticeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 2a1 1 0 011 1v.083A6.002 6.002 0 0116 9v3.586l1.707 1.707A1 1 0 0117 16H3a1 1 0 01-.707-1.707L4 12.586V9a6.002 6.002 0 015-5.917V2a1 1 0 011-1zm0 15a2 2 0 002-2H8a2 2 0 002 2z" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l6.28 11.19c.75 1.334-.213 2.98-1.742 2.98H3.72c-1.53 0-2.492-1.646-1.743-2.98l6.28-11.19zM11 14a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V7a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}