import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from './AuthParent';
import { EventsContextProvider } from './EventsParent';
import { AuthLeavePage } from '../pages/AuthLeaveComponent';
import { AuthAxios } from "./AxiosClientProvider";
// import { OnSelectSlot } from "../../sample/SelectSlot";
import { CalendarWrapper } from "../pages/CalendarWrapperComponent";
import { MyHorizonTimeline } from "../pages/TimelineComponent";

export const RoutesComponent = () => {
  
  return (
    <>
      <AuthProvider>
        <AuthAxios>
          <EventsContextProvider>
            {/* <BrowserRouter> */}
              <Routes>
                <Route path="/auth" element={<AuthLeavePage />} />
                <Route path="/calendar"	element={<CalendarWrapper />} />
                <Route path="/timeline" element={<MyHorizonTimeline />} />
                {/* <Route path="/slot" element={<OnSelectSlot />} /> */}
              </Routes>
            {/* </BrowserRouter> */}
            {/* <OnSelectSlot /> */}
          </EventsContextProvider>
        </AuthAxios>
      </AuthProvider>
    </>
  );
}
