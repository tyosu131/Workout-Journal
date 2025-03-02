import React from 'react';
import Contact from '../features/contact/components/ContactPage';
import { useRouter } from 'next/router';

const ContactPage: React.FC = () => {
  const router = useRouter();

  const handleClose = () => {
    router.push("/top");  // 修正: topページにリダイレクトする
  };

  return <Contact isOpen={true} onClose={handleClose} />;
};

export default ContactPage;
