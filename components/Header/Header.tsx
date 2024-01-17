import { Center, Container, Flex, Group, Menu, NumberFormatter, Title } from '@mantine/core';
import { IconChevronDown } from '@tabler/icons-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

import { usePathname } from 'next/navigation';
import classes from './Header.module.css';
import { MetaplexLogo, MetaplexLogoVariant } from '../MetaplexLogo';
import { Env } from '@/providers/useEnv';
import { useInscriptionCounter } from '@/providers/useInscriptionCounter';
import RetainQueryLink from '../RetainQueryLink';

const HeaderLink = ({ label, link, disabled }: { label: string, link: string, disabled?: boolean }) => {
  const cls = disabled ? [classes.disabled, classes.link].join(' ') : classes.link;
  return (
    <RetainQueryLink href={link} className={cls}>
      {label}
    </RetainQueryLink>
  );
};

export function Header({ env, setEnv }: { env: string; setEnv: (env: Env) => void }) {
  const pathname = usePathname();
  const { count } = useInscriptionCounter();

  return (
    <Container
      size="xl"
      h={80}
      pt={12}
    >
      <div className={classes.inner}>
        <Flex justify="center" align="center" gap="md">
          <RetainQueryLink href="/">
            <MetaplexLogo variant={MetaplexLogoVariant.Small} />
          </RetainQueryLink>
          <Title order={2}>Inscriptions</Title>
          {pathname !== '/' &&
            <Title c="red" fw={900} order={3}>
              <NumberFormatter prefix="# " value={count} thousandSeparator />
            </Title>}
        </Flex>
        <Group>
          <HeaderLink label="Inscribe" link="/inscribe" />
          <HeaderLink label="Explorer" link="/explorer" />
          <WalletMultiButton />
          <Menu trigger="hover" transitionProps={{ exitDuration: 0 }} withinPortal>
            <Menu.Target>
              <a
                href={undefined}
                className={classes.link}
                onClick={(event) => event.preventDefault()}
              >
                <Center>
                  <span className={classes.linkLabel}>{env}</span>
                  <IconChevronDown size="0.9rem" stroke={1.5} />
                </Center>
              </a>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={() => setEnv('mainnet-beta')}>Mainnet Beta</Menu.Item>
              <Menu.Item onClick={() => setEnv('devnet')}>Devnet</Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </div>
    </Container>
  );
}
