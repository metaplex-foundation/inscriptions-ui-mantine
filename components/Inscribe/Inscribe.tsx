import { Box, Button, Center, Grid, Paper, Stack, Stepper, Title } from '@mantine/core';
import { useState } from 'react';
import { CodeHighlightTabs } from '@mantine/code-highlight';
import { IconChisel } from '@tabler/icons-react';
import { NftSelector } from './NftSelector';
import { ConfigureInscribe, InscriptionSettings } from './ConfigureInscribe';
import { DoInscribe } from './DoInscribe';
import { AssetWithInscription } from './types';
import { NftCard } from './NftCard';

export function Inscribe() {
  const [active, setActive] = useState(0);
  const [highestStepVisited, setHighestStepVisited] = useState(active);
  const [selectedNfts, setSelectedNfts] = useState<AssetWithInscription[]>([]);
  const [inscriptionSettings, setInscriptionSettings] = useState<InscriptionSettings[]>();
  const [txs, setTxs] = useState<string[]>();

  const handleStepChange = (nextStep: number) => {
    const isOutOfBounds = nextStep > 3 || nextStep < 0;

    if (isOutOfBounds) {
      return;
    }

    setActive(nextStep);
    setHighestStepVisited((hSC) => Math.max(hSC, nextStep));
  };

  // Allow the user to freely go back and forth between visited steps.
  const shouldAllowSelectStep = (step: number) => highestStepVisited >= step && active !== step;

  return (
    <Box mt="xl">
      <Stepper active={active} onStepClick={setActive}>
        <Stepper.Step
          label="Select NFTs"
          description="Inscribe NFTs you've created"
          allowStepSelect={shouldAllowSelectStep(0)}
        >
          <NftSelector
            selectedNfts={selectedNfts}
            onSelect={(nfts) => {
              setSelectedNfts(nfts);
              handleStepChange(active + 1);
            }}
          />
        </Stepper.Step>
        <Stepper.Step
          label="Configure"
          description="Choose on-chain data format"
          allowStepSelect={shouldAllowSelectStep(1)}
        >
          <ConfigureInscribe
            selectedNfts={selectedNfts}
            onConfigure={(settings) => {
              setInscriptionSettings(settings);
              handleStepChange(active + 1);
            }}
          />
        </Stepper.Step>
        <Stepper.Step
          label="Inscribe"
          description="Do it"
          allowStepSelect={shouldAllowSelectStep(2)}
        >
          <DoInscribe
            inscriptionSettings={inscriptionSettings!}
            onComplete={(txsRes) => {
              setTxs(txsRes);
              handleStepChange(active + 1);
            }}
          />
        </Stepper.Step>

        <Stepper.Completed>
          <Paper mt="lg" p="lg">
            <Center>
              <Stack align="center">
                <Box w="50%" mt="xl">
                  <IconChisel size="xl" color="var(--mantine-color-blue-7)" />
                </Box>
                <Title>Congratulations! You have inscribed your NFTs.</Title>
                <Grid my="lg" w="100%" justify="center" gutter="lg">
                  {selectedNfts.map((nft) => (
                    <Grid.Col span={4}>
                      <NftCard nft={nft} showLinks />
                    </Grid.Col>))}
                </Grid>
                <Button
                  mb="lg"
                  onClick={() => {
                    handleStepChange(0);
                    setHighestStepVisited(0);
                    setSelectedNfts([]);
                    setInscriptionSettings(undefined);
                    setTxs(undefined);
                  }}
                >Inscribe more
                </Button>
              </Stack>
            </Center>
            <CodeHighlightTabs
              withExpandButton
              expandCodeLabel="Show all transactions"
              collapseCodeLabel="Show less"
              defaultExpanded={false}
              // withHeader={false}
              mt="md"
              mb="lg"
              code={[{
                fileName: 'transactions',
                code: txs?.join('\n') || '',
              }]}
            />
          </Paper>
        </Stepper.Completed>
      </Stepper>
    </Box>);
}
