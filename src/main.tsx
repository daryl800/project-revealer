import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; // <-- add this
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter basename="/project-revealer/">
    <App />
  </BrowserRouter>
);
