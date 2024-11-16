import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { Spinner, Center } from '@chakra-ui/react';
import Top from '../components/pages/top';

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

  // if (!user) {
  //   return (
  //     <Center height="100vh">
  //       <Spinner size="xl" />
  //     </Center>
  //   );
  // }

  // console.log("Rendering Top component");
  return <Top />;
};

export default TopPage;
