import { Calendar, MapPin, ExternalLink, Trophy, Plus, Clock, Users } from 'lucide-react';

const events = [
  {
    id: 1,
    title: 'Trofeo Città di Milano',
    type: 'Gara Regionale',
    date: '12 Nov 2026',
    time: '08:00 - 18:00',
    location: 'Piscina Samuele, Milano',
    participants: 18,
    status: 'upcoming',
    resultsLink: null,
  },
  {
    id: 2,
    title: 'Campionati Invernali di Categoria',
    type: 'Campionato',
    date: '04 Dic 2026',
    time: '09:00 - 19:30',
    location: 'Stadio del Nuoto, Roma',
    participants: 8,
    status: 'upcoming',
    resultsLink: null,
  },
  {
    id: 3,
    title: 'Meeting di Fine Estate',
    type: 'Gara Provinciale',
    date: '15 Set 2026',
    time: '08:30',
    location: 'Centro Sportivo, Torino',
    participants: 22,
    status: 'completed',
    resultsLink: 'https://risultati.fin.it/12345',
  }
];

interface EventsListProps {
  userRole?: 'admin' | 'company_manager' | 'coach' | 'athlete' | 'none';
}

export default function EventsList({ userRole = 'coach' }: EventsListProps) {
  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Calendario Gare ed Eventi</h1>
          <p className="text-slate-500 mt-1">
            {userRole === 'athlete' ? 'Visualizza il calendario delle gare e degli eventi.' : 'Gestisci la programmazione competitiva e collega i risultati.'}
          </p>
        </div>
        {userRole === 'coach' && (
          <button className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center justify-center hover:bg-blue-700 transition shadow-sm">
            <Plus className="w-5 h-5 mr-2" /> Nuovo Evento
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <div key={event.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition group flex flex-col">
            <div className={`h-2 w-full ${event.status === 'completed' ? 'bg-slate-300' : 'bg-blue-500'}`}></div>
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${
                  event.status === 'completed' ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-blue-50 text-blue-700 border-blue-100'
                }`}>
                  {event.type}
                </span>
                {event.status === 'completed' && <Trophy className="w-5 h-5 text-amber-500" />}
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 mb-4">{event.title}</h3>
              
              <div className="space-y-3 mt-auto mb-6">
                <div className="flex items-center text-sm font-medium text-slate-600">
                  <Calendar className="w-4 h-4 mr-3 text-slate-400" />
                  {event.date}
                </div>
                <div className="flex items-center text-sm font-medium text-slate-600">
                  <Clock className="w-4 h-4 mr-3 text-slate-400" />
                  {event.time}
                </div>
                <div className="flex items-center text-sm font-medium text-slate-600">
                  <MapPin className="w-4 h-4 mr-3 text-slate-400" />
                  {event.location}
                </div>
                <div className="flex items-center text-sm font-medium text-slate-600">
                  <Users className="w-4 h-4 mr-3 text-slate-400" />
                  {event.participants} Atleti iscritti
                </div>
              </div>

              {event.status === 'completed' && event.resultsLink ? (
                <a href={event.resultsLink} target="_blank" rel="noopener noreferrer" className="mt-auto w-full py-2.5 bg-slate-50 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-100 transition border border-slate-200 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-700 group-hover:border-blue-200">
                  Vedi Risultati <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              ) : (
                <button 
                  disabled={userRole === 'athlete'}
                  className={`mt-auto w-full py-2.5 font-bold text-sm rounded-xl border-2 transition flex items-center justify-center ${
                    userRole === 'athlete' 
                    ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed' 
                    : 'bg-white text-blue-600 border-slate-200 hover:border-blue-500'
                  }`}
                >
                  {userRole === 'athlete' ? 'Dettagli Gara' : 'Gestisci Iscrizioni'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
