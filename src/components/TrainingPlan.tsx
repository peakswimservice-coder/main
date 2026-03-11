import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Save, Share2, Plus, Trash2, Layout, ChevronDown, Check, Settings, Bell, Send } from 'lucide-react';

import DatePicker, { registerLocale } from 'react-datepicker';
import { it } from 'date-fns/locale/it';
import "react-datepicker/dist/react-datepicker.css";
import { supabase } from '../supabaseClient';
import { format, subDays } from 'date-fns';

registerLocale('it', it);

// No more paces or session types needed
interface TrainingPlanProps {
  userRole?: 'admin' | 'company_manager' | 'coach' | 'athlete' | 'none';
  userId?: string;
}

export default function TrainingPlan({ userRole = 'coach', userId }: TrainingPlanProps) {
  const [groups, setGroups] = useState<any[]>([]);
  const [activeGroup, setActiveGroup] = useState<any>(null);
  const [isEditingGroups, setIsEditingGroups] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [coachName, setCoachName] = useState<string>('');

  // 1. Fetch available groups
  const fetchGroups = async () => {
    if (userRole === 'athlete' && userId) {
      const { data: athleteData } = await supabase
        .from('athletes')
        .select(`
          group_id,
          groups (*)
        `)
        .eq('id', userId)
        .maybeSingle();

      if (athleteData && athleteData.groups) {
        setGroups([athleteData.groups]);
        setActiveGroup(athleteData.groups);
      } else {
        setGroups([]);
        setActiveGroup(null);
      }
    } else {
      const { data } = await supabase.from('groups').select('*').order('name');
      if (data) {
        setGroups(data);
        if (!activeGroup && data.length > 0) {
           setActiveGroup(data.find(g => g.name === 'Agonisti') || data[0]);
        }
      }
    }
  };

  useEffect(() => {
    fetchGroups();
    
    // Fetch Coach Name
    async function fetchCoachInfo() {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email;
      
      if (userRole === 'coach' && email) {
        const { data } = await supabase.from('coaches').select('full_name').eq('email', email).maybeSingle();
        if (data?.full_name) setCoachName(data.full_name);
      } else if (userRole === 'athlete' && userId) {
        const { data } = await supabase.from('athletes').select('coach_id, coaches(full_name)').eq('id', userId).maybeSingle() as any;
        if (data?.coaches?.full_name) setCoachName(data.coaches.full_name);
      }
    }
    fetchCoachInfo();
  }, []);

  // 2. Fetch session data when Date or Group changes
  useEffect(() => {
    if (!activeGroup) return;

    async function loadSession() {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const { data: sessionData } = await supabase
        .from('training_sessions')
        .select('id, content')
        .eq('group_id', activeGroup.id)
        .eq('date', dateStr)
        .maybeSingle();

      if (sessionData) {
        setContent(sessionData.content || '');
      } else {
        setContent('');
      }
      setIsDirty(false);
    }

    loadSession();
  }, [selectedDate, activeGroup]);

  // 3. Save Logic
  const handleSave = async () => {
    if (!activeGroup) return;
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      const { error } = await supabase
        .from('training_sessions')
        .upsert({ 
          group_id: activeGroup.id, 
          date: dateStr, 
          content,
          duration_minutes: 120 
        }, { onConflict: 'group_id, date' });

      if (error) throw error;

      setSaveSuccess(true);
      setIsDirty(false);
      setTimeout(() => {
        setSaveSuccess(false);
        setShowNotifyModal(true);
      }, 1500);
    } catch (e) {
      console.error("Save Error: ", e);
      alert("Errore durante il salvataggio.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendNotifications = async () => {
    if (!activeGroup) return;
    setIsSendingNotification(true);
    
    try {
      const response = await fetch("/api/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          groupId: activeGroup.id,
          groupName: activeGroup.name,
          date: format(selectedDate, 'yyyy-MM-dd')
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.errors?.[0] || "Errore durante l'invio via OneSignal");
      }

      setShowNotifyModal(false);
      alert("Notifiche inviate con successo agli atleti!");
    } catch (err: any) {
      console.error("Errore invio notifiche:", err);
      alert(`Errore: ${err.message || "Verifica la connessione e le chiavi."}`);
    } finally {
      setIsSendingNotification(false);
    }
  };

  // Analytics removed as requested

  const handleSharePdf = async () => {
    setIsGeneratingPdf(true);
    try {
       const { jsPDF } = await import('jspdf');
       // Use A5 format
       const doc = new jsPDF({ unit: 'mm', format: 'a5', orientation: 'portrait' });
       
       const margin = 12;
       const pageWidth = doc.internal.pageSize.getWidth();
       const pageHeight = doc.internal.pageSize.getHeight();
       let y = margin + 5;
       
       // HEADER
       doc.setFont('helvetica', 'bold');
       doc.setFontSize(18);
       doc.setTextColor(30, 58, 138); 
       doc.text('PeakSwim', margin, y);
       
       doc.setFont('helvetica', 'normal');
       doc.setFontSize(11);
       doc.setTextColor(100, 116, 139); 
       y += 6;
       doc.text('Programma di Allenamento', margin, y);
       y += 10;
       
       // SUBHEADER INFO
       doc.setFont('helvetica', 'bold');
       doc.setFontSize(10);
       doc.setTextColor(15, 23, 42); 
       
       const dateDisplay = format(selectedDate, "EEEE, d MMMM yyyy", { locale: it });
       const capitalizedDateDisplay = dateDisplay.charAt(0).toUpperCase() + dateDisplay.slice(1);
       
       doc.text(`Data: ${capitalizedDateDisplay}`, margin, y);
       y += 6;
       doc.text(`Gruppo: ${activeGroup?.name || ''}`, margin, y);
       y += 6;
       doc.text(`Coach: ${coachName || '...'}`, margin, y);
       
       y += 4;
       doc.setDrawColor(226, 232, 240); 
       doc.line(margin, y, pageWidth - margin, y);
       y += 8;
       
       // CONTENT
       // Auto-adjust font size to fit on one page
       let fontSize = 10;
       const leftMargin = margin;
       const indentSize = 6;
       const maxRectHeight = pageHeight - y - margin;
       
       // Regex for keywords: Allenamento, Velocità, Fondo, X la 33, Finale (case-insensitive)
       // Using a more inclusive regex for accented characters and spaces
       const keywordsRegex = /^(Allenamento|Velocità|Fondo|X la 33|Finale)([:\s]|$)/i;
       
       // Process content to estimate height and prepare for rendering
       const lines = content.split('\n');
       const renderedLines: { text: string; isBold: boolean; indent: boolean }[] = [];
       
       lines.forEach(line => {
         const trimmedLine = line.trim();
         if (!trimmedLine) {
           renderedLines.push({ text: '', isBold: false, indent: false });
           return;
         }
         
         const match = trimmedLine.match(keywordsRegex);
         if (match) {
           // Keyword line: Bold, no indent
           renderedLines.push({ text: trimmedLine, isBold: true, indent: false });
         } else {
           // Normal line: Regular, indent
           renderedLines.push({ text: trimmedLine, isBold: false, indent: true });
         }
       });

        const calculateTotalHeight = (fs: number) => {
          let currentY = 0;
          renderedLines.forEach(rl => {
             if (rl.text === '') {
               currentY += fs * 0.4;
               return;
             }
             doc.setFontSize(fs);
             doc.setFont('helvetica', rl.isBold ? 'bold' : 'normal');
             const split = doc.splitTextToSize(rl.text, pageWidth - (margin * 2) - (rl.indent ? indentSize : 0));
             currentY += split.length * (fs * 0.52);
          });
          return currentY;
        };

       while (fontSize > 6 && calculateTotalHeight(fontSize) > maxRectHeight) {
         fontSize -= 0.5;
       }
       
       doc.setFontSize(fontSize);
       doc.setTextColor(51, 65, 85);

       // Actual Rendering
       renderedLines.forEach(rl => {
         if (rl.text === '') {
           y += fontSize * 0.4;
           return;
         }
         
         const currentMargin = rl.indent ? leftMargin + indentSize : leftMargin;
         doc.setFont('helvetica', rl.isBold ? 'bold' : 'normal');
         
         // If it's a bold header, maybe add a tiny extra space before it
         if (rl.isBold) y += 1;

         const split = doc.splitTextToSize(rl.text, pageWidth - (margin * 2) - (rl.indent ? indentSize : 0));
         
         split.forEach((textLine: string) => {
           if (y < pageHeight - margin) {
             doc.text(textLine, currentMargin, y);
             y += (fontSize * 0.52);
           }
         });
         
         // If it's a bold header, add a tiny extra space after it
         if (rl.isBold) y += 0.5;
       });

       const dateFileStr = format(selectedDate, 'yyMMdd');
       const filename = `Allenamento_${activeGroup?.name.replace(/\s+/g, '')}_${dateFileStr}.pdf`;
       const pdfBlob = doc.output('blob');

       const file = new File([pdfBlob], filename, { type: 'application/pdf' });
       // Try native share (iOS/Android), fall back to download
       let shared = false;
       try {
         if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
           await navigator.share({ title: 'Programma Allenamento', files: [file] });
           shared = true;
         }
       } catch (shareErr: unknown) {
         if ((shareErr as any)?.name === 'AbortError') shared = true;
         else console.warn('Share failed:', shareErr);
       }
       if (!shared) {
         const url = URL.createObjectURL(pdfBlob);
         const a = document.createElement('a');
         a.href = url;
         a.download = filename;
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
         setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
       }
     } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('PDF error:', msg);
        alert('Errore nella generazione del PDF: ' + msg);
    } finally {
       setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1200px] mx-auto pb-24 lg:pb-8">
      
      {/* Date Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center">
            Training <span className="text-blue-600 ml-1.5">Builder</span>
          </h1>
          <p className="text-slate-400 text-[10px] font-bold mt-0.5 uppercase tracking-widest">Gestione Piani</p>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner w-full sm:w-auto">
          <button onClick={() => setSelectedDate(subDays(selectedDate, 1))} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-600 transition shrink-0"><ChevronLeft className="w-4 h-4" /></button>
          
          <div className="relative flex-1 sm:w-40 px-2 flex items-center justify-center">
             <DatePicker
                selected={selectedDate}
                onChange={(date: Date | null) => date && setSelectedDate(date)}
                dateFormat="eeee dd MMMM"
                locale="it"
                className="bg-transparent font-bold text-slate-800 text-xs text-center w-full outline-none cursor-pointer"
             />
             <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 pointer-events-none" />
          </div>

          <button onClick={() => setSelectedDate(subDays(selectedDate, -1))} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-600 transition shrink-0"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </header>

      {/* Selectors Section - Groups only */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden px-3 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center justify-between min-w-[80px]">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gruppo</span>
            {userRole === 'coach' && (
              <button 
                onClick={() => setIsEditingGroups(!isEditingGroups)}
                className={`sm:hidden p-1 rounded-md transition ${isEditingGroups ? 'bg-blue-100 text-blue-600' : 'text-slate-400'}`}
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          
          <div className="flex-1 flex gap-2 no-scrollbar overflow-x-auto py-1 items-center">
            {groups.map((group) => {
              const isActive = activeGroup?.id === group.id && !isEditingGroups;
              return (
                <div key={group.id} className="relative shrink-0">
                  {isEditingGroups ? (
                    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
                      <input 
                        type="color"
                        defaultValue={group.color || '#3B82F6'}
                        title="Colore del gruppo"
                        onBlur={async (e) => {
                           await supabase.from('groups').update({color: e.target.value}).eq('id', group.id);
                           fetchGroups();
                        }}
                        className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                      />
                      <input 
                        type="text" 
                        defaultValue={group.name}
                        onBlur={async (e) => {
                           if (e.target.value !== group.name && e.target.value.trim() !== '') {
                             const {error} = await supabase.from('groups').update({name: e.target.value}).eq('id', group.id);
                             if(!error) { fetchGroups(); if(activeGroup?.id === group.id) setActiveGroup({...activeGroup, name: e.target.value}); }
                           }
                        }}
                        className="w-24 px-1.5 py-0.5 text-xs font-bold text-slate-700 bg-transparent outline-none"
                      />
                      <button 
                        onClick={async () => {
                           const {error} = await supabase.from('groups').delete().eq('id', group.id);
                           if(error) alert("Impossibile eliminare: ci sono allenamenti associati.");
                           else fetchGroups();
                        }}
                        className="p-1 text-red-400 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setActiveGroup(group)}
                      style={isActive ? { backgroundColor: group.color || '#3B82F6', borderColor: group.color || '#3B82F6' } : {}}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        isActive 
                        ? 'text-white shadow-md' 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                      }`}
                    >
                      {!isActive && group.color && (
                        <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: group.color }} />
                      )}
                      {group.name}
                    </button>
                  )}
                </div>
              )
            })}
            
            {!isEditingGroups && userRole === 'coach' && (
              <button 
                onClick={() => setIsEditingGroups(true)}
                className="p-1.5 text-slate-400 hover:text-blue-500 transition"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            {isEditingGroups && userRole === 'coach' && (
              <button
                onClick={async () => {
                  const {error} = await supabase.from('groups').insert({name: 'Nuovo'});
                  if(!error) fetchGroups();
                }}
                className="px-3 py-1.5 border border-dashed border-slate-300 rounded-lg text-slate-400 text-xs font-bold hover:bg-slate-50 transition"
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col min-h-[600px]">
        <div className="p-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/30 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
              <Layout className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Allenamento</span> {activeGroup?.name}
            </h2>
          </div>
          
          <div className="flex items-center gap-3 ml-auto">
            
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                  onClick={handleSharePdf}
                  disabled={isDirty || isGeneratingPdf || !content}
                  className={`p-2 rounded-xl border transition-all ${isDirty || !content ? 'opacity-30 cursor-not-allowed' : 'border-slate-200 text-slate-600 hover:bg-white hover:border-blue-300 hover:text-blue-600 active:scale-95'}`}
                  title="Condividi PDF"
              >
                {isGeneratingPdf ? <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent animate-spin rounded-full" /> : <Share2 className="w-4 h-4" />}
              </button>
              
              {userRole === 'coach' && (
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`p-2 rounded-xl border-b-2 transition-all active:translate-y-0.5 active:border-b-0 ${saveSuccess ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-blue-600 border-blue-700 text-white hover:brightness-110 shadow-sm disabled:opacity-50'}`}
                  title="Salva"
                >
                  {saveSuccess ? <Check className="w-4 h-4" /> : 
                   isSaving    ? <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" /> : <Save className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 flex-1 bg-slate-50/10">
          <textarea
            value={content}
            onChange={(e) => { setContent(e.target.value); setIsDirty(true); }}
            placeholder={userRole === 'coach' ? "Inserisci qui l'allenamento completo..." : "Nessun allenamento inserito per oggi."}
            disabled={userRole !== 'coach'}
            className="w-full min-h-[500px] h-full p-6 bg-white border border-slate-200 rounded-2xl shadow-sm text-slate-700 font-medium text-lg outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all resize-none disabled:bg-slate-50/50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Notification Confirmation Modal */}
      {showNotifyModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
                <Bell className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Notifica Atleti?</h3>
              <p className="text-slate-500 text-sm font-medium leading-relaxed">
                Allenamento salvato con successo! Vuoi inviare una notifica a tutti gli atleti del gruppo <span className="text-blue-600 font-bold">{activeGroup?.name}</span>?
              </p>
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={handleSendNotifications}
                disabled={isSendingNotification}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
              >
                {isSendingNotification ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Sì, notifica gli atleti
                  </>
                )}
              </button>
              
              <button
                onClick={() => setShowNotifyModal(false)}
                disabled={isSendingNotification}
                className="w-full bg-white text-slate-500 font-bold py-3 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all active:scale-95 disabled:opacity-50"
              >
                No, chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
