import { Box, Group, Text } from '@mantine/core';
import { CopyButton } from '../CopyButton/CopyButton';

export function ManageStat({ label, value, copyable }: { label: string; value: string, copyable?: boolean }) {
  return (
    <Box>
      <Text fz="xs" tt="uppercase" fw={700} c="dimmed">
        {label}
      </Text>
      <Group>
        <Text fz="lg" fw={500}>
          {value}
        </Text>
        {copyable && <CopyButton value={value} />}
      </Group>

    </Box>
  );
}
