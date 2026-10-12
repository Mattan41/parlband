"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import AdminNav from "./AdminNav";
import { secondaryButtonClass } from "./adminStyles";

interface Props {
  /** Short description under the "Pärlband – Admin" title. */
  subtitle: string;
  /** True while the initial data load is in flight. */
  loading?: boolean;
  /** Error message shown instead of the content; null/undefined when none. */
  error?: string | null;
  /** Retry handler for the error state; the button is hidden when omitted. */
  onRetry?: () => void;
  /** Rendered after the content, e.g. the toast stack. */
  footer?: ReactNode;
  children: ReactNode;
}

/**
 * Shared chrome for the /admin pages: the page background, the header (title,
 * subtitle and the "open site" link), the AdminNav and the loading/error
 * states. Each page supplies only its own content, which keeps the five admin
 * screens from repeating the same scaffold.
 */
export default function AdminPage({
  subtitle,
  loading = false,
  error = null,
  onRetry,
  footer,
  children,
}: Readonly<Props>) {
  // Resolved as a plain statement so the loading/error/content choice is not a
  // nested ternary (kept readable and lint-clean).
  let body: ReactNode;
  if (loading) {
    body = <p className="text-sm text-zinc-500 dark:text-zinc-400">Laddar…</p>;
  } else if (error) {
    body = (
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        {onRetry ? (
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={onRetry}
          >
            Försök igen
          </button>
        ) : null}
      </div>
    );
  } else {
    body = children;
  }

  return (
    <div className="min-h-full flex-1 bg-zinc-100 font-sans dark:bg-zinc-950">
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Pärlband – Admin
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {subtitle}
            </p>
          </div>
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-amber-700 underline underline-offset-4 dark:text-amber-400"
          >
            Öppna startsida i ny flik ↗
          </Link>
        </header>

        <div className="mb-6">
          <AdminNav />
        </div>

        {body}

        {footer}
      </main>
    </div>
  );
}
