'use client';

import { Image, Container, Title, Button, Group, Text, List, ThemeIcon, rem } from '@mantine/core';
import { IconNotes } from '@tabler/icons-react';
import Link from 'next/link';
import classes from './Landing.module.css';

const links: { label: string; href: string }[] = [
  { label: 'MPL Repository', href: 'https://github.com/metaplex-foundation/mpl-inscription' },
  { label: 'Typedoc', href: 'https://mpl-inscription-js-docs.vercel.app/' },
  { label: 'Javascript SDK', href: 'https://github.com/metaplex-foundation/mpl-inscription/tree/main/clients/js' },
  { label: 'Rust SDK', href: 'https://github.com/metaplex-foundation/mpl-inscription/tree/main/clients/rust' },
  {
    label: 'Inscriptions CLI',
    href: '',
  },
];

export function Landing() {
  return (
    <Container size="md">
      <div className={classes.inner}>
        <div className={classes.content}>
          <Title className={classes.title}>
            Fully on-chain NFTs
          </Title>
          <Text c="dimmed" mt="md">
            Inscribe old NFTs, mint new inscribed NFTs, and manage all of your Inscriptions all in one place
          </Text>

          <List
            mt={30}
            spacing="sm"
            size="sm"
            icon={
              <ThemeIcon size={20} radius="xl">
                <IconNotes style={{ width: rem(12), height: rem(12) }} stroke={1.5} />
              </ThemeIcon>
            }
          >
            {links.map((link) => (
              <List.Item key={link.href}>
                {link.label} - <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >here
                               </a>
              </List.Item>
            ))}
          </List>

          <Group mt={30}>
            <Link href="/inscribe">
              <Button radius="xl" size="md" className={classes.control}>
                Get started
              </Button>
            </Link>
            <Link href="https://github.com/metaplex-foundation/mpl-inscription">
              <Button variant="default" radius="xl" size="md" className={classes.control}>
                Source code
              </Button>
            </Link>
          </Group>
        </div>
        <Image src="./hero.webp" className={classes.image} />
      </div>
    </Container>
  );
}
