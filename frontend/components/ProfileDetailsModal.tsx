"use client";

import Modal from "@/components/Modal";

// Pop-up with a person's full profile details, opened from the
// "View Profile" button on a ProfileBanner. Keeps the page itself to one
// compact profile bar instead of repeating the same details in a second
// card.

export interface ProfileDetail {
  label: string;
  value?: string | number | null;
  /** Spans both columns (long values like an address). */
  wide?: boolean;
  capitalize?: boolean;
}

export interface ProfileDetailSection {
  heading?: string;
  rows: ProfileDetail[];
}

export default function ProfileDetailsModal({
  open,
  onClose,
  title,
  sections,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  sections: ProfileDetailSection[];
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidthClassName="max-w-xl">
      <div className="space-y-6">
        {sections.map((section, i) => (
          <div key={section.heading || i}>
            {section.heading && (
              <p className="text-xs font-semibold text-gray-400 tracking-wide uppercase mb-3">
                {section.heading}
              </p>
            )}
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              {section.rows.map((row) => (
                <div
                  key={row.label}
                  className={`border-b border-gray-50 pb-2 min-w-0 ${row.wide ? "sm:col-span-2" : ""}`}
                >
                  <dt className="text-gray-500 text-xs">{row.label}</dt>
                  <dd
                    className={`text-gray-800 font-medium mt-0.5 break-words ${row.capitalize ? "capitalize" : ""}`}
                  >
                    {row.value === undefined || row.value === null || row.value === ""
                      ? "—"
                      : row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </Modal>
  );
}
