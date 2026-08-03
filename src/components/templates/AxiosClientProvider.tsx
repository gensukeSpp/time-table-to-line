import {
  AxiosError,
  AxiosHeaders,
  AxiosResponse,
  InternalAxiosRequestConfig,
  type AxiosRequestConfig,
} from "axios";
import { ReactNode, useEffect } from "react";

import { useAuthContext } from '../../hooks/useContextFamily';
import basicAxios from "../../lib/AuthInfo";
import { useRefreshQuery } from "../../resources/queries";

// /refresh エンドポイントが返すトークン情報。
// fetch.ts の refresh() は AxiosResponse<AuthInfoProp> を返すよう宣言されているが、
// 実際のレスポンスボディはアクセストークン文字列、または { access_token | accessToken } である。
// 型の不整合は別 PR で解消するため、ここでは境界で一度だけ型を絞り込む。
const extractTokenFromRefresh = (payload: unknown): string | undefined => {
  if (typeof payload === "string") return payload;
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (typeof obj.access_token === "string") return obj.access_token;
    if (typeof obj.accessToken === "string") return obj.accessToken;
  }
  return undefined;
};

// リトライ用に _retry を付与したリクエスト設定
type RetryableRequestConfig = AxiosRequestConfig & { _retry?: boolean };

export const AuthAxios = ({ children }: { children: ReactNode }) => {
  const authContext = useAuthContext();
  const tokenContext = authContext.type === 'token' ? authContext.accessToken : undefined;

  const newAccessToken = useRefreshQuery();
  // refetch は react-query により安定参照として提供されるため、依存配列にそのまま渡せる
  const { refetch: refreshRefetch } = newAccessToken;

  // リフレッシュクエリが保持するトークンを解決し、依存配列用にプリミティブ値へ絞り込む
  const refreshToken = extractTokenFromRefresh(newAccessToken.data?.data);

  useEffect(() => {
    // リクエスト前に実行。headerに認証情報を付与する。
    // 注: インターセプター実行時の config.headers は axios により AxiosHeaders インスタンスへ
    // 正規化されているため、具体的な型へ絞り込んで set() を利用する。
    const requestIntercept = basicAxios.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // derive token from various possible shapes
        let token: string | undefined;
        if (tokenContext) token = tokenContext;
        else if (refreshToken) token = refreshToken;
        else if (typeof window !== 'undefined') {
          token = localStorage.getItem('accessToken') ?? undefined;
        }

        if (token) {
          (config.headers as AxiosHeaders).set('Authorization', `Bearer ${token}`);
        }
        return config;
      },
      (error: AxiosError) => Promise.reject(error)
    );

    // レスポンスを受け取った直後に実行。もし認証エラーだった場合、リフレッシュを試みて再実行する。
    const responseIntercept = basicAxios.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        const prevRequest = error.config as RetryableRequestConfig | undefined;
        if (!prevRequest) return Promise.reject(error);
        // 403認証エラー(headerにaccess_tokenがない、もしくはaccess_tokenが無効)
        if (error?.response?.status === 403 && !prevRequest._retry) {
          prevRequest._retry = true;
          try {
            const refetchResult = await refreshRefetch?.();
            const refreshed = extractTokenFromRefresh(refetchResult?.data?.data);

            if (refreshed) {
              (prevRequest.headers as AxiosHeaders).set('Authorization', `Bearer ${refreshed}`);
              // 再度実行する
              return basicAxios(prevRequest);
            }
          } catch {
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
  }, [tokenContext, refreshToken, refreshRefetch]);

  return (
    <>
      {children}
    </>
  );
};
