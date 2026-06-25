import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './collapsible';
import { GlassSurface } from './GlassSurface';

const paddingClasses = {
  xs: 'p-2',
  sm: 'p-3',
  md: 'p-4',
} as const;

type ListItemPadding = keyof typeof paddingClasses;

interface ListItemCardBaseProps {
  children: ReactNode;
  padding?: ListItemPadding;
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

function CollapsibleListItemCard({
  children,
  padding = 'sm',
  header,
  defaultExpanded = false,
}: ListItemCardCollapsibleProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const paddingClass = paddingClasses[padding];

  return (
    <GlassSurface variant="inset" className="overflow-hidden p-0">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CollapsibleTrigger className={cn('w-full rounded-[inherit]', paddingClass)}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 text-left">{header}</div>
            <ChevronDown
              size={16}
              className={cn(
                'shrink-0 text-muted-foreground transition-transform duration-200',
                expanded && 'rotate-180',
              )}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className={cn('px-3 pb-3', padding === 'md' && 'px-4 pb-4')}>
          {children}
        </CollapsibleContent>
      </Collapsible>
    </GlassSurface>
  );
}

export function ListItemCard(props: ListItemCardProps) {
  if (props.variant === 'collapsible') {
    return <CollapsibleListItemCard {...props} />;
  }

  const { children, padding = 'sm' } = props;

  return (
    <GlassSurface variant="inset" className={paddingClasses[padding]}>
      {children}
    </GlassSurface>
  );
}
