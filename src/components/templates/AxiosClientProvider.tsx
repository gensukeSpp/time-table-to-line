import { AxiosError, AxiosResponse } from "axios";
import { ReactNode, useEffect } from "react";

import { useAuthContext } from '../../hooks/useContextFamily';
import basicAxios from "../../lib/AuthInfo";
import { useRefreshQuery } from "../../resources/queries";

export const AuthAxios = ({children}: {children: ReactNode}) => {
  const authContext = useAuthContext();
    const tokenContext = authContext.type === 'token' ? authContext.accessToken : undefined;

    const newAccessToken = useRefreshQuery();

  useEffect(() => {
    // リクエスト前に実行。headerに認証情報を付与する
    const requestIntercept = basicAxios.interceptors.request.use(
      (config) => {
        if (config.headers["Authorization"] !== `Bearer ${null}`) {
          config.headers["Authorization"] = `Bearer ${tokenContext}`;
        } else {
          config.headers["Authorization"] = `Bearer ${newAccessToken.data}`;
        }
        return config;
      },
      (error: AxiosError) => Promise.reject(error)
      );

    // レスポンスを受け取った直後に実行。もし認証エラーだった場合、再度リクエストする。
    const responseIntercept = basicAxios.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        const prevRequest = error.config;
        // 403認証エラー(headerにaccess_tokenがない。もしくはaccess_tokenが無効)
        if (error?.response?.status === 403) {
          prevRequest!.headers["Authorization"] = await `Bearer ${newAccessToken.data}`;
          // 再度実行する
          return basicAxios(prevRequest!);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      // 離脱するときにejectする
      basicAxios.interceptors.request.eject(requestIntercept);
      basicAxios.interceptors.response.eject(responseIntercept);
    };
  }, [authContext]);

  return (
    <>
      {children}
    </>
  );
};
