import React, { useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Button } from "@chakra-ui/react";
import Contact from "../components/Pages/contact"; 
import { TOP } from "../components/Pages/top";

const App: React.FC = () => {
  const [isContactOpen, setContactOpen] = useState(false);

  const openContact = () => setContactOpen(true);
  const closeContact = () => setContactOpen(false);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<TOP />} />
        <Route
          path="/contact"
          element={
            <>
              <Button onClick={openContact} colorScheme="teal" size="lg">
                Open Contact
              </Button>
              <Contact isOpen={isContactOpen} onClose={closeContact} />
            </>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
