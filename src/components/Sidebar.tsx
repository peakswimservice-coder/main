import { Home, Users, Activity, Calendar, LifeBuoy, MessageCircle } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: any) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'athletes', label: 'Atleti', icon: Users },
  { id: 'training', label: 'Allenamenti', icon: Activity },
  { id: 'events', label: 'Gare / Eventi', icon: Calendar },
  { id: 'messages', label: 'Bacheca', icon: MessageCircle },
];

export default function Sidebar({ currentView, setCurrentView }: SidebarProps) {
  return (
    <>
      {/* Desktop Sidebar */}
      <div className="w-64 bg-white border-r border-slate-200 h-screen flex-col hidden md:flex shrink-0 shadow-sm z-20 sticky top-0">
        <div className="p-6 flex items-center space-x-3 text-blue-600">
          <LifeBuoy className="w-8 h-8" />
          <span className="text-xl font-bold tracking-tight">PeakSwim</span>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700 font-medium shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center space-x-3 px-4 py-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
            <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold shadow-sm">
              MR
            </div>
            <div className="text-sm text-left">
              <p className="font-bold text-slate-800">Marco Rossi</p>
              <p className="text-slate-500 text-xs font-medium">Head Coach</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 pb-safe">
        <nav className="flex justify-around items-center px-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex flex-col items-center justify-center w-full py-2 px-1 rounded-xl transition-all ${
                  isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-900'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-blue-50' : ''}`}>
                  <Icon className={`w-6 h-6 mb-1 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                </div>
                <span className={`text-[10px] sm:text-xs font-medium ${isActive ? 'text-blue-700 font-bold' : ''}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile Top Header (Minimal) */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between z-20 sticky top-0">
        <div className="flex items-center space-x-2 text-blue-600">
          <LifeBuoy className="w-6 h-6" />
          <span className="text-lg font-bold tracking-tight">PeakSwim</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold shadow-sm text-xs">
          MR
        </div>
      </div>
    </>
  );
}
