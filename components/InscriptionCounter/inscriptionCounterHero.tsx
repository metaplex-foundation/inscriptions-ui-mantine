import { Box, NumberFormatter, Text, Title } from '@mantine/core';

import classes from './InscriptionCounterHero.module.css';
import { useInscriptionCounter } from '@/providers/useInscriptionCounter';

export function InscriptionCounterHero() {
  const { count } = useInscriptionCounter();

  return (
    <Box ta="center">
      <Text>Current Inscription Number</Text>
      <Title c="red" fw={900} className={classes.counter}>
        <NumberFormatter value={count} thousandSeparator />
      </Title>
      <Text>Inscribe an NFT to claim your number!</Text>
    </Box>
  );
}
