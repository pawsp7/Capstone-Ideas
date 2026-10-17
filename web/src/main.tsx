import { Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

class GardenBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="narrow screen">
          <h1>The garden tripped on a root</h1>
          <p>Refresh the page to step back onto the path. A saved garden stays on this device.</p>
          <button type="button" className="btn primary" onClick={() => window.location.reload()}>
            Refresh
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <GardenBoundary>
      <App />
    </GardenBoundary>,
  );
}
