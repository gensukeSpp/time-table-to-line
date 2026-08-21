import { Routes, Route } from "react-router-dom";

import { AuthProvider } from './AuthParent';
import { EventsContextProvider } from './EventsParent';
import { AuthLeavePage } from '../pages/AuthPage';
import { AuthAxios } from './AxiosClientProvider';
import { CalendarWrapper } from '../pages/CalendarPage';
import { GroupHorizonTimeline } from '../pages/TimelinePage';

export const RoutesComponent = () => {
  
  return (
    <>
      <AuthProvider>
        <AuthAxios>
          <EventsContextProvider>
              <Routes>
                <Route path="/auth" element={<AuthLeavePage />} />
                <Route path="/calendar"	element={<CalendarWrapper />} />
                <Route path="/timeline" element={<GroupHorizonTimeline />} />
              </Routes>
          </EventsContextProvider>
        </AuthAxios>
      </AuthProvider>
    </>
  );
}
