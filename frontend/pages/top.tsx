import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../frontend/features/auth/AuthContext';
import { Spinner, Center } from '@chakra-ui/react';
import Top from '../../frontend/features/top/components/TopPage';

const TopPage: React.FC = () => {
//   const { user } = useAuth();
//   const router = useRouter();

  // useEffect(() => {
  //   if (!user) {
  //     console.log("User not authenticated, redirecting to login...");
  //     router.push('/login');
  //   } else {
  //     console.log("User authenticated, staying on /top");
  //   }
  // }, [user, router]);

  return <Top />;
};

export default TopPage;
