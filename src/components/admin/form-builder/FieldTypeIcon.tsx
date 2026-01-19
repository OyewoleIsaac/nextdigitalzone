import { 
  Type, 
  Mail, 
  Phone, 
  AlignLeft, 
  List, 
  Hash, 
  Upload, 
  CheckSquare,
  LucideIcon
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  text: Type,
  email: Mail,
  phone: Phone,
  textarea: AlignLeft,
  select: List,
  number: Hash,
  file: Upload,
  checkbox: CheckSquare,
};

interface FieldTypeIconProps {
  type: string;
  className?: string;
}

export function FieldTypeIcon({ type, className = "h-4 w-4" }: FieldTypeIconProps) {
  const Icon = iconMap[type] || Type;
  return <Icon className={className} />;
}
