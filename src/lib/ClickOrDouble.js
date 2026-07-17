import { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [clicks, setClicks] = useState(0);

  useEffect(() => {
    let singleClickTimer;
    if (clicks === 1) {
      singleClickTimer = setTimeout(function () {
        doSingleClickThing();
        setClicks(0);
      }, 250);
    } else if (clicks === 2) {
      doDoubleClickThing();
      setClicks(0);
    }
    return () => clearTimeout(singleClickTimer);
  }, [clicks]);

  const doSingleClickThing = () => {
    console.log('single clicked!');
  };

  const doDoubleClickThing = () => {
    console.log('double clicked!');
  };

  const handleClick = (e) => {
    e.preventDefault();
    if (e.type === 'click') {
      console.log('Left click');
      setClicks(clicks + 1);
    } else if (e.type === 'contextmenu') {
      console.log('Right click');
    }
  };

  return (
    <div className='App'>
      <div onClick={handleClick} onContextMenu={handleClick}>
        Click me
      </div>
    </div>
  );
}

export default App;
