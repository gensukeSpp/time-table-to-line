import { useMemo } from "react";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { AxiosError, AxiosResponse } from "axios";
import { useLocation } from "react-router-dom";
import moment from 'moment';

import { TimelineEventProps, AuthInfoProp, AuthGuardContext } from "../lib/TimelineType";
import { fetchEventsDataForTT, fetchEventsData, fetchAuthResponse, refresh, requestGroup, requestGroupMember } from "./fetch";
import { eventKeys, authKeys, useAuthCache } from "./cache";
import { useAuthContext } from "../hooks/useContextFamily";

export const useSearchQuery = (searchKey: string) => {
  const search = useLocation().search;
  const query = new URLSearchParams(search);

  return useQuery({
    queryKey: authKeys.search(searchKey),
    queryFn: () => query.get(searchKey)
  });
}

export const useRefreshQuery = () => {
  const authContext = useAuthContext();
  const tokenContext = authContext.type === 'token' ? authContext.accessToken : undefined;  
  
  return useQuery({
    queryKey: authKeys.verify(tokenContext!),
    queryFn: () => refresh(tokenContext!)
  });
}

export const useAuthQuery = (authToken: string) => {
  return useQuery({
    queryKey: authKeys.verify(authToken),
    queryFn: () => fetchAuthResponse(authToken),
  });
}
    // 以下は恐ろしいことに…
  // const [tokenState, setTokenState] = useState<TokenProp>();
  // setTokenState({...tokenContext, accessToken: query.get('token')!});
  // const [state, dispatch] = useReducer((state: TokenProp, newState: Partial<TokenProp>) => ({ ...state, ...newState }),
  //   { accessToken: '' }
  // );
  // dispatch({accessToken: query.get('token')!});

// Data not recalculated when select function changes #1580
// https://github.com/TanStack/query/issues/1580
export const useEventsQuery = () => {
  // JavaScript の分割代入で変数名を変更する
  // https://qiita.com/masachoco/items/601b6771021bde2311f8
  const { data: searchQueryToken } = useSearchQuery('token');
  
  const { data, ...queryInfo } = useQuery({
    queryKey: eventKeys.all(),
    queryFn: () => fetchEventsData(searchQueryToken!)
  })
  return {
    ...queryInfo,
    data: useMemo(() => data?.map(item => ({
      ...item,
      // That's point! "="
      // 日本標準時
      start: item.start = moment(item.start).toDate(),
      end: item.end = moment(item.end).toDate(),
      // summary: item.summary = 'sheep',
      // ...item
    })), [data])
  }
}

export const useUserEventsQuery = () => {
  const { data: searchQueryToken } = useSearchQuery('token');
  
  const { data, ...queryInfo } = useQuery({
    queryKey: eventKeys.user(),
    queryFn: () => fetchEventsDataForTT(searchQueryToken!)
  })
  return {
    ...queryInfo,
    data: useMemo(() => data?.map(item => ({
      ...item,
      // 日本標準時
      start: item.start = moment(item.start).toDate(),
      end: item.end = moment(item.end).toDate(),
      // summary: item.summary = 'sheep',
      // ...item
    })), [data])
  }
}

export const useEventsQueryForTL = () => {
  const { data: searchQueryToken } = useSearchQuery('token');
  
  const { data, ...queryInfo } = useQuery({
    queryKey: eventKeys.all(),
    queryFn: () => fetchEventsData(searchQueryToken!)
  });
  // return { data, queryInfo }
  return {
    ...queryInfo,
    data: useMemo(() => data?.map(item => ({
      ...item,
      // 日本標準時
      start: item.start = moment(item.start).toDate(),
      end: item.end = moment(item.end).toDate(),
      start_time: item.start_time = moment(item.start),//.add(9, 'hours'),
      end_time: item.end_time = moment(item.end)//.add(9, 'hours'),
      // item
    })), [data])
  }
}

export const useGroupUsersQuery = () => {
  const authContext = useAuthContext();
  const tokenContext = authContext.type === 'token' ? authContext.accessToken : undefined;  

  return useQuery({
    queryKey: eventKeys.userList(),
    queryFn: () => requestGroupMember(tokenContext!),
  });
}

export const useGroupNameQuery = () => {
  const authContext = useAuthContext();
  const tokenContext = authContext.type === 'token' ? authContext.accessToken : undefined;  

  return useQuery({
    queryKey: eventKeys.groupNames(),
    queryFn: () => requestGroup(tokenContext!)
  })
}

// const useAllQuery = <TData = TimelineEventProps[]>(
//   options?: Omit<
//     UseQueryOptions<TimelineEventProps[], AxiosError, TData, typeof eventKeys.all>,
//     "queryKey" | "queryFn"
//   >
// ) => {
//   return useQuery({queryKey: eventKeys.all, queryFn: fetchEventsData, ...options});
// };

type UtilOption<TData = TimelineEventProps[]> = {
  options?: Omit<
    UseQueryOptions<TimelineEventProps[], AxiosError, TData, [string, (Record<string, unknown> | string)?]>,
    "queryKey" | "queryFn"
  >
}

// export const useApi = <
//   TQueryKey extends [string, (Record<string, unknown> | string)?],
//   TQueryFnData,
//   TError,
//   TData = TQueryFnData,
// >(
//   queryKey: TQueryKey,
//   fetcher: (params: TQueryKey[1], token: string) => Promise<TQueryFnData>,
//   options?: Omit<
//     UseQueryOptions<unknown, TError, TData, TQueryKey>,
//     'queryKey' | 'queryFn'
//   >,
// ) => {
//   // accessTokenを何らかの形で取得する
//   const { accessToken } = useAuthGuardContext();

//   return useQuery({
//     queryKey,
//     queryFn: async () => fetcher(queryKey[1], accessToken || ''),
//     ...options,
//   });
// };
