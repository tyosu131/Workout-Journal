import React from 'react';
import { Box, IconButton } from '@chakra-ui/react';
import { CloseIcon } from '@chakra-ui/icons';
import { useRouter } from 'next/router';
import { URLS } from '../../../../shared/constants/urls';
import {
  createCalendarQuery,
  resolveNoteReturnMonth,
} from '../../../../shared/utils/calendarNavigation';

const Header: React.FC = () => {
  const router = useRouter();
  const returnMonth = resolveNoteReturnMonth(router.query.month, router.query.date);

  const handleClose = () => {
    router.replace({
      pathname: URLS.TOP_PAGE,
      query: createCalendarQuery(router.query, returnMonth),
    });
  };

  return (
    <Box position="absolute" top="10px" right="10px">
      <IconButton
        aria-label="Close"
        icon={<CloseIcon />}
        onClick={handleClose}
        variant="outline"
        _hover={{ bg: "gray.200", cursor: "pointer" }}
      />
    </Box>
  );
};

Header.displayName = 'Header';
export default Header;
