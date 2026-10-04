"use client";

import Link from "next/link";
import { useState } from "react";

export default function NoticeStack({ notices }) {
  const [dismissed, setDismissed] = useState([]);

  function dismiss(id) {
    setDismissed((current) => [...current, id]);
  }
  const visible = notices.filter((notice) => !dismissed.includes(notice.id));
  if (!visible.length) return null;

  return (
    <div
      className="group/notices"
      role="region"
      aria-label="Notices"
    >
      {visible.map((notice, index) => (
        <div
          key={notice.id}
          className={`relative rounded-2xl border border-[#e9e2d7] bg-white shadow-[0_8px_30px_rgba(92,73,48,0.055)] transition-all duration-300 ease-out dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20 ${
            index === 0
              ? "z-30"
              : "-mt-[4.25rem] max-h-[4.5rem] overflow-hidden group-hover/notices:mt-2 group-hover/notices:max-h-48 group-focus-within/notices:mt-2 group-focus-within/notices:max-h-48"
          } ${index === 1 ? "z-20 mx-3 group-hover/notices:mx-0 group-focus-within/notices:mx-0" : ""} ${
            index > 1 ? "z-10 mx-6 group-hover/notices:mx-0 group-focus-within/notices:mx-0" : ""
          }`}
        >
          <div
            className={`p-4 ${
              index === 0
                ? ""
                : "opacity-0 transition-opacity duration-300 group-hover/notices:opacity-100 group-focus-within/notices:opacity-100"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-teal-800 dark:border-teal-900 dark:bg-teal-950/50 dark:text-teal-200">
                {notice.label}
              </span>
              <button
                type="button"
                onClick={() => dismiss(notice.id)}
                className="-mr-1 -mt-1 grid size-6 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label={`Dismiss: ${notice.title}`}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <h2 className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {notice.title}
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {notice.detail}
            </p>
            {notice.href ? (
              <Link
                href={notice.href}
                className="mt-2 inline-flex text-xs font-semibold text-teal-800 hover:text-teal-950 dark:text-teal-300 dark:hover:text-teal-100"
              >
                {notice.cta}{" "}
                <span className="ml-1" aria-hidden="true">
                  →
                </span>
              </Link>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
