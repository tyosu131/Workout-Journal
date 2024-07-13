import React from 'react';
import { useRouter } from 'next/router';
import Note from '../../components/pages/note';

const NotePage: React.FC = () => {
  const router = useRouter();
  const { date } = router.query;

  if (!date || typeof date !== 'string') {
    return <div>Invalid date</div>;
  }

  return <Note date={date} />;
};

export default NotePage;
