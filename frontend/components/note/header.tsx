import React from 'react';
import { Box, IconButton } from '@chakra-ui/react';
import { CloseIcon } from '@chakra-ui/icons';
import { useRouter } from 'next/router';

const Header: React.FC = () => {
  const router = useRouter();

  return (
    <Box position="absolute" top="10px" right="10px">
      <IconButton
        aria-label="Close"
        icon={<CloseIcon />}
        onClick={() => router.push('/')}
        variant="outline"
        _hover={{ bg: "gray.200", cursor: "pointer" }}
      />
    </Box>
  );
};

Header.displayName = 'Header';
export default Header;
