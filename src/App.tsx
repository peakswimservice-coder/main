import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import AthletesList from './components/AthletesList';
import TrainingPlan from './components/TrainingPlan';
import EventsList from './components/EventsList';
import Messages from './components/Messages';

export type ViewType = 'dashboard' | 'athletes' | 'training' | 'events' | 'messages';

function App() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');

  return (
    <div className="flex flex-col md:flex-row bg-slate-50 min-h-screen font-sans">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 w-full max-w-full overflow-x-hidden md:h-screen md:overflow-y-auto">
        {currentView === 'dashboard' && <Dashboard setCurrentView={setCurrentView} />}
        {currentView === 'athletes' && <AthletesList />}
        {currentView === 'training' && <TrainingPlan />}
        {currentView === 'events' && <EventsList />}
        {currentView === 'messages' && <Messages />}
      </main>
    </div>
  );
}

export default App;
