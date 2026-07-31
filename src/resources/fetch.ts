import { AxiosResponse } from "axios";

import { AuthInfoProp, GroupUserProps, TimelineEventProps } from "../lib/TimelineType";
import basicAxios from "../lib/AuthInfo";

export const fetchEventsData = async (_postToken: string): Promise<TimelineEventProps[]> => {
	const { data } = await basicAxios.request<TimelineEventProps[]>({
		url: '/event/all',
		method: 'GET',
	});
		return data;
}

export const fetchEventsDataForTT = async (_postToken: string): Promise<TimelineEventProps[]> => {
	const { data } = await basicAxios.request<TimelineEventProps[]>({
		url: '/event/user',
		method: 'GET',
	});
		return data;
}

export const fetchAuthResponse = async (postToken: string): Promise<AxiosResponse<AuthInfoProp>> => {
  const authResponse = await basicAxios.post<AuthInfoProp>('/timetable/inquiry', postToken);
	return authResponse;
};

export const refresh = async (_prev: string): Promise<AxiosResponse<AuthInfoProp>> => {
  const response = await basicAxios.post<AuthInfoProp>('/refresh');
  return response;
};

export const requestGroup = async (postToken: string)
	: Promise<AxiosResponse<string[]>> =>	{
  const groupNameResp = await basicAxios.post<string[]>('/group-names', postToken);
		return groupNameResp;
}

export const requestGroupMember = async (postToken: string): Promise<AxiosResponse<GroupUserProps[]>> => {
  const groupUsers = await basicAxios.post<GroupUserProps[]>('/group/users', postToken);
		return groupUsers;
}
