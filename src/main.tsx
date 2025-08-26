// In your main App.tsx or where you set up routes
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

function App() {
  return (
    <Router basename="/project-revealer">
      <Routes>
        <Route path="/" element={<App />} />
        {/* other routes */}
      </Routes>
    </Router>
  );
}
