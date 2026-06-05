import React, { createContext, useContext, useState } from 'react';

// Carries the active drill selection (which pattern + difficulty) between the
// pattern hub/page and the drill screen.
const DrillContext = createContext();

export const DrillProvider = ({ children }) => {
  const [drillSettings, setDrillSettings] = useState({ pattern: '', difficulty: '' });

  return (
    <DrillContext.Provider value={{ drillSettings, setDrillSettings }}>
      {children}
    </DrillContext.Provider>
  );
};

export const useDrillSettings = () => useContext(DrillContext);
