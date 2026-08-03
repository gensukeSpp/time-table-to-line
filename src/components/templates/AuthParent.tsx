import { ReactNode, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { AuthStateContext } from "../../hooks/useContextFamily";

const TOKEN_STORAGE_KEY = 'accessToken';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // 余計なレンダリングが起こるため不採用
  // const { data } = useSearchQuery('token');
  // const auth: AuthInfoProp = { accessToken: data!, type: 'token' }
  
  const [params] = useSearchParams();
  const urlToken = params.get('token');

  const [accessToken, setAccessToken] = useState(
    () =>
      urlToken ??
      (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_STORAGE_KEY) : null) ??
      ''
  );

  useEffect(() => {
    if (urlToken) {
      localStorage.setItem(TOKEN_STORAGE_KEY, urlToken);
      setAccessToken(urlToken);
    }
  }, [urlToken]);

  const auth = useMemo(() => ({ accessToken, type: 'token' as const }), [accessToken]);

  return (
    <AuthStateContext.Provider value={auth}>
      {children}
    </AuthStateContext.Provider>
  );
};
