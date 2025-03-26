import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../frontend/features/auth/AuthContext';
import { Spinner, Center } from '@chakra-ui/react';
import Top from '../../frontend/features/top/components/TopPage';

const TopPage: React.FC = () => {

  return <Top />;
};

export default TopPage;
