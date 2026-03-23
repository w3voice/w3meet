import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { PreJoinPage } from "./pages/PreJoinPage";
import { RoomPage } from "./pages/RoomPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/room/:roomId" element={<PreJoinPage />} />
        <Route path="/room/:roomId/session" element={<RoomPage />} />
      </Routes>
    </BrowserRouter>
  );
}
