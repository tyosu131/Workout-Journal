import React from 'react';
import { useRouter } from 'next/router';
import Note from '../../components/pages/note'; 

const NotePage: React.FC = () => {
  const router = useRouter();
  const { date } = router.query;

  if (!date) {
    return <div>Loading...</div>;  // 必要に応じてローディングコンポーネントを追加
  }

  return <Note date={date as string} />;
};

export default NotePage;
