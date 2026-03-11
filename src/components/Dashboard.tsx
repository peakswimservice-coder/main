import { Users, CheckCircle2, Droplets, Calendar, Share2, Check, X, Activity } from 'lucide-react';
import type { ViewType, UserRole } from '../App';
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { format } from 'date-fns';
import { it } from 'date-fns/locale/it';

interface DashboardProps {
  setCurrentView: (v: ViewType) => void;
  userRole?: UserRole;
  userId?: string;
}

export default function Dashboard({ setCurrentView, userRole = 'coach', userId }: DashboardProps) {
  const [athleteGroup, setAthleteGroup] = useState<any>(null);
  const [coachName, setCoachName] = useState<string>('');
  const [pendingAthletes, setPendingAthletes] = useState<any[]>([]);
  const [activeAthletes, setActiveAthletes] = useState<any[]>([]);
  const [todaySessions, setTodaySessions] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Athlete Gamification
  const [attendance, setAttendance] = useState<any>(null);
  const [attendanceKm, setAttendanceKm] = useState('');
  const [attendanceSaved, setAttendanceSaved] = useState(false);
  
  // States for approval process
  const [approvingAthlete, setApprovingAthlete] = useState<any>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const email = authSession?.user?.email;
      const dateStr = format(new Date(), 'yyyy-MM-dd');
      let currentAthleteGroup = null;

      // 1. Fetch Coach Name/Athlete Group
      if (userRole === 'coach' && email) {
        const { data } = await supabase.from('coaches').select('full_name').eq('email', email).maybeSingle();
        if (data?.full_name) setCoachName(data.full_name);
      } else if (userRole === 'athlete' && userId) {
        const { data } = await supabase.from('athletes').select('group_id, groups(*)').eq('id', userId).maybeSingle();
        if (data?.groups) {
           setAthleteGroup(data.groups);
           currentAthleteGroup = data.groups;
        }
        
        // Fetch Attendance for today
        const { data: attData } = await supabase
          .from('athlete_attendance')
          .select('*')
          .eq('athlete_id', userId)
          .eq('date', dateStr)
          .maybeSingle();
          
        if (attData) {
           setAttendance(attData);
           setAttendanceKm(attData.distance_km?.toString() || '');
        }
      }

      // 2. Fetch Pending Athletes (Coach only)
      if (userRole === 'coach') {
        const { data: pending } = await supabase
          .from('athletes')
          .select('*')
          .eq('status', 'pending');
        setPendingAthletes(pending || []);
        
        const { data: active } = await supabase
          .from('athletes')
          .select('*, groups(name)')
          .eq('status', 'active');
        setActiveAthletes(active || []);
        
        const { data: allGroups } = await supabase.from('groups').select('*').order('name');
        setGroups(allGroups || []);
      }

      // 3. Fetch Today's Sessions
      let query = supabase
        .from('training_sessions')
        .select('*, groups(name, color)')
        .eq('date', dateStr);
        
      if (userRole === 'athlete' && currentAthleteGroup) {
         query = query.eq('group_id', currentAthleteGroup.id as string);
      } else if (userRole === 'athlete' && !currentAthleteGroup) {
         // Se non ha gruppo, non vede allenamenti
         query = query.eq('id', '00000000-0000-0000-0000-000000000000'); 
      }
      
      const { data: sessions, error } = await query;
      if (error) {
        console.error("Error fetching sessions:", error);
      }
      setTodaySessions(sessions || []);

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userRole, userId]);

  // Debounce save for km percorsi
  useEffect(() => {
    if (userRole !== 'athlete' || !attendance || attendance.is_present !== true) return;
    
    const currentKm = attendanceKm ? parseFloat(attendanceKm.replace(',', '.')) : null;
    if (currentKm === attendance.distance_km) return;

    const timer = setTimeout(() => {
      handleSaveAttendance(true, attendanceKm);
    }, 3000);

    return () => clearTimeout(timer);
  }, [attendanceKm, attendance, userRole]);

  const handleApprove = async (athlete: any) => {
    if (!selectedGroupId) {
      alert("Seleziona un gruppo prima di approvare.");
      return;
    }
    setIsProcessingApproval(true);
    try {
      const { error } = await supabase
        .from('athletes')
        .update({ 
          status: 'active', 
          group_id: selectedGroupId,
          coach_id: userId 
        })
        .eq('id', athlete.id);

      if (error) throw error;
      
      setApprovingAthlete(null);
      setSelectedGroupId('');
      fetchData(); 
    } catch (err: any) {
      alert("Errore durante l'approvazione: " + err.message);
    } finally {
      setIsProcessingApproval(false);
    }
  };

  const handleReject = async (athleteId: string) => {
    if (!confirm("Sei sicuro di voler rifiutare questa richiesta?")) return;
    try {
      await supabase.from('athletes').update({ status: 'rejected' }).eq('id', athleteId);
      fetchData();
    } catch (err) {}
  };

  const handleSaveAttendance = async (isPresent: boolean, km: string) => {
    if (!userId) return;
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const parsedKm = km ? parseFloat(km.replace(',', '.')) : null;
    
    try {
       // Optimistic Update
       setAttendance({ ...attendance, is_present: isPresent, distance_km: parsedKm });
       
       const { error } = await supabase
         .from('athlete_attendance')
         .upsert({
           athlete_id: userId,
           date: dateStr,
           is_present: isPresent,
           distance_km: parsedKm
         }, { onConflict: 'athlete_id, date' });
         
       if (error) throw error;
       setAttendanceSaved(true);
       setTimeout(() => setAttendanceSaved(false), 2000);
    } catch (e) {
       console.error("Error saving attendance:", e);
       alert("Errore salvataggio presenza");
       // Revert Optimistic Update
       fetchData();
    }
  };

  const handleSharePdf = async (session: any) => {
    try {
       const { jsPDF } = await import('jspdf');
       const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' });
       const margin = 12;
       const pageWidth = doc.internal.pageSize.getWidth();
       const pageHeight = doc.internal.pageSize.getHeight();
       let y = margin + 5;
       
       doc.setFont('helvetica', 'bold');
       doc.setFontSize(18);
       doc.setTextColor(30, 58, 138); 
       doc.text('PeakSwim', margin, y);
       y += 6;
       doc.setFont('helvetica', 'normal');
       doc.setFontSize(11);
       doc.setTextColor(100, 116, 139); 
       doc.text('Programma di Allenamento', margin, y);
       y += 10;
       
       doc.setFont('helvetica', 'bold');
       doc.setFontSize(10);
       doc.setTextColor(15, 23, 42); 
       const dateDisplay = format(new Date(), "EEEE, d MMMM yyyy", { locale: it });
       doc.text(`Data: ${dateDisplay.charAt(0).toUpperCase() + dateDisplay.slice(1)}`, margin, y);
       y += 6;
       doc.text(`Gruppo: ${session.groups?.name || ''}`, margin, y);
       y += 6;
       doc.text(`Coach: ${coachName || '...'}`, margin, y);
       y += 4;
       doc.setDrawColor(226, 232, 240); 
       doc.line(margin, y, pageWidth - margin, y);
       y += 8;
       
       const content = session.content || '';
       const lines = content.split('\n');
       const keywordsRegex = /^(Allenamento|Velocità|Fondo|X la 33|Finale)([:\s]|$)/i;
       const renderedLines: { text: string; isBold: boolean; indent: boolean }[] = [];
       lines.forEach((l: string) => {
         const t = l.trim();
         if (!t) { renderedLines.push({ text: '', isBold: false, indent: false }); return; }
         const match = t.match(keywordsRegex);
         renderedLines.push({ text: t, isBold: !!match, indent: !match });
       });

       let fs = 10;
       const maxH = pageHeight - y - margin;
       const calcH = (size: number) => {
         let currentH = 0;
         renderedLines.forEach(rl => {
           if (rl.text === '') { currentH += size * 0.4; }
           else {
             doc.setFontSize(size);
             doc.setFont('helvetica', rl.isBold ? 'bold' : 'normal');
             const s = doc.splitTextToSize(rl.text, pageWidth - (margin * 2) - (rl.indent ? 6 : 0));
             currentH += s.length * (size * 0.52);
           }
         });
         return currentH;
       };
       while (fs > 6 && calcH(fs) > maxH) fs -= 0.5;
       
       doc.setFontSize(fs);
       renderedLines.forEach(rl => {
         if (rl.text === '') { y += fs * 0.4; return; }
         const curM = rl.indent ? margin + 6 : margin;
         doc.setFont('helvetica', rl.isBold ? 'bold' : 'normal');
         if (rl.isBold) y += 1;
         const s = doc.splitTextToSize(rl.text, pageWidth - (margin * 2) - (rl.indent ? 6 : 0));
         s.forEach((tl: string) => { if (y < pageHeight - margin) { doc.text(tl, curM, y); y += (fs * 0.52); } });
         if (rl.isBold) y += 0.5;
       });

       const blob = doc.output('blob');
       const file = new File([blob], `Allenamento_${session.groups?.name}_${format(new Date(), 'yyMMdd')}.pdf`, { type: 'application/pdf' });
       if (navigator.share && navigator.canShare({ files: [file] })) {
         await navigator.share({ title: 'Programma Allenamento', files: [file] });
       } else {
         const url = URL.createObjectURL(blob);
         window.open(url);
       }
    } catch (e) {
       console.error("PDF Share Error:", e);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500">
      <header className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <Droplets className="w-6 h-6 text-blue-500" />
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            {userRole === 'athlete' ? 'Ciao!' : `Bentornato${coachName ? `, ${coachName}` : ''}`}
          </h1>
        </div>
        <p className="text-slate-500 text-lg">Ecco il riepilogo {userRole === 'athlete' ? 'per te' : 'della squadra'} per oggi, {format(new Date(), 'EEEE d MMMM', { locale: it })}.</p>
      </header>

      {/* Stats Cards - Simplified */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {userRole === 'athlete' ? (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-500">Presenza Oggi</h3>
              <div className="flex items-center gap-2">
                {attendanceSaved && (
                  <span className="text-[10px] font-black text-emerald-500 animate-in fade-in duration-300 flex items-center gap-1">
                    ✓ Salvato!
                  </span>
                )}
                <div className="bg-blue-100 p-2.5 rounded-xl"><Activity className="w-5 h-5 text-blue-600" /></div>
              </div>
            </div>
            
            <div className="flex flex-col gap-3 mt-4">
              <div className="flex gap-2">
                <button
                  onClick={() => handleSaveAttendance(true, attendanceKm)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 font-bold text-sm transition-all ${
                    attendance?.is_present === true
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-200'
                      : 'border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600 bg-slate-50'
                  }`}
                >
                  ✓ Ero Presente
                </button>
                <button
                  onClick={() => handleSaveAttendance(false, attendanceKm)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 font-bold text-sm transition-all ${
                    attendance?.is_present === false && attendance !== null
                      ? 'bg-red-500 border-red-500 text-white shadow-md shadow-red-200'
                      : 'border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-500 bg-slate-50'
                  }`}
                >
                  ✗ Ero Assente
                </button>
              </div>
              
              {attendance?.is_present === true && (
                <div className="flex items-center space-x-3 bg-slate-50 p-2 px-3 rounded-xl border border-slate-100 shadow-sm transition focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400">
                  <span className="font-bold text-slate-500 text-sm flex-1">Km Percorsi:</span>
                  <input 
                    type="text"
                    placeholder="0.0"
                    value={attendanceKm}
                    onChange={(e) => setAttendanceKm(e.target.value.replace(/[^\d.,]/g, ''))}
                    className="w-16 text-center font-black text-slate-800 bg-transparent border-b-2 border-slate-200 focus:border-blue-500 outline-none pb-0.5 transition-colors"
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-500">Iscritti Totali</h3>
              <div className="bg-blue-100 p-2.5 rounded-xl"><Users className="w-5 h-5 text-blue-600" /></div>
            </div>
            <p className="text-4xl font-black text-slate-800">
              {activeAthletes.length}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
               {Object.entries(
                 activeAthletes.reduce((acc, a) => {
                   const g = a.groups?.name || 'Senza Gruppo';
                   acc[g] = (acc[g] || 0) + 1;
                   return acc;
                 }, {} as Record<string, number>)
               ).map(([group, count]) => (
                 <span key={group} className="px-2 py-1 bg-slate-50 border border-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm">
                   {group}: {count as React.ReactNode}
                 </span>
               ))}
               {activeAthletes.length === 0 && (
                 <p className="text-sm text-slate-400 font-medium">Nessun atleta approvato</p>
               )}
            </div>
          </div>
        )}
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-500">{userRole === 'athlete' ? 'Prossima Gara' : 'Allenamenti Oggi'}</h3>
            <div className="bg-emerald-100 p-2.5 rounded-xl">
              <Calendar className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-4xl font-black text-slate-800">
            {userRole === 'athlete' ? 'Prossimamente' : todaySessions.length}
          </p>
          <p className="text-sm text-slate-400 font-medium mt-2">Programmazione giornaliera</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Quick Actions / Alerts - Coach Only */}
        {userRole === 'coach' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-800">Coda di Approvazione</h2>
              <span className="bg-amber-100 text-amber-700 text-xs font-black px-2 py-1 rounded-full uppercase tracking-tighter">{pendingAthletes.length}</span>
            </div>
            <div className="divide-y divide-slate-100 flex-1 max-h-[400px] overflow-y-auto">
              {pendingAthletes.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">Nessuna richiesta in attesa</p>
                </div>
              ) : pendingAthletes.map((athlete) => (
                <div key={athlete.id} className="p-4 bg-white hover:bg-slate-50 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold border-2 border-white shadow-sm uppercase">
                        {athlete.full_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{athlete.full_name}</p>
                        <p className="text-[10px] text-slate-400 font-bold truncate max-w-[120px]">{athlete.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleReject(athlete.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <X className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => setApprovingAthlete(athlete)}
                        className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Approval Popup Overlay (Simple inline) */}
                  {approvingAthlete?.id === athlete.id && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100 animate-in slide-in-from-top-2">
                       <p className="text-[10px] font-black text-blue-600 uppercase mb-2 tracking-widest text-center">Assegna Gruppo Obbligatorio</p>
                       <div className="flex flex-wrap gap-1.5 justify-center mb-3">
                         {groups.map(g => (
                           <button 
                             key={g.id}
                             onClick={() => setSelectedGroupId(g.id)}
                             className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all border ${selectedGroupId === g.id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-blue-200 text-blue-600 hover:border-blue-400'}`}
                           >
                             {g.name}
                           </button>
                         ))}
                       </div>
                       <div className="flex gap-2">
                         <button 
                           onClick={() => setApprovingAthlete(null)}
                           className="flex-1 py-1.5 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase"
                         >
                           Annulla
                         </button>
                         <button 
                          onClick={() => handleApprove(athlete)}
                          disabled={!selectedGroupId || isProcessingApproval}
                          className="flex-1 py-1.5 bg-blue-600 text-white text-[10px] font-black rounded-lg uppercase shadow-lg shadow-blue-200 disabled:opacity-50"
                         >
                           Conferma
                         </button>
                       </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-800">Sessioni in Vasca</h2>
            <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest mt-1">Oggi, {format(new Date(), 'dd MMMM', { locale: it })}</p>
          </div>
          <div className="p-4 flex-1">
            <div className="space-y-4">
              {todaySessions.length === 0 ? (
                <div className="py-12 text-center">
                  <Droplets className="w-10 h-10 mx-auto text-slate-100 mb-3" />
                  <p className="text-slate-400 font-bold">Nessun allenamento oggi</p>
                </div>
              ) : todaySessions.map((session) => (
                <div 
                   key={session.id} 
                   style={{ borderLeftColor: session.groups?.color || '#e2e8f0' }}
                   className="p-4 rounded-2xl border border-l-4 bg-white shadow-sm transition-all hover:shadow-md"
                 >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {userRole === 'coach' && (
                            <span
                              style={{ backgroundColor: session.groups?.color ? session.groups.color + '22' : '#f1f5f9', color: session.groups?.color || '#64748b', borderColor: session.groups?.color ? session.groups.color + '44' : '#e2e8f0' }}
                              className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border"
                            >
                              {session.groups?.name}
                            </span>
                        )}
                      </div>
                      <h3 className="text-base font-black text-slate-900 leading-tight truncate">
                        {session.content?.split('\n')[0] || 'Allenamento senza titolo'}
                      </h3>
                    </div>
                    <button 
                      onClick={() => handleSharePdf(session)}
                      className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all active:scale-90"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="bg-white/50 rounded-xl p-3 border border-dashed border-slate-200">
                    <p className="text-xs text-slate-500 font-medium line-clamp-2">
                       {session.content?.replace(/^(Allenamento|Velocità|Fondo|X la 33|Finale)([:\s]|$)/im, '').trim()}
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => setCurrentView('training')}
                    className="mt-3 w-full py-1.5 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 rounded-lg transition-all"
                  >
                    Vedi Dettaglio Esteso
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
