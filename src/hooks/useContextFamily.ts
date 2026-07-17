import { useContext, createContext } from "react";

import { AuthInfoProp, TimelineEventProps } from "../lib/TimelineType";

export type TimelineEventPropsList = TimelineEventProps[]

// * State専用 Context *
// 今後 Providerを使わない時にはContextの値がundefinedになる必要があるので, 
// Contextの値がEventsにもundefinedにもできるように宣言してください。
export const EventsStateContext = createContext<TimelineEventPropsList | undefined>(undefined);
export const AuthStateContext = createContext<AuthInfoProp | undefined>(undefined);

export function useEventsState() {
  const state = useContext(EventsStateContext);
  if (!state) throw new Error('EventProvider not found');
  return state;
}

export function useAuthContext() {
  const auth = useContext(AuthStateContext);
  if (!auth) throw new Error('AuthProvider not found');
  return auth;
}
