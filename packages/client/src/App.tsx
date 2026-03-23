import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { HomePage } from "./pages/HomePage";
import { PreJoinPage } from "./pages/PreJoinPage";

const RoomPage = lazy(() => import("./pages/RoomPage").then(m => ({ default: m.RoomPage })));

function Loading() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "100vh", gap: 16,
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: "var(--accent-signal)",
        animation: "signal-breathe 1.5s ease-in-out infinite",
      }} />
      <span style={{
        fontFamily: "var(--font-mono)", fontSize: 13,
        color: "var(--text-lo)", letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}>Loading...</span>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/room/:roomId" element={<PreJoinPage />} />
        <Route path="/room/:roomId/session" element={
          <Suspense fallback={<Loading />}>
            <RoomPage />
          </Suspense>
        } />
      </Routes>
    </BrowserRouter>
  );
}
