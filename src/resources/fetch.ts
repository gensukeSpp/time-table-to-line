import { AxiosResponse } from "axios";

import { AuthInfoProp, GroupUserProps, TimelineEventProps } from "../lib/TimelineType";
// import { AuthGuardContext } from "../components/templates/AuthParent";
import basicAxios from "../lib/AuthInfo";

export const fetchEventsData = async (postToken: string): Promise<TimelineEventProps[]> => {
	const { data } = await basicAxios.request<TimelineEventProps[]>({
		url: '/event/all',
		method: 'GET',
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Authorization': `Bearer ${postToken}`,
			'credentials': 'include' // ここを追加。
		}
	});
	console.log(`Event fetch all: ${JSON.stringify(data)}`);
	return data;
	// .then(res => console.log(res))
	// .catch(err => console.log(err));
}

export const fetchEventsDataForTT = async (postToken: string): Promise<TimelineEventProps[]> => {
	const { data } = await basicAxios.request<TimelineEventProps[]>({
		url: '/event/user',
		method: 'GET',
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Authorization': `Bearer ${postToken}`,
			'credentials': 'include' // ここを追加。
		}
	});
	console.log(`Event fetch user: ${JSON.stringify(data)}`);
	return data;
}

// とりあえず、値が取れるからこっち採用
const cache = new Map();

export const fetchAuthResponse = async (postToken: string): Promise<AxiosResponse<AuthInfoProp>> => {
  const authResponse = await basicAxios.post<AuthInfoProp>('/timetable/inquiry', postToken,
		{
			headers: {
			'Access-Control-Allow-Origin': '*',
			'Authorization': `Bearer ${postToken}`,
			'credentials': 'include' // ここを追加。
			}
		});
	// if (!cache.has(postToken)) {
  //   cache.set(postToken, authResponse);
  // }
  // const authCacheData: AuthInfoProp = cache.get(authResponse);
	console.log(`Auth header: ${JSON.stringify(authResponse)}`);
  return authResponse;
};

export const refresh = async (prev: string): Promise<AxiosResponse<string>> => {
  const response = await basicAxios.post<string>('/refresh', {
    headers: {
			'Access-Control-Allow-Origin': '*',
			'Authorization': `Bearer ${prev}`,
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
				'credentials': 'include'
			}
		});
	console.log(`Group fetch data: ${JSON.stringify(groupNameResp)}`);
	return groupNameResp;
}

export const requestGroupMember = async (postToken: string): Promise<AxiosResponse<GroupUserProps[]>> => {
  const groupUsers = await basicAxios.post<GroupUserProps[]>('/group/users', postToken,
		{
			headers: {
			'Access-Control-Allow-Origin': '*',
			'Authorization': `Bearer ${postToken}`,
			'credentials': 'include'
		}
	});
	console.log(`Group fetch data: ${JSON.stringify(groupUsers)}`);
	return groupUsers;
}
