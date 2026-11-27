"use client";

import Link from "next/link";

export default function ThankYou() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-5">
      <div className="max-w-md w-full text-center">
        {/* Success icon */}
        <div className="w-16 h-16 mx-auto mb-8 rounded-full border border-green/30 bg-green-tint flex items-center justify-center">
          <svg
            className="w-7 h-7 text-green"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-[-0.015em] text-ink mb-5 leading-[1.1]">
          You&rsquo;re all set!
        </h1>
        <p className="text-ink-soft text-base sm:text-lg mb-10 leading-relaxed">
          Thank you for completing the onboarding form. I&rsquo;ll review your
          answers and be in touch soon.
        </p>

        <Link
          href="/"
          className="inline-block px-7 py-3 border border-line-strong text-ink rounded-full font-semibold text-sm hover:border-ink hover:bg-surface transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
