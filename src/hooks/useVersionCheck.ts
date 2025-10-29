import { useEffect, useState } from 'react';

const VERSION_KEY = 'app_version';
const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

export const useVersionCheck = () => {
  const [hasUpdate, setHasUpdate] = useState(false);
  const currentVersion = import.meta.env.VITE_APP_VERSION || Date.now().toString();

  useEffect(() => {
    const checkVersion = () => {
      const storedVersion = localStorage.getItem(VERSION_KEY);
      
      if (!storedVersion) {
        localStorage.setItem(VERSION_KEY, currentVersion);
        return;
      }

      if (storedVersion !== currentVersion) {
        setHasUpdate(true);
      }
    };

    checkVersion();
    const interval = setInterval(checkVersion, CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [currentVersion]);

  const refreshApp = () => {
    localStorage.setItem(VERSION_KEY, currentVersion);
    window.location.reload();
  };

  return { hasUpdate, refreshApp };
};
