import { useAuthContext } from "../hooks/useContextFamily";
import { useAuthQuery } from '../resources/queries';
import { AuthInfoProp } from '../lib/TimelineType';
import { normalizeAuthPayload } from '../lib/authPayload';

export const useAuthInfo = (): AuthInfoProp => {
  const authContext = useAuthContext();
  const tokenContext = authContext.type === 'token' ? authContext.accessToken : undefined;

  const { data } = useAuthQuery(tokenContext ?? '');

  const payload = normalizeAuthPayload(data?.data);

  if (payload) {
    return {
      authId: payload.staff_id,
      code: payload.group_id,
      group: payload.group_name,
      type: 'auth',
    };
  }

  return { type: 'token', accessToken: tokenContext ?? '' };
};
