'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { API_BASE } from "@/lib/config";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Invalid username or password');
        setLoading(false);
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      localStorage.setItem('name', data.name || '');
      if (data.branch) {
        localStorage.setItem('branch', data.branch);
      } else {
        localStorage.removeItem('branch');
      }

      switch (data.role) {
        case 'admin':
        case 'cao':
          // CAO has identical permissions to admin, so it reuses the same
          // dashboard rather than needing its own.
          router.push('/dashboard/admin');
          break;

        case 'principal':
          router.push('/dashboard/principal');
          break;

        case 'shadow_teacher':
        case 'class_teacher':
          router.push('/dashboard/teacher');
          break;

        case 'parent':
          router.push('/dashboard/parent');
          break;

        case 'child':
          router.push('/dashboard/child');
          break;

        default:
          router.push('/dashboard');
      }
    } catch {
      setError('Unable to reach the server. Please try again.');
      setLoading(false);
    }
  };

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

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-3xl mx-4">
        <div className="relative bg-white rounded-md shadow-2xl overflow-visible">

          {/* Header */}
          <div className="h-16 bg-gradient-to-r from-sky-500 to-blue-600 rounded-t-md" />

          {/* Logo */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-8">
            <div className="w-32 h-32 rounded-full bg-white shadow-lg flex items-center justify-center overflow-hidden border border-gray-100">
              <Image
                src="/12.jpg"
                alt="OKI International School Logo"
                width={104}
                height={104}
                priority
                className="object-contain"
              />
            </div>
          </div>

          {/* Body */}
          <div className="grid grid-cols-1 md:grid-cols-2 pt-14 pb-10 px-8 md:px-10">

            {/* Left Side */}
            <div className="flex items-center justify-center md:justify-start md:border-r border-gray-200 mb-8 md:mb-0">
              <h1 className="text-2xl font-medium text-gray-800 text-center md:text-left leading-snug">
                Welcome to
                <br />
                OKI International School
              </h1>
            </div>

            {/* Right Side */}
            <div className="flex flex-col justify-center md:pl-10">

              <form onSubmit={handleSubmit} className="space-y-4">

                <div className="flex items-center bg-slate-100 rounded-sm px-3 py-3">
                  <svg
                    className="w-4 h-4 text-gray-400 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 9a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 1114 0H3z" />
                  </svg>

                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="bg-transparent outline-none w-full text-sm text-gray-700 placeholder-gray-400"
                  />
                </div>

                <div className="flex items-center bg-slate-100 rounded-sm px-3 py-3">
                  <svg
                    className="w-4 h-4 text-gray-400 mr-3 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>

                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-transparent outline-none w-full text-sm text-gray-700 placeholder-gray-400"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>

                {error && (
                  <p className="text-sm text-red-500 text-center">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 transition-colors text-white font-semibold tracking-wide py-3 rounded-sm disabled:opacity-60"
                >
                  {loading ? 'SIGNING IN...' : 'SIGN IN'}
                </button>

                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <a href="/forgot-username" className="hover:text-blue-600 hover:underline">
                    Forgot username?
                  </a>
                  <span className="text-gray-300">|</span>
                  <a href="/forgot-password" className="hover:text-blue-600 hover:underline">
                    Forgot password?
                  </a>
                </div>

              </form>

            </div>

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
 