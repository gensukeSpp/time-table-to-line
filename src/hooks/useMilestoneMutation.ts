import { useMutation } from "@tanstack/react-query";

import basicAxios from "../lib/AuthInfo";
import { useMilestoneCache } from "../resources/cache";

export interface MilestoneFormValues {
  title: string;
  description?: string;
  guidline_end_date?: string; // 'yyyy-MM-dd'
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
