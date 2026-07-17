import { Calendar } from "react-big-calendar";
import localizer from "../lib/Localization";
import { exItems } from "../lib/SampleState";

export const DummyCalendar = () => {

  return (
    <div>
      <Calendar
        localizer={localizer}
        events={exItems}
      />
    </div>
  )
}
