import React from 'react';
import { useRouter } from 'next/router';
import Note from '../../components/pages/note'; 

const NotePage: React.FC = () => {
  const router = useRouter();
  const { date } = router.query;

  // サーバーサイドレンダリングではクエリがない場合があるため、条件を追加
  if (!date) {
    return <div>Loading...</div>;
  }

  return <Note date={date as string} />;
};

export default NotePage;
