import { useMutation } from "@tanstack/react-query";

import basicAxios from "../lib/AuthInfo";
import { useMilestoneCache } from "../resources/cache";

export interface MilestoneFormValues {
  title: string;
  description?: string;
  guideline_end_date?: string; // 'yyyy-MM-dd'
}

export const useAddMilestoneMutation = () => {
  const milestoneCache = useMilestoneCache();

  return useMutation({
    mutationFn: (m: MilestoneFormValues) =>
      basicAxios.post('/milestone/add', m),
    onSuccess: () => {
      milestoneCache.invalidateMilestoneList();
    }
  });
}

export interface MilestoneUpdateFormValues {
  title: string;
  description?: string;
  guideline_end_date?: string | null;
  accomplished_date?: string | null;
}

export const useUpdateMilestoneMutation = () => {
  const milestoneCache = useMilestoneCache();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: MilestoneUpdateFormValues }) =>
      basicAxios.post(`/milestone/update/${id}`, body),
    onSuccess: () => milestoneCache.invalidateMilestoneList(),
  });
};

export const useRemoveMilestoneMutation = () => {
  const milestoneCache = useMilestoneCache();
  return useMutation({
    mutationFn: (id: number) => basicAxios.delete(`/milestone/remove/${id}`),
    onSuccess: () => milestoneCache.invalidateMilestoneList(),
  });
};
