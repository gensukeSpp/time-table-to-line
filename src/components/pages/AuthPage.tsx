import { useEffect } from "react";
import { useNavigate } from 'react-router-dom';

import { useAuthQuery } from "../../resources/queries";
import { useAuthContext } from "../../hooks/useContextFamily";

export const AuthLeavePage = () => {
  const authContext = useAuthContext();
  const tokenContext = authContext.type === 'token' ? authContext.accessToken : undefined;  
  
  const { data, isPending } = useAuthQuery(tokenContext!);
  const navigate = useNavigate();

  const strData = JSON.stringify(data?.data);

  useEffect(() => {
    const f = async () => {
      if (data) {
        navigate(`/calendar?userID=${JSON.parse(strData).staff_id}`);
      }
    }
    f();
  }, [data]);

  return (
    <>
      {isPending && <div>ユーザー情報を照合しています
        <p>だいぶお待ちください</p>
      </div>}
    </>
  );
};
