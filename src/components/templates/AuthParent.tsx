import { ReactNode, createContext } from "react";
import { useLocation } from 'react-router-dom';

import { AuthInfoProp } from "../../lib/TimelineType";
import { AuthStateContext } from "../../hooks/useContextFamily";
import { useSearchQuery } from "../../resources/queries";

export const AuthProvider = ({ children }: { children: ReactNode }) => {

  const { data } = useSearchQuery('token');
  const _auth: AuthInfoProp = { accessToken: data!, type: 'token' }

  return (
    <AuthStateContext.Provider value={_auth}>
      {children}
    </AuthStateContext.Provider>
  );
};
