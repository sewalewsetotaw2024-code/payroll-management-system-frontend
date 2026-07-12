import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  label: string;
  value?: string | number;
  main?: string | number;
  sub?: string;
  icon: LucideIcon;
  iconColor?: string;
  subLabel?: string;
  subValue?: string;
  subColor?: string;
  mainClassName?: string;
  subClassName?: string;
  trend?: {
    value: number;
    isUp: boolean;
  };
}

export interface SummaryItemProps {
  label: string;
  value: string | number;
  valueClassName?: string;
}
