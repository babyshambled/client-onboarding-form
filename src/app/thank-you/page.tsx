"use client";

import Link from "next/link";

export default function ThankYou() {
  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Success icon */}
        <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-brand-accent/20 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-brand-yellow"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-brand-white mb-4">
          You&rsquo;re all set!
        </h1>
        <p className="text-brand-muted text-base sm:text-lg mb-8 leading-relaxed">
          Thank you for completing the onboarding form. I&rsquo;ll review your
          answers and be in touch soon.
        </p>

        <Link
          href="/"
          className="inline-block px-6 py-3 bg-brand-green text-brand-white rounded-lg font-medium text-sm hover:bg-brand-accent transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
