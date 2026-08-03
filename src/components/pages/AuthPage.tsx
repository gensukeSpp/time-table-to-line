import { useEffect } from "react";
import { useNavigate } from 'react-router-dom';

import { useAuthQuery } from "../../resources/queries";
import { useAuthContext } from "../../hooks/useContextFamily";
import { normalizeAuthPayload } from "../../lib/authPayload";

export const AuthLeavePage = () => {
  const authContext = useAuthContext();
  const tokenContext = authContext.type === 'token' ? authContext.accessToken : undefined;

  const { data, isPending, isError, error, isFetching } = useAuthQuery(tokenContext ?? '');
  // console.log(`とりあえず結果のID: ${JSON.stringify(data?.data)}`);
  // console.log(`とりあえず結果のerr: ${error}`);

  const navigate = useNavigate();

  const payload = normalizeAuthPayload(data?.data);

  // URL にトークンがのこるため、(一時)不採用
  // useEffect(() => {
  //   if (!payload || !tokenContext) return;

  //   // token を残さないと AuthProvider / Axios が認証ヘッダを付けられなくなる
  //   const params = new URLSearchParams({
  //     userID: String(payload.staff_id),
  //     token: tokenContext,
  //   });
  //   navigate(`/calendar?${params.toString()}`);
  // }, [payload, tokenContext, navigate]);

  useEffect(() => {
    if (!payload) return;
    navigate(`/calendar?userID=${payload.staff_id}`);
  }, [payload, navigate]);

  if (!tokenContext) {
    return (
      <div>
        <p>トークンがありません。URL に ?token=... を付けてアクセスしてください。</p>
      </div>
    );
  }

  if (isPending || isFetching) {
    return (
      <div>ユーザー情報を照合しています
        <p>しばらくお待ちください</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <p>認証に失敗しました。トークンの有効期限やバックエンドの起動を確認してください。</p>
        <p>{error instanceof Error ? error.message : String(error)}</p>
      </div>
    );
  }

  if (!payload) {
    return (
      <div>
        <p>認証レスポンスからスタッフ ID を取得できませんでした。</p>
      </div>
    );
  }

  return null;
};
