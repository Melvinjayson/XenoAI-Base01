import { BrowserRouter, Routes, Route } from "react-router-dom";
import TestPage from "@/pages/test-page";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TestPage />} />
        <Route path="/test" element={<TestPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;