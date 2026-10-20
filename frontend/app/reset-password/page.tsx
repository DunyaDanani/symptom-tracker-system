"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthCard from "@/components/AuthCard";
import BackButton from "@/components/BackButton";
import { API_BASE } from "@/lib/config";
import {
  isBlank,
  requiredMessage,
  errorRing,
  FieldErrors,
} from "@/lib/validation";
import FieldError from "@/components/FieldError";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const username = params.get("username") || "";

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    FieldErrors<"code" | "newPassword" | "confirmPassword">
  >({});

  const clearFieldError = (field: "code" | "newPassword" | "confirmPassword") =>
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const errors: FieldErrors<"code" | "newPassword" | "confirmPassword"> = {};
    if (isBlank(code)) errors.code = requiredMessage("Reset code");
    if (isBlank(newPassword)) errors.newPassword = requiredMessage("New password");
    if (isBlank(confirmPassword))
      errors.confirmPassword = requiredMessage("Confirm password");
    else if (newPassword !== confirmPassword)
      errors.confirmPassword = "Passwords do not match";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, code, newPassword }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Something went wrong");
        setLoading(false);
        return;
      }
      router.push("/login");
    } catch {
      setError("Unable to reach the server. Please try again.");
      setLoading(false);
    }
  };

  return (
    <AuthCard
      left={
        <div className="text-center md:text-left">
          <h1 className="text-xl font-medium text-gray-800">
            Reset your password
          </h1>
          <p className="mt-3 text-sm text-gray-500 leading-relaxed">
            Enter the reset code we emailed you along with a new password
            for <span className="font-medium text-gray-700">{username}</span>.
          </p>
          <p className="mt-4 text-xs text-gray-400 leading-relaxed">
            <span className="font-semibold text-gray-500">NOTE:</span> The
            reset code expires 15 minutes after it was sent.
          </p>
        </div>
      }
      right={
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <div className={`flex items-center bg-slate-100 rounded-sm px-3 py-3 ${errorRing(fieldErrors.code)}`}>
              <input
                type="text"
                placeholder="Enter 6-digit reset code"
                value={code}
                onChange={(e) => {
                setCode(e.target.value);
                clearFieldError("code");
              }}
                className="bg-transparent outline-none w-full text-sm text-gray-700 placeholder-gray-400"
              />
            </div>
            <FieldError message={fieldErrors.code} />
          </div>

          <div>
            <div className={`flex items-center bg-slate-100 rounded-sm px-3 py-3 ${errorRing(fieldErrors.newPassword)}`}>
              <svg className="w-4 h-4 text-gray-400 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => {
                setNewPassword(e.target.value);
                clearFieldError("newPassword");
              }}
                className="bg-transparent outline-none w-full text-sm text-gray-700 placeholder-gray-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
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
            <FieldError message={fieldErrors.newPassword} />
          </div>

          <div>
            <div className={`flex items-center bg-slate-100 rounded-sm px-3 py-3 ${errorRing(fieldErrors.confirmPassword)}`}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => {
                setConfirmPassword(e.target.value);
                clearFieldError("confirmPassword");
              }}
                className="bg-transparent outline-none w-full text-sm text-gray-700 placeholder-gray-400"
              />
            </div>
            <FieldError message={fieldErrors.confirmPassword} />
          </div>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 transition-colors text-white font-semibold tracking-wide py-3 rounded-sm disabled:opacity-60"
          >
            {loading ? "RESETTING..." : "RESET PASSWORD"}
          </button>

          <p className="text-center">
            <BackButton href="/login" label="Back to Sign-In" />
          </p>
        </form>
      }
    />
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
