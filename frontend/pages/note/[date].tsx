import React from 'react';
import { useRouter } from 'next/router';
import Note from '../../components/pages/note'; 

const NotePage: React.FC = () => {
  const router = useRouter();
  const { date } = router.query;



  return <Note date={date as string} />;
};

export default NotePage;
