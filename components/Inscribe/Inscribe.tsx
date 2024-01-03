import { Box, Button, Group, Stepper } from '@mantine/core';
import { useState } from 'react';
import { DasApiAsset } from '@metaplex-foundation/digital-asset-standard-api';
import { NftSelector } from './NftSelector';
import { ConfigureInscribe, InscriptionSettings } from './ConfigureInscribe';
import { DoInscribe } from './DoInscribe';

export function Inscribe() {
  const [active, setActive] = useState(0);
  const [highestStepVisited, setHighestStepVisited] = useState(active);
  const [selectedNfts, setSelectedNfts] = useState<DasApiAsset[]>([]);
  const [inscriptionSettings, setInscriptionSettings] = useState<InscriptionSettings[]>();

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
          description="Inscribe selected NFTs"
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
          <DoInscribe inscriptionSettings={inscriptionSettings} />
        </Stepper.Step>

        <Stepper.Completed>
          Congratulations! You have inscribed your NFTs.
        </Stepper.Completed>
      </Stepper>
    </Box>);
}
