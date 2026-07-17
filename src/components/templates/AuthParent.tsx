import { ReactNode, createContext } from "react";
import { useLocation } from 'react-router-dom';

import { AuthInfoProp } from "../../lib/TimelineType";
import { AuthStateContext } from "../../hooks/useContextFamily";
import { useSearchQuery } from "../../resources/queries";

export const AuthProvider = ({ children }: { children: ReactNode }) => {

  // const [token, setToken] = useState<TokenProp>({
  //   accessToken: '0123456789abcdef'
  // });
  // const [auth, dispatch] = useReducer(useAuthReducer, '');
  // 状態保持ができません！
  // const search = useLocation().search;
  // const query = new URLSearchParams(search);
  const { data } = useSearchQuery('token');
  console.log(`Parent context token: ${data}`);
  const _auth: AuthInfoProp = { accessToken: data!, type: 'token' }

  return (
    <AuthStateContext.Provider value={_auth}>
      {/* <AuthDispatchContext.Provider value={dispatch}> */}
      {children}
      {/* </AuthDispatchContext.Provider> */}
    </AuthStateContext.Provider>
  );
};

// export default AuthProvider;
