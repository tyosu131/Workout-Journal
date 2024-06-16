import React, { memo } from "react";
import { Route, Routes } from "react-router-dom";
import TOP from "../components/Pages/top";
import { Contact } from "../components/Pages/contact";

interface RouterProps {
  onOpenContact: () => void;
}

const RouterComponent: React.FC<RouterProps> = ({ onOpenContact }) => {
  return (
    <Routes>
      <Route path="/" element={<TOP onOpenContact={onOpenContact} />} />
      <Route path="/contact" element={<Contact isOpen={true} onClose={() => {}} />} />
    </Routes>
  );
};

export default memo(RouterComponent);
