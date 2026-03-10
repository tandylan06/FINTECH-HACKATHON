import { useState, useEffect } from 'react';

export const useDemoAccount = () => {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoTimeRemaining, setDemoTimeRemaining] = useState(30 * 60); // 30 minutes in seconds
  
  const activateDemo = () => {
    setIsDemoMode(true);
    setDemoTimeRemaining(30 * 60);
  };
  
  const endDemoSession = () => {
    setIsDemoMode(false);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isDemoMode && demoTimeRemaining > 0) {
      timer = setInterval(() => {
        setDemoTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsDemoMode(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isDemoMode, demoTimeRemaining]);
  
  return {
    isDemoMode,
    demoTimeRemaining,
    activateDemo,
    endDemoSession,
    demoLimitations: {
      maxDrawings: 10,
      symbols: ['EUR/USD', 'GBP/USD', 'BTC/USD']
    }
  };
};
