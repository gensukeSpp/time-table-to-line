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
        const token = tokenContext ?? newAccessToken.data?.data?.access_token ?? newAccessToken.data?.accessToken ?? (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : undefined);
        if (token) {
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${token}`,
          };
        }
        return config;
      },
      (error: AxiosError) => Promise.reject(error)
    );

    // レスポンスを受け取った直後に実行。もし認証エラーだった場合、リフレッシュを試みて再実行する。
    const responseIntercept = basicAxios.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        const prevRequest = (error.config as any);
        if (!prevRequest) return Promise.reject(error);
        // 403認証エラー(headerにaccess_tokenがない、もしくはaccess_tokenが無効)
        if (error?.response?.status === 403 && !prevRequest._retry) {
          prevRequest._retry = true;
          try {
            await newAccessToken.refetch?.();
            const refreshed = newAccessToken.data?.data?.access_token ?? newAccessToken.data?.accessToken ?? (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : undefined);
            if (refreshed) {
              prevRequest.headers = {
                ...prevRequest.headers,
                Authorization: `Bearer ${refreshed}`,
              };
              // 再度実行する
              return basicAxios(prevRequest);
            }
          } catch (e) {
            return Promise.reject(error);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      // 離脱するときにejectする
      basicAxios.interceptors.request.eject(requestIntercept);
      basicAxios.interceptors.response.eject(responseIntercept);
    };
  }, [authContext, tokenContext, newAccessToken.data]);

  return (
    <>
      {children}
    </>
  );
};