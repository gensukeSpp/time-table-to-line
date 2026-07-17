import { useAuthContext } from "../hooks/useContextFamily";
import { useAuthQuery } from '../resources/queries';
import { AuthInfoProp } from '../lib/TimelineType';

export const useAuthInfo = () => {
  const authContext = useAuthContext();
  const tokenContext = authContext.type === 'token' ? authContext.accessToken : undefined;  
  
  const { data } = useAuthQuery(tokenContext!);

  const strData = JSON.stringify(data?.data);
  // パターン 1
  const objValue = JSON.parse(strData);
  // console.log(`Json type: ${typeof objValue.staff_id}, ${typeof objValue.group_id}`);
  const guard: AuthInfoProp = {
    authId: objValue.staff_id, code: objValue.group_id, group: objValue.group_name, type: 'auth'
  } as const;

  return guard;
}
