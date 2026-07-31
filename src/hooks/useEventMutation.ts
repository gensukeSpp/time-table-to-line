import { useMutation, useQueryClient } from "@tanstack/react-query";

import basicAxios from "../lib/AuthInfo";
import { TimelineEventProps } from "../lib/TimelineType";
import { eventKeys, useEventCache } from "../resources/cache";

export const useCreateMutation = () => {
  const eventCache = useEventCache();

  return useMutation({
    mutationFn: (timelineEvent: TimelineEventProps) =>
      basicAxios.post('/event/add', timelineEvent),
    onSuccess: () => {
      eventCache.invalidateList();
    }
  });
}

export const useDeleteMutation = (targetId: number | string) => {
  const eventCache = useEventCache();

  return useMutation({
    mutationFn: () =>
      basicAxios.delete(`/event/remove/${targetId}`),
    onSettled: () => {
      
      // targetIdはユーザーじゃない❗
      eventCache.invalidateList();
    }
  });
}

export const useUpdateEventMutation = (targetId: number | string) => {
  const queryClient = useQueryClient();
  const eventCache = useEventCache();

  return useMutation({
    mutationFn: (timelineEvent: TimelineEventProps) =>
      basicAxios.post(`/event/update/${targetId}`, timelineEvent),
    onMutate: (timelineEvent) => {
      queryClient.setQueryData(eventKeys.detail(targetId), timelineEvent);
    },
    onSuccess: () => {
      // targetIdはユーザーじゃない❗
      eventCache.invalidateList();
    },
  });
}

export const useUpdateDateListMutation = (targetIds: string[]) => {
  const queryClient = useQueryClient();
  const eventCache = useEventCache();

  return useMutation({
    mutationFn: (timeBeltArray: TimelineEventProps[]) => 
      basicAxios.post(`/date/update`, {
        data: timeBeltArray
      }),
    onMutate: (newDate) => {
      const prevEvents = queryClient.getQueryData(eventKeys.all());
      queryClient.setQueryData(eventKeys.dateList(targetIds),
        newDate
      );
      return { prevEvents };
    },
    onSettled: () => {
      eventCache.invalidateList();
    }
  });
}


