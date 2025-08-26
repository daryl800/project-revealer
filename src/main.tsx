// In App.tsx or wherever your router is
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";

export default function App() {
  return (
    <BrowserRouter basename="/project-revealer/">
      <Routes>
        <Route path="/" element={<Home />} />
        {/* other routes */}
      </Routes>
    </BrowserRouter>
  );
}
