import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

// ① Query Key
// queries.ts がある場合に必要に応じて宣言
export const eventKeys = {
  event: ["event"] as const,
  all: () => ["event", "all"] as const,
  groupEvents: () => ["group", "all"] as const,
  groupNames: () => ["groupNames"] as const,
  detail: (id: number | string) => ["event", "detail", id] as const,
  user: () => ["event", "user"] as const,
  userList: () => ["group", "users"] as const,
  dateList: (ids: number[] | string[]) => ["date", "update", ids] as const
  // dateList: (objs: PickDate[]) => ["listDate", objs] as const
};

export const authKeys = {
  auth: ["auth"] as const,
  search: (searchKey: string) => [...authKeys.auth, "search", {searchKey}] as const,
  verify: (token: string) => [...authKeys.auth, "inquiry", {token}] as const
}
// ② キャッシュ操作のためのカスタムフック
// mutations.ts がある場合に必要に応じて宣言
export function useEventCache() {
  const queryClient = useQueryClient();

  return useMemo(
    () => ({
      invalidateList: () => queryClient.invalidateQueries({queryKey: eventKeys.all()}),
      invalidGroupList: () =>
        queryClient.invalidateQueries({queryKey: eventKeys.groupEvents()}),
      invalidateDetail: (id: number | string) =>
        queryClient.invalidateQueries({queryKey: eventKeys.detail(id)}),
      invalidateUser: () => queryClient.invalidateQueries({queryKey: eventKeys.user()}),
      invalidateGroupUserList: () => 
        queryClient.invalidateQueries({queryKey: eventKeys.userList()})
    }),
    [queryClient]
  );
}

export const useAuthCache = () => {
  const queryClient = useQueryClient();

  return useMemo(() => ({
    invalidateSearch: (searchKey: string) =>
      queryClient.invalidateQueries({queryKey: authKeys.search(searchKey)}),
    invalidateVerify: (token: string) =>
      queryClient.invalidateQueries({queryKey: authKeys.verify(token)})
  }), [queryClient]);
}
