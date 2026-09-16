import { createContext, useContext } from 'react';

export const WorkspaceFrameContext = createContext(false);
export const useWorkspaceFrame = () => useContext(WorkspaceFrameContext);
