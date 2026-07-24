"use client";

/**
 * Last-resort boundary.
 *
 * This catches failures in the root layout itself, which is why it renders
 * its own html and body: at this point nothing above it is guaranteed to
 * exist. Styling is inline for the same reason — the stylesheet may be the
 * thing that failed.
 */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          background: "#050816",
          color: "#ffffff",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
          PodMind AI is having a problem
        </h1>
        <p style={{ color: "#94a3b8", maxWidth: "28rem", margin: 0 }}>
          Something failed before the page could load. Please try again in a moment.
        </p>
        {error.digest ? (
          <p style={{ color: "#64748b", fontSize: "0.75rem", fontFamily: "monospace" }}>
            Reference {error.digest}
          </p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "0.5rem",
            padding: "0.6rem 1.25rem",
            borderRadius: "0.5rem",
            border: "none",
            cursor: "pointer",
            color: "#ffffff",
            fontWeight: 600,
            background: "linear-gradient(135deg, #2D8CFF 0%, #7B3FF2 100%)",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
