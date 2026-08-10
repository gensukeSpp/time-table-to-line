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
    // search を key に含めないと、別 URL の値がキャッシュで残る
    queryKey: [...authKeys.search(searchKey), search],
    queryFn: () => query.get(searchKey),
  });
}

export const useRefreshQuery = () => {
  const authContext = useAuthContext();
  const tokenContext = authContext.type === 'token' ? authContext.accessToken : undefined;  
  
  return useQuery({
    queryKey: authKeys.verify(tokenContext ?? ''),
    queryFn: () => refresh(tokenContext!),
    enabled: !!tokenContext,
  });
}

export const useAuthQuery = (authToken: string) => {
  return useQuery({
    queryKey: authKeys.verify(authToken),
    queryFn: () => fetchAuthResponse(authToken),
    enabled: !!authToken,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

// Data not recalculated
// https://github.com/TanStack/query/issues/1580
type EventQueryOptions = {
  forTimeline?: boolean;
};

export const useEventsQuery = (options?: EventQueryOptions) => {
  const { data: searchQueryToken } = useSearchQuery('token');
  
  const { data, ...queryInfo } = useQuery({
    queryKey: eventKeys.all(),
    queryFn: () => fetchEventsData(searchQueryToken!)
  });
  return {
    ...queryInfo,
    data: useMemo(() => Array.isArray(data) ? data.map(item => {
      const base = {
        ...item,
        admin: item.admin ?? false,
        start: new Date(item.start ?? new Date()),
        end: new Date(item.end ?? new Date()),
      };
      if (options?.forTimeline) {
        return {
          ...base,
          start_time: new Date(item.start ?? new Date()),
          end_time: new Date(item.end ?? new Date()),
        };
      }
      return base;
    }) : [], [data, options?.forTimeline])
  };
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
      admin: item.admin ?? false,
      start: new Date(item.start ?? new Date()),
      end: new Date(item.end ?? new Date()),
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
