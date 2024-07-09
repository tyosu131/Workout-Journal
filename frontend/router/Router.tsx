import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Top from '../components/pages/top';
import Contact from '../components/pages/contact';

const AppRouter: React.FC = () => {
  const handleOpenContact = () => {
    // TODO:  必要に応じて、onOpenContactのロジックを追加
  };

  const handleCloseContact = () => {
    // TODO:  Contactページを閉じるロジックを追加
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Top onOpenContact={handleOpenContact} />} />
        <Route path="/contact" element={<Contact isOpen={true} onClose={handleCloseContact} />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;
