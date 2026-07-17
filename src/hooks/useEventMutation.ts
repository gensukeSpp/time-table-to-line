import { useMutation, useQueryClient } from "@tanstack/react-query";

import basicAxios from "../lib/AuthInfo";
import { PickDate, TimelineEventProps } from "../lib/TimelineType";
import { eventKeys, useEventCache } from "../resources/cache";

// ⑦ mutationFn
// export const mutation = {
//   createTodo: (request: PostTodoRequest) => {
//     return todoApi.postTodo(request);
//   },
// };

export const useCreateMutation = () => {
  const eventCache = useEventCache();

  return useMutation({
    mutationFn: (timelineEvent: TimelineEventProps) =>
      basicAxios.post('/event/add', timelineEvent),
    // onError: (error) => {
    //   console.log(`error!: ${error}`);
    // },
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
    // 一回引っかかって、ここで終了してしまう
    // onError: (error) => {
    //   console.log(`error!: ${error}`);
    // },
    onSettled: () => {
      console.log('サクセス通ってます');
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
    onError: (error) => console.log(`error!: ${error}`),
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
    // 一回引っかかって、ここで終了してしまう
    // onError: (error, variables) => {
    //   console.log(`error!: ${error}`);
    //   console.log(`variables: ${JSON.stringify(variables)}, context: prevEventsと同じよ`)
    // },
    onSettled: (data, error) => {
      console.log(`Mutation data: ${JSON.stringify(data)}`);
      console.log(`Mutation error: ${error}`);
      eventCache.invalidateList();
    }
  });
}

const useUpdateDateMutation = (targetId: number | string) => {
  const queryClient = useQueryClient();
  const eventCache = useEventCache();

  return useMutation({
    mutationFn: (timeBelt: PickDate) => 
      basicAxios.post(`/date/update/${targetId}`, timeBelt),
    onMutate: (newDate) => {
      const prevEvents = queryClient.getQueryData(eventKeys.detail(targetId));
      queryClient.setQueryData(eventKeys.detail(targetId),
        newDate
      );
      return { prevEvents };
    },
    onError: (error, variables, context) => {
      console.log(`error!: ${error}`);
      console.log(`variables: ${variables}, context: ${JSON.stringify(context)}`)
    },
    onSuccess: () => {
      eventCache.invalidateDetail(targetId);
    }
  });
}
