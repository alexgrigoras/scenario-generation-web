import { Rocket } from 'lucide-react';
import type React from 'react';

interface LogoProps {
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ className }) => {
  return (
    <div className={`flex items-center text-primary ${className}`}>
      <Rocket className="h-8 w-8 mr-2" />
      <h1 className="text-3xl font-bold">ScenarioSage</h1>
    </div>
  );
};

export default Logo;
