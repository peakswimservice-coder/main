import { Users, CheckCircle2, Droplets, Calendar, Share2, Check, X, Activity, ChevronLeft, ChevronRight, Upload, Image as ImageIcon, Eye, Search } from 'lucide-react';
import type { ViewType, UserRole } from '../App';
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { format, addDays, subDays } from 'date-fns';
import { it } from 'date-fns/locale/it';
import GamificationCard from './gamification/GamificationCard';

interface DashboardProps {
  setCurrentView: (v: ViewType) => void;
  userRole?: UserRole;
  userId?: string;
}

export default function Dashboard({ setCurrentView, userRole = 'coach', userId }: DashboardProps) {
  const [coachName, setCoachName] = useState<string>('');
  const [pendingAthletes, setPendingAthletes] = useState<any[]>([]);
  const [activeAthletes, setActiveAthletes] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [gamificationRefresh, setGamificationRefresh] = useState(0);
  
  // Athlete Gamification & Federation Card
  const [attendance, setAttendance] = useState<any>(null);
  const [attendanceKm, setAttendanceKm] = useState('');
  const [attendanceSaved, setAttendanceSaved] = useState(false);
  const [federationCardUrl, setFederationCardUrl] = useState<string | null>(null);
  const [uploadingCard, setUploadingCard] = useState(false);
  const [showZoom, setShowZoom] = useState(false);
  
  // States for approval process
  const [approvingAthlete, setApprovingAthlete] = useState<any>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [isProcessingApproval, setIsProcessingApproval] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const email = authSession?.user?.email;
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      let currentAthleteGroup = null;

      // 1. Fetch Coach Name/Athlete Group & Profile details
      if (userRole === 'coach' && email) {
        const { data } = await supabase.from('coaches').select('full_name').eq('email', email).maybeSingle();
        if (data?.full_name) setCoachName(data.full_name);
      } else if (userRole === 'athlete' && userId) {
        const { data } = await supabase.from('athletes').select('group_id, federation_card_url, groups(*)').eq('id', userId).maybeSingle();
        if (data) {
          if (data.groups) {
            currentAthleteGroup = data.groups;
          }
          
          if (data.federation_card_url) {
            // Se URL è un percorso relativo (es: federation-cards/...) genera signed URL
            if (data.federation_card_url.includes('federation-cards/')) {
               const cleanPath = data.federation_card_url.split('federation-cards/').pop();
               if (cleanPath) {
                 const { data: signedData } = await supabase.storage
                   .from('federation-cards')
                   .createSignedUrl(cleanPath, 3600); // Valido per 1 ora
                 setFederationCardUrl(signedData?.signedUrl || null);
               }
            } else {
               setFederationCardUrl(data.federation_card_url);
            }
          }
        }
        
        // Fetch Attendance for selectedDate
        const { data: attData } = await supabase
          .from('athlete_attendance')
          .select('*')
          .eq('athlete_id', userId)
          .eq('date', dateStr)
          .maybeSingle();
          
        if (attData) {
           setAttendance(attData);
           setAttendanceKm(attData.distance_km?.toString() || '');
        } else {
           setAttendance(null);
           setAttendanceKm('');
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

      // 3. Fetch Sessions for selected date
      let query = supabase
        .from('training_sessions')
        .select('*, groups(name, color)')
        .eq('date', dateStr);
        
      if (userRole === 'athlete' && currentAthleteGroup) {
         const gid = Array.isArray(currentAthleteGroup) ? currentAthleteGroup[0]?.id : (currentAthleteGroup as any)?.id;
         query = query.eq('group_id', gid as string);
      } else if (userRole === 'athlete' && !currentAthleteGroup) {
         query = query.eq('id', '00000000-0000-0000-0000-000000000000'); 
      }
      
      const { data: fetchedSessions, error } = await query;
      if (error) console.error("Error fetching sessions:", error);
      setSessions(fetchedSessions || []);

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userRole, userId, selectedDate]);

  // Debounce save for km percorsi
  useEffect(() => {
    if (userRole !== 'athlete' || !attendance || attendance.is_present !== true) return;
    
    const currentKmValue = attendanceKm ? parseFloat(attendanceKm.replace(',', '.')) : null;
    if (currentKmValue === attendance.distance_km) return;

    const timer = setTimeout(() => {
      handleSaveAttendance(true, attendanceKm);
    }, 3000);

    return () => clearTimeout(timer);
  }, [attendanceKm, attendance, userRole]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploadingCard(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${userId}/${fileName}`; // Struttura cartella per utente

      const { error: uploadError } = await supabase.storage
        .from('federation-cards')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Salviamo il percorso relativo nel database, non la URL pubblica
      const dbPath = `federation-cards/${filePath}`;

      const { error: updateError } = await supabase
        .from('athletes')
        .update({ federation_card_url: dbPath })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Generiamo subito un signed URL per l'anteprima
      const { data: signedData } = await supabase.storage
        .from('federation-cards')
        .createSignedUrl(filePath, 3600);
        
      setFederationCardUrl(signedData?.signedUrl || null);
    } catch (err: any) {
      alert("Errore durante il caricamento: " + err.message);
    } finally {
      setUploadingCard(false);
    }
  };

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
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const parsedKm = km ? parseFloat(km.replace(',', '.')) : null;
    
    try {
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
       setGamificationRefresh(prev => prev + 1);
       setTimeout(() => setAttendanceSaved(false), 2000);
    } catch (e) {
       console.error("Error saving attendance:", e);
       alert("Errore salvataggio presenza");
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
       const dateDisplay = format(selectedDate, "EEEE, d MMMM yyyy", { locale: it });
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
       const file = new File([blob], `Allenamento_${session.groups?.name}_${format(selectedDate, 'yyMMdd')}.pdf`, { type: 'application/pdf' });
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

  if (loading && sessions.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-500 pb-20">
      <header className="mb-8">
        <div className="flex items-center space-x-4 mb-2">
          <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain drop-shadow-sm" />
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            {userRole === 'athlete' ? 'Ciao!' : `Bentornato${coachName ? `, ${coachName}` : ''}`}
          </h1>
        </div>
        <p className="text-slate-500 text-lg">
          {userRole === 'coach' 
            ? `Ecco il riepilogo della squadra per oggi, ${format(new Date(), 'EEEE d MMMM', { locale: it })}.`
            : `Gestisci i tuoi allenamenti e il tuo tesserino federale.`}
        </p>
      </header>

      {/* DASHBOARD COACH - KEEP ORIGINAL LAYOUT */}
      {userRole === 'coach' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-500">Iscritti Totali</h3>
                <div className="bg-blue-100 p-2.5 rounded-xl"><Users className="w-5 h-5 text-blue-600" /></div>
              </div>
              <p className="text-4xl font-black text-slate-800">{activeAthletes.length}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(activeAthletes.reduce((acc, a) => {
                  const g = a.groups?.name || 'Senza Gruppo';
                  acc[g] = (acc[g] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)).map(([group, count]) => (
                  <span key={group} className="px-2 py-1 bg-slate-50 border border-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm">
                    {group}: {count as React.ReactNode}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-500">Allenamenti Oggi</h3>
                <div className="bg-emerald-100 p-2.5 rounded-xl"><Calendar className="w-5 h-5 text-emerald-600" /></div>
              </div>
              <p className="text-4xl font-black text-slate-800">{sessions.length}</p>
              <p className="text-sm text-slate-400 font-medium mt-2">Programmazione giornaliera</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
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
                        <button onClick={() => handleReject(athlete.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><X className="w-5 h-5" /></button>
                        <button onClick={() => setApprovingAthlete(athlete)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"><Check className="w-5 h-5" /></button>
                      </div>
                    </div>
                    {approvingAthlete?.id === athlete.id && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-100 animate-in slide-in-from-top-2">
                         <p className="text-[10px] font-black text-blue-600 uppercase mb-2 tracking-widest text-center">Assegna Gruppo Obbligatorio</p>
                         <div className="flex flex-wrap gap-1.5 justify-center mb-3">
                           {groups.map(g => (
                             <button key={g.id} onClick={() => setSelectedGroupId(g.id)} className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all border ${selectedGroupId === g.id ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-blue-200 text-blue-600 hover:border-blue-400'}`}>{g.name}</button>
                           ))}
                         </div>
                         <div className="flex gap-2">
                           <button onClick={() => setApprovingAthlete(null)} className="flex-1 py-1.5 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase">Annulla</button>
                           <button onClick={() => handleApprove(athlete)} disabled={!selectedGroupId || isProcessingApproval} className="flex-1 py-1.5 bg-blue-600 text-white text-[10px] font-black rounded-lg uppercase shadow-lg shadow-blue-200 disabled:opacity-50">Conferma</button>
                         </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col">
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800">Sessioni in Vasca</h2>
                <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest mt-1">Oggi, {format(new Date(), 'dd MMMM', { locale: it })}</p>
              </div>
              <div className="p-4 flex-1">
                <div className="space-y-4">
                  {sessions.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 font-bold"><Droplets className="w-10 h-10 mx-auto text-slate-100 mb-3" />Nessun allenamento oggi</div>
                  ) : sessions.map((session) => (
                    <div key={session.id} style={{ borderLeftColor: session.groups?.color || '#e2e8f0' }} className="p-4 rounded-2xl border border-l-4 bg-white shadow-sm transition-all hover:shadow-md">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-base font-black text-slate-900 leading-tight truncate">{session.content?.split('\n')[0] || 'Allenamento senza titolo'}</h3>
                        <button onClick={() => handleSharePdf(session)} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 transition-all"><Share2 className="w-4 h-4" /></button>
                      </div>
                      <div className="bg-white/50 rounded-xl p-3 border border-dashed border-slate-200 underline-offset-4 line-clamp-2 text-xs text-slate-500">{session.content?.replace(/^(Allenamento|Velocità|Fondo|X la 33|Finale)([:\s]|$)/im, '').trim()}</div>
                      <button onClick={() => setCurrentView('training')} className="mt-3 w-full py-1.5 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 rounded-lg transition-all">Vedi Dettaglio Esteso</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* GAMIFICATION - COACH VIEW */}
          <GamificationCard isCoach={true} refreshTrigger={gamificationRefresh} />
        </>
      )}

      {/* DASHBOARD ATHLETE - NEW REORDERED LAYOUT */}
      {userRole === 'athlete' && (
        <div className="flex flex-col gap-8">
          
          {/* 1. TRAINING PLAN (TOP) */}
          <div className="bg-white rounded-[2rem] shadow-xl shadow-blue-900/5 border border-slate-100 overflow-hidden">
            <div className="p-6 md:p-8 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Allenamento</h2>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{format(selectedDate, 'EEEE d MMMM', { locale: it })}</p>
              </div>
              <div className="flex items-center bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 gap-1">
                <button 
                  onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                  className="p-2 hover:bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all active:scale-90"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button 
                  onClick={() => setSelectedDate(new Date())}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-tighter rounded-xl transition-all ${isToday ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  Oggi
                </button>
                <button 
                  onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                  className="p-2 hover:bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all active:scale-90"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 md:p-8">
              {sessions.length === 0 ? (
                <div className="py-16 text-center">
                  <Droplets className="w-12 h-12 mx-auto text-slate-200 mb-4 animate-pulse" />
                  <p className="text-slate-400 font-black text-lg">Nessun allenamento programmato</p>
                  <p className="text-slate-300 text-sm mt-1">Controlla un'altra giornata!</p>
                </div>
              ) : sessions.map((session) => (
                <div key={session.id} className="relative">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border border-blue-100">
                        {session.groups?.name || 'Il tuo gruppo'}
                      </span>
                      <h3 className="text-2xl font-black text-slate-900 leading-tight">
                        {session.content?.split('\n')[0] || 'Dettagli Sessione'}
                      </h3>
                    </div>
                    <button 
                      onClick={() => handleSharePdf(session)}
                      className="p-3 bg-white border-2 border-slate-100 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm active:scale-95"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 whitespace-pre-wrap text-slate-700 font-medium leading-relaxed">
                    {session.content?.replace(/^(Allenamento|Velocità|Fondo|X la 33|Finale)([:\s]|$)/im, '').trim()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 2. ATTENDANCE (MIDDLE LEFT) */}
            <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black text-slate-900">Presenze</h2>
                  <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200"><Activity className="w-6 h-6 text-white" /></div>
                </div>
                
                  <div className="flex items-center justify-between mb-6 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                    <button 
                      onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                      className="p-2 text-slate-400 hover:bg-white hover:text-blue-600 rounded-xl hover:shadow-sm transition-all"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-black text-slate-700 uppercase tracking-widest">
                      {isToday ? 'Oggi' : format(selectedDate, 'dd/MM/yyyy')}
                    </span>
                    <button 
                      onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                      className="p-2 text-slate-400 hover:bg-white hover:text-blue-600 rounded-xl hover:shadow-sm transition-all"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                <div className="flex flex-col gap-4">
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleSaveAttendance(true, attendanceKm)}
                      className={`flex-1 py-4 rounded-2xl border-2 font-black transition-all ${
                        attendance?.is_present === true
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-xl shadow-emerald-200 scale-[1.02]'
                          : 'border-slate-100 text-slate-400 bg-slate-50 hover:border-emerald-200'
                      }`}
                    >
                      Presente
                    </button>
                    <button
                      onClick={() => handleSaveAttendance(false, attendanceKm)}
                      className={`flex-1 py-4 rounded-2xl border-2 font-black transition-all ${
                        attendance?.is_present === false && attendance !== null
                          ? 'bg-red-500 border-red-500 text-white shadow-xl shadow-red-200 scale-[1.02]'
                          : 'border-slate-100 text-slate-400 bg-slate-50 hover:border-red-200'
                      }`}
                    >
                      Assente
                    </button>
                  </div>
                  
                  {attendance?.is_present === true && (
                    <div className="flex items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 mt-2 animate-in slide-in-from-top-4">
                      <span className="font-bold text-slate-500 flex-1">Km Percorsi:</span>
                      <input 
                        type="text"
                        value={attendanceKm}
                        onChange={(e) => setAttendanceKm(e.target.value.replace(/[^\d.,]/g, ''))}
                        className="w-20 text-right font-black text-blue-600 bg-transparent border-b-2 border-blue-200 outline-none focus:border-blue-600 text-xl"
                      />
                    </div>
                  )}
                </div>
              </div>

              {attendanceSaved && (
                <div className="mt-6 flex items-center justify-center gap-2 text-emerald-500 font-black animate-bounce text-xs uppercase tracking-widest">
                  <Check className="w-4 h-4" /> Salvato con successo!
                </div>
              )}
            </div>

            {/* 3. RACES (MIDDLE RIGHT) */}
            <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 opacity-60">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-slate-900">Prossime Gare</h2>
                <div className="bg-amber-100 p-3 rounded-2xl"><Calendar className="w-6 h-6 text-amber-600" /></div>
              </div>
              <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Gestione Gare</p>
                <p className="text-slate-300 font-bold text-[10px] mt-1">Coming Soon</p>
              </div>
            </div>
          </div>

          {/* 4. FEDERATION CARD (BOTTOM) */}
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl shadow-blue-900/5 border border-slate-100 flex flex-col">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-slate-900">Tesserino Federale</h2>
              <p className="text-slate-500 font-medium">Gestisci e visualizza il tuo documento ufficiale.</p>
            </div>

            <div className="bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden mb-8">
              {federationCardUrl ? (
                federationCardUrl.toLowerCase().includes('.pdf') ? (
                  <div className="w-full flex flex-col items-center">
                    <iframe 
                      src={`${federationCardUrl}#toolbar=0&navpanes=0&scrollbar=0`} 
                      className="w-full h-[450px] border-none"
                      title="Anteprima PDF"
                    />
                    <div className="p-6 w-full flex justify-center bg-white/50 border-t border-slate-100">
                      <button 
                        onClick={() => window.open(federationCardUrl, '_blank')}
                        className="inline-flex items-center gap-3 bg-white px-10 py-4 rounded-2xl border-2 border-slate-200 font-black text-blue-600 shadow-sm hover:shadow-md transition-all active:scale-95"
                      >
                        <Eye className="w-6 h-6" /> Ingrandisci
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center">
                    <div 
                      className="relative w-full cursor-zoom-in group"
                      onClick={() => setShowZoom(true)}
                    >
                      <img 
                        src={federationCardUrl} 
                        alt="Tesserino Federale" 
                        className="w-full h-auto object-contain"
                      />
                    </div>
                    <div className="p-6 w-full flex justify-center bg-white/50 border-t border-slate-100">
                      <button 
                        onClick={() => setShowZoom(true)}
                        className="inline-flex items-center gap-3 bg-white px-10 py-4 rounded-2xl border-2 border-slate-200 font-black text-blue-600 shadow-sm hover:shadow-md transition-all active:scale-95"
                      >
                        <Search className="w-6 h-6" /> Ingrandisci
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center p-12">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ImageIcon className="w-10 h-10 text-slate-300" />
                  </div>
                  <p className="text-slate-400 font-black">Nessun file caricato</p>
                  <p className="text-slate-300 text-sm font-bold uppercase tracking-widest mt-1">Carica il tuo tesserino qui sotto</p>
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
              <label className="relative cursor-pointer group w-full md:w-auto">
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".jpg,.jpeg,.png,.gif,.bmp,.pdf"
                  onChange={handleFileUpload}
                  disabled={uploadingCard}
                />
                <div className="flex items-center justify-center gap-3 bg-blue-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-blue-600/20 group-hover:bg-blue-700 transition-all active:scale-95">
                  {uploadingCard ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Upload className="w-5 h-5" />}
                  {federationCardUrl ? 'Sostituisci Tesserino' : 'Carica Tesserino'}
                </div>
              </label>
              <p className="text-xs text-slate-400 font-medium">JPG, PNG, PDF (Max 5MB)</p>
            </div>
          </div>

          {/* 5. GAMIFICATION (NEW) */}
          <GamificationCard userId={userId} refreshTrigger={gamificationRefresh} />
        </div>
      )}
      {/* Modal Zoom Tesserino */}
      {showZoom && federationCardUrl && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowZoom(false)}
        >
          <button 
            onClick={() => setShowZoom(false)}
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="max-w-4xl w-full max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img 
              src={federationCardUrl} 
              alt="Tesserino Zoom" 
              className="max-w-full max-h-full object-contain shadow-2xl rounded-lg animate-in zoom-in-95 duration-300" 
            />
          </div>
        </div>
      )}
    </div>
  );
}
