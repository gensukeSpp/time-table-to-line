import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";


import { fetchEventsDataForTT, fetchEventsData, fetchAuthResponse, refresh, requestGroup, requestGroupMember } from "./fetch";
import { eventKeys, authKeys } from "./cache";
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

// Data not recalculated
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
      start: item.start = new Date(item.start ?? new Date()),
      end: item.end = new Date(item.end ?? new Date()),
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
      start: item.start = new Date(item.start ?? new Date()),
      end: item.end = new Date(item.end ?? new Date()),
    })), [data])
  }
}

export const useEventsQueryForTL = () => {
  const { data: searchQueryToken } = useSearchQuery('token');
  
  const { data, ...queryInfo } = useQuery({
    queryKey: eventKeys.all(),
    queryFn: () => fetchEventsData(searchQueryToken!)
  });
  return {
    ...queryInfo,
    data: useMemo(() => Array.isArray(data) ? data.map(item => ({
      ...item,
      start: item.start = new Date(item.start ?? new Date()),
      end: item.end = new Date(item.end ?? new Date()),
      start_time: item.start_time = new Date(item.start ?? new Date()),
      end_time: item.end_time = new Date(item.end ?? new Date()),
    })) : [], [data])
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
