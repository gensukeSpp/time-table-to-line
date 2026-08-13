import { AxiosResponse } from "axios";

import { AuthInfoProp, GroupUserProps, TimelineEventProps } from "../lib/TimelineType";
import basicAxios, { postHeaders } from "../lib/AuthInfo";
// import { _ } from "vitest/dist/chunks/reporters.d.BuRON0I0.js";

export const fetchEventsData = async (_postToken: string): Promise<TimelineEventProps[]> => {
	const { data } = await basicAxios.request<TimelineEventProps[]>({
		url: '/event/all',
		method: 'GET',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': `Bearer ${_postToken}`,
    },
    withCredentials: true,
	});
  return data;
  // const response = await basicAxios.post<TimelineEventProps[]>('/event/all', await postHeaders(_postToken));
  // return response;
}

export const fetchEventsDataForTT = async (_postToken: string): Promise<TimelineEventProps[]> => {
	const { data } = await basicAxios.request<TimelineEventProps[]>({
		url: '/event/user',
		method: 'GET',
	});
  return data;
}

export const fetchAuthResponse = async (postToken: string): Promise<AxiosResponse<AuthInfoProp>> => {
  const authResponse = await basicAxios.post<AuthInfoProp>('/timetable/inquiry', postToken, await postHeaders(postToken));
  return authResponse;
};

export const refresh = async (_prev: string): Promise<AxiosResponse<AuthInfoProp>> => {
  const response = await basicAxios.post<AuthInfoProp>('/refresh', await postHeaders(_prev));
  return response;
};

export const requestGroup = async (postToken: string)
	: Promise<AxiosResponse<string[]>> =>	{
  const groupNameResp = await basicAxios.post<string[]>('/group-names', postToken, await postHeaders(postToken));
  return groupNameResp;
}

export const requestGroupMember = async (postToken: string): Promise<AxiosResponse<GroupUserProps[]>> => {
  const groupUsers = await basicAxios.post<GroupUserProps[]>('/group/users', postToken, await postHeaders(postToken));
  return groupUsers;
}
