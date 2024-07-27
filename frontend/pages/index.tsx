import React from 'react';
import Top from '../components/pages/top';

const HomePage: React.FC = () => {
  const handleOpenContact = () => {
  };

  return <Top onOpenContact={handleOpenContact} />;
};

export default HomePage;
