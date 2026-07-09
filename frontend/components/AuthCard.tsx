"use client";

import Image from "next/image";
import { ReactNode } from "react";

/**
 * Shared card shell for every pre-login page (login, forgot-username,
 * forgot-password, reset-password). Pulled directly out of
 * app/login/page.tsx's markup so all four pages look identical.
 */
export default function AuthCard({
  left,
  right,
}: {
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <Image
          src="/oki_bg3.jpg"
          alt="OKI International School"
          fill
          sizes="100vw"
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-orange-200/40 via-white/50 to-blue-300/40" />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-3xl mx-4">
        <div className="relative bg-white rounded-md shadow-2xl overflow-visible">
          {/* Header */}
          <div className="h-24 bg-gradient-to-r from-sky-500 to-blue-600 rounded-t-md" />

          {/* Logo */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-10">
            <div className="w-28 h-28 rounded-full bg-white shadow-lg flex items-center justify-center overflow-hidden border border-gray-100">
              <Image
                src="/12.jpg"
                alt="OKI International School Logo"
                width={90}
                height={90}
                priority
                className="object-contain"
              />
            </div>
          </div>

          {/* Body */}
          <div className="grid grid-cols-1 md:grid-cols-2 pt-14 pb-10 px-8 md:px-10">
            <div className="flex items-center justify-center md:justify-start md:border-r border-gray-200 mb-8 md:mb-0 md:pr-10">
              {left}
            </div>
            <div className="flex flex-col justify-center md:pl-10">{right}</div>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-xs text-gray-400">
            © 2026 OKI International School Management System
          </p>
        </div>
      </div>
    </div>
  );
}
