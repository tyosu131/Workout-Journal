import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Stack, Text, Link, Grid, GridItem } from "@chakra-ui/react";
import PrimaryButton from "../Atoms/Buttons/PrimaryButton";

const TOP: React.FC = () => {
  const navigate = useNavigate();
  const [dates] = useState<Array<{ date: string; note: string }>>([]);

  const onClickUpdate = () => navigate('/note/new');

  const handleDateClick = (date: string) => {
    const note = dates.find((d) => d.date === date)?.note;
    if (note) {
      // ノートが既に存在する場合
      navigate(`/note/edit/${date}`);
    } else {
      // ノートが存在しない場合
      navigate(`/note/new/${date}`);
    }
  };

  return (
    <Box p={4}>
      <Stack direction="row" spacing={4} align="center" justify="space-between" mb={4}>
        <Text fontSize="2xl">Top</Text>
      </Stack>
      <Stack direction="row" spacing={4} align="center" justify="space-between" mb={8}>
        <PrimaryButton onClick={onClickUpdate}>作成</PrimaryButton>
      </Stack>
      <Grid templateColumns="repeat(7, 1fr)" gap={4} border="1px solid" borderBottom="none">
        {Array.from({ length: 30 }).map((_, index) => {
          const date = `2024-06-${String(index + 1).padStart(2, '0')}`;
          const note = dates.find(d => d.date === date)?.note;
          return (
            <GridItem key={date} w="100%" h="100px" borderWidth="1px" borderRadius="lg" p={4} onClick={() => handleDateClick(date)}>
              {note ? (
                <Text>{note}</Text>
              ) : (
                <Text>{index + 1}</Text>
              )}
            </GridItem>
          );
        })}
      </Grid>
      <Box mt={8} display="flex" justifyContent="center">
        <Link href="/contact" mr={4}>Contact</Link>
        <Link href="/user">User</Link>
      </Box>
      <Box mt={8} display="flex" justifyContent="center">
        <Link href="/">Top</Link>
        <Link href="/timer" ml={4}>Timer</Link>
      </Box>
    </Box>
  );
};

export default TOP;
