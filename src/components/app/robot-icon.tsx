import type { RobotType } from '@/lib/robots/types';
import { Bot, Combine, GitBranch, type LucideProps } from 'lucide-react';

interface RobotIconProps extends LucideProps {
  type: RobotType;
}

const RobotIcon = ({ type, ...props }: RobotIconProps) => {
  switch (type) {
    case 'mobile':
      return <Bot {...props} />;
    case 'arm':
      return <GitBranch {...props} />;
    case 'hybrid':
      return <Combine {...props} />;
    default:
      return <Bot {...props} />;
  }
};

export default RobotIcon;
