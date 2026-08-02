import React from "react";

/**
 * ErrorBoundary — catches runtime errors in the React tree and shows a
 * graceful fallback instead of a blank / broken screen.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console (PostHog / Sentry can be wired here later)
    console.error("[ErrorBoundary]", error, info.componentStack);
    try {
      if (window.posthog) window.posthog.captureException(error, { extra: info });
    } catch (_) {}
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          background: "#F5F0E8",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: "1.5rem",
            padding: "2.5rem 2rem",
            maxWidth: "480px",
            width: "100%",
            boxShadow: "0 4px 24px rgba(10,66,43,.12)",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
          <h1
            style={{
              color: "#0A422B",
              fontFamily: "Georgia, serif",
              marginBottom: "0.5rem",
              fontSize: "1.4rem",
            }}
          >
            Something went wrong / কিছু একটা ভুল হয়েছে
          </h1>
          <p style={{ color: "#666", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
            Something went wrong. Please reload the page.
          </p>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <pre
              style={{
                textAlign: "left",
                background: "#fff5f5",
                border: "1px solid #fcc",
                borderRadius: "0.5rem",
                padding: "1rem",
                fontSize: "0.75rem",
                overflowX: "auto",
                marginBottom: "1.5rem",
                color: "#c00",
              }}
            >
              {this.state.error.toString()}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#0A422B",
              color: "#fff",
              border: "none",
              borderRadius: "0.75rem",
              padding: "0.75rem 2rem",
              fontSize: "1rem",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            Reload / পুনরায় লোড করুন
          </button>
        </div>
      </div>
    );
  }
}
