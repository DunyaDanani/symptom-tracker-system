"use client";

import { useEffect, useState } from "react";

import { API_BASE } from "@/lib/config";
import {
  isBlank,
  isValidEmail,
  requiredMessage,
  errorBorder,
  INVALID_EMAIL_MESSAGE,
  FieldErrors,
} from "@/lib/validation";
import FieldError from "@/components/FieldError";

interface Me {
  _id: string;
  name: string;
  username: string;
  role: string;
  branch?: string;
  email?: string | null;
  createdAt: string;
}

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator",
  shadow_teacher: "Shadow Teacher",
  parent: "Parent / Guardian",
  principal: "Branch Principal",
  child: "Student",
};

// Shared "My Account" content, embedded inside each role's own
// DashboardLayout (see /dashboard/<role>/account/page.tsx). Shows the
// logged-in user's own details and lets them change their username and
// password, reusing the existing /api/auth endpoints.
export default function AccountProfile() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const [newUsername, setNewUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<string | null>(null);
  const [usernameBusy, setUsernameBusy] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [passwordBusy, setPasswordBusy] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<
    FieldErrors<"newUsername" | "currentPassword" | "newPassword" | "newEmail">
  >({});
  const clearFieldError = (field: "newUsername" | "currentPassword" | "newPassword" | "newEmail") =>
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  const loadMe = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setMe(data.user);
        setNewUsername(data.user.username);
        setNewEmail(data.user.email || "");
      }
    } catch (err) {
      console.error("Failed to load account details", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMe();
  }, []);

  const submitUsernameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setUsernameStatus(null);
    if (isBlank(newUsername)) {
      setFieldErrors((prev) => ({ ...prev, newUsername: requiredMessage("New username") }));
      return;
    }
    setUsernameBusy(true);
    try {
      const res = await fetch(`${API_BASE}/auth/change-username`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ newUsername }),
      });
      const data = await res.json();
      setUsernameStatus(data.message);
      if (data.success) {
        localStorage.setItem("username", data.username);
        await loadMe();
      }
    } catch (err) {
      console.error(err);
      setUsernameStatus("Something went wrong. Try again.");
    } finally {
      setUsernameBusy(false);
    }
  };

  const submitEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailStatus(null);
    if (isBlank(newEmail) || !isValidEmail(newEmail)) {
      setFieldErrors((prev) => ({
        ...prev,
        newEmail: isBlank(newEmail) ? requiredMessage("Email") : INVALID_EMAIL_MESSAGE,
      }));
      return;
    }
    setEmailBusy(true);
    try {
      const res = await fetch(`${API_BASE}/auth/change-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ email: newEmail }),
      });
      const data = await res.json();
      setEmailStatus(data.message);
      if (data.success) {
        await loadMe();
      }
    } catch (err) {
      console.error(err);
      setEmailStatus("Something went wrong. Try again.");
    } finally {
      setEmailBusy(false);
    }
  };

  const submitPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);
    const pwErrors: FieldErrors<"currentPassword" | "newPassword"> = {};
    if (isBlank(currentPassword))
      pwErrors.currentPassword = requiredMessage("Current password");
    if (isBlank(newPassword)) pwErrors.newPassword = requiredMessage("New password");
    setFieldErrors((prev) => ({
      ...prev,
      currentPassword: pwErrors.currentPassword,
      newPassword: pwErrors.newPassword,
    }));
    if (Object.keys(pwErrors).length > 0) return;
    setPasswordBusy(true);
    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      setPasswordStatus(data.message);
      if (data.success) {
        setCurrentPassword("");
        setNewPassword("");
      }
    } catch (err) {
      console.error(err);
      setPasswordStatus("Something went wrong. Try again.");
    } finally {
      setPasswordBusy(false);
    }
  };

  if (loading) {
    return <p className="text-gray-400">Loading account details...</p>;
  }

  if (!me) {
    return <p className="text-gray-400">Couldn&apos;t load your account.</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Overview card */}
      <div className="bg-white rounded-md shadow-sm p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-900/10 flex items-center justify-center shrink-0">
            <svg className="w-9 h-9 text-blue-900" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 9a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 1114 0H3z" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-800">{me.name}</p>
            <p className="text-sm text-gray-500">
              {ROLE_LABEL[me.role] || me.role}
              {me.branch ? ` — ${me.branch} Branch` : ""}
            </p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-400">Username</dt>
            <dd className="text-gray-800 font-medium">{me.username}</dd>
          </div>
          {me.email && (
            <div>
              <dt className="text-gray-400">Recovery email</dt>
              <dd className="text-gray-800 font-medium">{me.email}</dd>
            </div>
          )}
          <div>
            <dt className="text-gray-400">Account created</dt>
            <dd className="text-gray-800 font-medium">
              {new Date(me.createdAt).toLocaleDateString()}
            </dd>
          </div>
        </dl>
      </div>

      {/* Add / update recovery email — staff roles only (admin, principal,
          shadow_teacher, class_teacher). Parent/child accounts recover
          through the linked student's parent email instead, so this
          wouldn't do anything for them. */}
      {me.role !== "parent" && me.role !== "child" && (
        <form
          onSubmit={submitEmailChange}
          noValidate
          className="bg-white rounded-md shadow-sm p-6 space-y-3"
        >
          <p className="text-sm font-semibold text-gray-700">
            {me.email ? "Update recovery email" : "Add a recovery email"}
          </p>
          <p className="text-xs text-gray-400">
            Used for forgot-username / forgot-password. Without one, account
            recovery isn&apos;t possible and you&apos;d need to contact the
            school admin.
          </p>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => {
            setNewEmail(e.target.value);
            clearFieldError("newEmail");
          }}
            className={`w-full border border-gray-200 rounded px-3 py-2 text-sm ${errorBorder(fieldErrors.newEmail)}`}
            placeholder="you@example.com"
          />
          <FieldError message={fieldErrors.newEmail} />
          <button
            type="submit"
            disabled={emailBusy}
            className="bg-blue-900 hover:bg-blue-800 transition-colors text-white text-sm font-medium px-4 py-2 rounded disabled:opacity-50"
          >
            {emailBusy ? "Saving..." : "Save email"}
          </button>
          {emailStatus && (
            <p className="text-xs text-gray-500">{emailStatus}</p>
          )}
        </form>
      )}

      {/* Change username */}
      <form
        onSubmit={submitUsernameChange}
        noValidate
        className="bg-white rounded-md shadow-sm p-6 space-y-3"
      >
        <p className="text-sm font-semibold text-gray-700">Change username</p>
        <input
          type="text"
          value={newUsername}
          onChange={(e) => {
            setNewUsername(e.target.value);
            clearFieldError("newUsername");
          }}
          className={`w-full border border-gray-200 rounded px-3 py-2 text-sm ${errorBorder(fieldErrors.newUsername)}`}
          placeholder="New username"
        />
        <FieldError message={fieldErrors.newUsername} />
        <button
          type="submit"
          disabled={usernameBusy}
          className="bg-blue-900 hover:bg-blue-800 transition-colors text-white text-sm font-medium px-4 py-2 rounded disabled:opacity-50"
        >
          {usernameBusy ? "Saving..." : "Save username"}
        </button>
        {usernameStatus && (
          <p className="text-xs text-gray-500">{usernameStatus}</p>
        )}
      </form>

      {/* Change password */}
      <form
        onSubmit={submitPasswordChange}
        noValidate
        className="bg-white rounded-md shadow-sm p-6 space-y-3"
      >
        <p className="text-sm font-semibold text-gray-700">Change password</p>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => {
            setCurrentPassword(e.target.value);
            clearFieldError("currentPassword");
          }}
          className={`w-full border border-gray-200 rounded px-3 py-2 text-sm ${errorBorder(fieldErrors.currentPassword)}`}
          placeholder="Current password"
        />
        <FieldError message={fieldErrors.currentPassword} />
        <input
          type="password"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            clearFieldError("newPassword");
          }}
          className={`w-full border border-gray-200 rounded px-3 py-2 text-sm ${errorBorder(fieldErrors.newPassword)}`}
          placeholder="New password"
        />
        <FieldError message={fieldErrors.newPassword} />
        <button
          type="submit"
          disabled={passwordBusy}
          className="bg-blue-900 hover:bg-blue-800 transition-colors text-white text-sm font-medium px-4 py-2 rounded disabled:opacity-50"
        >
          {passwordBusy ? "Saving..." : "Save password"}
        </button>
        {passwordStatus && (
          <p className="text-xs text-gray-500">{passwordStatus}</p>
        )}
      </form>
    </div>
  );
}
