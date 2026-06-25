import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Box, Collapse, Group, UnstyledButton, type PaperProps } from '@mantine/core';

import { GlassSurface } from './GlassSurface';

interface ListItemCardBaseProps {
  children: ReactNode;
  padding?: PaperProps['p'];
}

interface ListItemCardDefaultProps extends ListItemCardBaseProps {
  variant?: 'default';
  header?: never;
  defaultExpanded?: never;
}

interface ListItemCardCollapsibleProps extends ListItemCardBaseProps {
  variant: 'collapsible';
  header: ReactNode;
  defaultExpanded?: boolean;
}

type ListItemCardProps = ListItemCardDefaultProps | ListItemCardCollapsibleProps;

export function ListItemCard(props: ListItemCardProps) {
  const { children, padding = 'sm' } = props;

  if (props.variant === 'collapsible') {
    const [expanded, setExpanded] = useState(props.defaultExpanded ?? false);

    return (
      <GlassSurface variant="inset" p={0}>
        <UnstyledButton
          w="100%"
          p={padding}
          onClick={() => setExpanded((open) => !open)}
          style={{ borderRadius: 'inherit' }}
        >
          <Group justify="space-between" wrap="nowrap" gap="sm">
            <Box flex={1} style={{ minWidth: 0 }}>
              {props.header}
            </Box>
            <ChevronDown
              size={16}
              color="var(--mantine-color-dimmed)"
              style={{
                flexShrink: 0,
                transform: expanded ? 'rotate(180deg)' : undefined,
                transition: 'transform 200ms ease',
              }}
            />
          </Group>
        </UnstyledButton>
        <Collapse expanded={expanded}>
          <Box px={padding} pb={padding}>
            {children}
          </Box>
        </Collapse>
      </GlassSurface>
    );
  }

  return (
    <GlassSurface variant="inset" p={padding}>
      {children}
    </GlassSurface>
  );
}
