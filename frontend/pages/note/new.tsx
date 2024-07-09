import React from 'react';
import Note from '../../components/pages/note';
import { useRouter } from 'next/router';

const NewNotePage: React.FC = () => {
  const router = useRouter();
  const { date } = router.query;

  return <Note date={String(date)} />;
};

export default NewNotePage;
