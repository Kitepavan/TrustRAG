import { createContext, useContext } from 'react';

interface SidebarContextValue {
  openSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  openSidebar: () => {},
});

export const SidebarContextProvider = SidebarContext.Provider;

export function useSidebar() {
  return useContext(SidebarContext);
}
