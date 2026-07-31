import { Component } from "react";
import { Calendar } from "react-big-calendar";
import { addDays } from 'date-fns';

import localizer from "./lib/Localization";

import "./App.css";
import "react-big-calendar/lib/css/react-big-calendar.css";

class App extends Component {
  state = {
    events: [
      {
        start: new Date(),
        end: addDays(new Date(), 1),
        title: "Some title"
      }
    ]
  };

  render() {
    return (
      <div className="App">
        <Calendar
          localizer={localizer}
          defaultDate={new Date()}
          defaultView="month"
          events={this.state.events}
          style={{ height: "100vh" }}
        />
      </div>
    );
  }
}

export default App;