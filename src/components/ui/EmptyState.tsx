import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: {
    container: 'py-4',
    icon: 'h-8 w-8',
    title: 'text-sm font-medium',
    description: 'text-xs',
  },
  md: {
    container: 'py-8',
    icon: 'h-10 w-10',
    title: 'text-base font-medium',
    description: 'text-sm',
  },
  lg: {
    container: 'py-16',
    icon: 'h-12 w-12',
    title: 'text-lg font-medium',
    description: 'text-base',
  },
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  size = 'md',
}: EmptyStateProps) {
  const styles = sizeStyles[size];

  return (
    <div className={cn('text-center', styles.container, className)}>
      {Icon && (
        <Icon className={cn('mx-auto mb-3 text-muted-foreground opacity-50', styles.icon)} />
      )}
      <h3 className={cn('mb-1', styles.title)}>{title}</h3>
      {description && (
        <p className={cn('text-muted-foreground', styles.description)}>{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
