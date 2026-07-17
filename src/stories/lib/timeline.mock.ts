import { fn } from "@storybook/test";

import * as tlFunc from "../../lib/TmelineData"

export const groupMockMember = fn(tlFunc.getGroup).mockName('groupMember');
export const eventsStateMock = fn(tlFunc.getItems).mockName('eventsState');
