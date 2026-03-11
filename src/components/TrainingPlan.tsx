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
  const [distance, setDistance] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [isSendingNotification, setIsSendingNotification] = useState(false);

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
  }, []);

  // 2. Fetch session data when Date or Group changes
  useEffect(() => {
    if (!activeGroup) return;

    async function loadSession() {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const { data: sessionData } = await supabase
        .from('training_sessions')
        .select('id, content, distance_km')
        .eq('group_id', activeGroup.id)
        .eq('date', dateStr)
        .maybeSingle();

      if (sessionData) {
        setContent(sessionData.content || '');
        setDistance(sessionData.distance_km?.toString() || '');
      } else {
        setContent('');
        setDistance('');
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
          distance_km: distance ? parseFloat(distance) : null,
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
       const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
       
       const margin = 20;
       const pageWidth = doc.internal.pageSize.getWidth();
       const pageHeight = doc.internal.pageSize.getHeight();
       let y = margin;
       
       // HEADER
       doc.setFont('helvetica', 'bold');
       doc.setFontSize(22);
       doc.setTextColor(30, 58, 138); 
       doc.text('PeakSwim', margin, y);
       
       doc.setFont('helvetica', 'normal');
       doc.setFontSize(14);
       doc.setTextColor(100, 116, 139); 
       y += 8;
       doc.text('Programma di Allenamento', margin, y);
       y += 15;
       
       // SUBHEADER INFO
       const dateDisplay = format(selectedDate, "EEEE, d MMMM yyyy", { locale: it });
       const capitalizedDateDisplay = dateDisplay.charAt(0).toUpperCase() + dateDisplay.slice(1);
       
       doc.setFont('helvetica', 'bold');
       doc.setFontSize(12);
       doc.setTextColor(15, 23, 42); 
       
       doc.text(`Gruppo: ${activeGroup?.name || ''}`, margin, y);
       doc.text(`Data: ${capitalizedDateDisplay}`, margin + 60, y);
       if (distance) {
         doc.text(`Km: ${distance}`, margin + 140, y);
       }
       
       y += 12;
       doc.setDrawColor(226, 232, 240); 
       doc.line(margin, y, pageWidth - margin, y);
       y += 12;
       
       // CONTENT
       doc.setFont('helvetica', 'normal');
       doc.setFontSize(11);
       doc.setTextColor(51, 65, 85);

       const splitContent = doc.splitTextToSize(content || 'Nessun allenamento inserito.', pageWidth - (margin * 2));
       
       // Handle multi-page content
       splitContent.forEach((line: string) => {
         if (y > pageHeight - margin) {
           doc.addPage();
           y = margin;
         }
         doc.text(line, margin, y);
         y += 7;
       });

       const dateFileStr = format(selectedDate, 'yyMMdd');
       const filename = `Programma_${activeGroup?.name.replace(/\s+/g, '')}_${dateFileStr}.pdf`;
       const pdfBlob = doc.output('blob');

       const file = new File([pdfBlob], filename, { type: 'application/pdf' });
       const canShare = navigator.canShare && navigator.canShare({ files: [file] });

       if (canShare) {
         await navigator.share({ title: 'Programma Allenamento', files: [file] });
       } else {
         const url = URL.createObjectURL(pdfBlob);
         const a = document.createElement('a');
         a.href = url;
         a.download = filename;
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
         URL.revokeObjectURL(url);
       }
    } catch (e) {
       console.error("PDF Share Error:", e);
       alert("Errore durante la generazione o la condivisione del PDF.");
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        isActive 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200' 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                      }`}
                    >
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
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center">
              <Layout className="w-4 h-4 mr-2" />
              Allenamento <span className="text-slate-900 ml-2 normal-case tracking-normal font-black">{activeGroup?.name}</span>
            </h2>
            
            {userRole === 'coach' && (
              <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm ml-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Km:</span>
                <input 
                  type="number" 
                  step="0.1"
                  value={distance}
                  onChange={(e) => { setDistance(e.target.value); setIsDirty(true); }}
                  placeholder="0.0"
                  className="w-16 bg-transparent text-sm font-bold text-slate-800 outline-none focus:ring-0"
                />
              </div>
            )}
            
            <div className="flex items-center gap-1.5">
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
