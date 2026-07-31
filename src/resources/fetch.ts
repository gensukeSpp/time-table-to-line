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
  const authResponse = await basicAxios.post<AuthInfoProp>('/timetable/inquiry', postToken,
	{
			headers: {
        'Access-Control-Allow-Origin': '*',
        'Authorization': `Bearer ${postToken}`,
        'credentials': 'include' // ここを追加。
        }
		}
  );
	console.log(`Auth header: ${JSON.stringify(authResponse)}`);
	return authResponse;
};

export const refresh = async (_prev: string): Promise<AxiosResponse<AuthInfoProp>> => {
  const response = await basicAxios.post<AuthInfoProp>('/refresh',
	{
			headers: {
        'Access-Control-Allow-Origin': '*',
        'Authorization': `Bearer ${_prev}`,
        'credentials': 'include' // ここを追加。
        }
		});
  return response;
};

export const requestGroup = async (postToken: string)
	: Promise<AxiosResponse<string[]>> =>	{
  const groupNameResp = await basicAxios.post<string[]>('/group-names', postToken,
	{
			headers: {
        'Access-Control-Allow-Origin': '*',
        'Authorization': `Bearer ${postToken}`,
        'credentials': 'include' // ここを追加。
        }
		});
		return groupNameResp;
}

export const requestGroupMember = async (postToken: string): Promise<AxiosResponse<GroupUserProps[]>> => {
  const groupUsers = await basicAxios.post<GroupUserProps[]>('/group/users', postToken,
	{
			headers: {
        'Access-Control-Allow-Origin': '*',
        'Authorization': `Bearer ${postToken}`,
        'credentials': 'include' // ここを追加。
        }
		});
		return groupUsers;
}
