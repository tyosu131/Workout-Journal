// src/App.tsx
import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Contact } from "../Components/Pages/contact";
import { TOP } from "../Components/Pages/top";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TOP />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
    </Router>
  );
};

export default App;
