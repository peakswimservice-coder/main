import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Save, Share2, Plus, Trash2, TrendingUp, Layout, BarChart3, ChevronDown, Check, Settings, Bell, Send } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import DatePicker, { registerLocale } from 'react-datepicker';
import { it } from 'date-fns/locale/it';
import "react-datepicker/dist/react-datepicker.css";
import { supabase } from '../supabaseClient';
import { format, subDays } from 'date-fns';

registerLocale('it', it);

// ... (Paces definitions remain the same)
const paces = [
  { id: 'A1', label: 'A1 - Aerobico Blando', color: '#93c5fd' }, 
  { id: 'A2', label: 'A2 - Aerobico Base', color: '#3b82f6' },   
  { id: 'B1', label: 'B1 - Soglia Aerobica', color: '#10b981' }, 
  { id: 'B2', label: 'B2 - Soglia Anaerobica', color: '#f59e0b'}, 
  { id: 'C1', label: 'C1 - Tolleranza Lattacida', color: '#ef4444'},
  { id: 'C2', label: 'C2 - Picco Lattacido', color: '#b91c1c'}, 
  { id: 'D',  label: 'D - Velocità/Potenza', color: '#8b5cf6'}   
];



const sessionTypes = ['Fondo', 'Velocità', 'Altro'];

export default function TrainingPlan() {
  const [groups, setGroups] = useState<any[]>([]);
  const [activeGroup, setActiveGroup] = useState<any>(null);
  const [isEditingGroups, setIsEditingGroups] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeSessionType, setActiveSessionType] = useState<string>('Fondo');
  
  const [blocks, setBlocks] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [isSendingNotification, setIsSendingNotification] = useState(false);

  // Analytics State
  const [movingAverageData, setMovingAverageData] = useState<any[]>(paces.map(p => ({ name: p.id, km: 0 })));
  const [weeklyDistributionData, setWeeklyDistributionData] = useState<any[]>([{ name: 'Nessun Dato', value: 1, color: '#cbd5e1' }]);

  // 1. Fetch available groups
  const fetchGroups = async () => {
    const { data } = await supabase.from('groups').select('*').order('name');
    if (data) {
      setGroups(data);
      if (!activeGroup && data.length > 0) {
         setActiveGroup(data.find(g => g.name === 'Agonisti') || data[0]);
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
        .select(`
          id,
          training_blocks (
            id, title, order_index,
            training_sets ( id, reps, distance_meters, description, pace, order_index )
          )
        `)
        .eq('group_id', activeGroup.id)
        .eq('date', dateStr)
        .eq('session_type', activeSessionType)
        .single();

      if (sessionData) {
        setSessionId(sessionData.id);
        // Format nested data into block state
        const loadedBlocks = sessionData.training_blocks
            .sort((a: any, b: any) => a.order_index - b.order_index)
            .map((b: any) => ({
                id: b.id,
                title: b.title,
                copyToAll: false,
                sets: b.training_sets
                  .sort((sa: any, sb: any) => sa.order_index - sb.order_index)
                  .map((s: any) => ({
                    id: s.id, reps: s.reps, distance: s.distance_meters, description: s.description || '', pace: s.pace
                  }))
            }));
        setBlocks(loadedBlocks);
      } else {
        // Prepare empty template if no session exists
        setSessionId(null);
        setBlocks([{ id: crypto.randomUUID(), title: 'Riscaldamento', sets: [], copyToAll: false }]);
      }
      setIsDirty(false);
    }

    loadSession();
  }, [selectedDate, activeGroup, activeSessionType]);

  // 3. Save Logic
  const handleSave = async () => {
    if (!activeGroup) return;
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      let currentSessionId = sessionId;

      // Upsert Session
      if (!currentSessionId) {
        const { data: newSession, error: sessionErr } = await supabase
          .from('training_sessions')
          .insert({ group_id: activeGroup.id, date: dateStr, session_type: activeSessionType, duration_minutes: 120 })
          .select().single();
        if (sessionErr) throw sessionErr;
        currentSessionId = newSession.id;
        setSessionId(currentSessionId);
      }

      // We clear existing blocks to handle deletes cleanly for now (prototype approach)
      await supabase.from('training_blocks').delete().eq('session_id', currentSessionId);

      // Re-insert blocks and sets
      for (let bIndex = 0; bIndex < blocks.length; bIndex++) {
        const block = blocks[bIndex];
        const { data: newBlock, error: blockErr } = await supabase
          .from('training_blocks')
          .insert({ session_id: currentSessionId, title: block.title, order_index: bIndex })
          .select().single();
        
        if (blockErr) throw blockErr;

        if (block.sets.length > 0) {
          const setsToInsert = block.sets.map((set: any, sIndex: number) => ({
            block_id: newBlock.id,
            reps: set.reps,
            distance_meters: set.distance,
            description: set.description,
            pace: set.pace,
            order_index: sIndex
          }));
          const { error: setErr } = await supabase.from('training_sets').insert(setsToInsert);
          if (setErr) throw setErr;
        }
      }

      // Handle duplicate blocks to other sessions
      const blocksToCopy = blocks.filter(b => b.copyToAll);
      if (blocksToCopy.length > 0) {
        const otherTypes = sessionTypes.filter(t => t !== activeSessionType);
        
        for (const oType of otherTypes) {
           let oSessionId;
           // 1. Get or create session
           const { data: existingOSession } = await supabase
             .from('training_sessions')
             .select('id')
             .eq('group_id', activeGroup.id)
             .eq('date', dateStr)
             .eq('session_type', oType)
             .maybeSingle();
             
           if (existingOSession) {
              oSessionId = existingOSession.id;
           } else {
              const { data: newOSession, error: oSessionErr } = await supabase
                .from('training_sessions')
                .insert({ group_id: activeGroup.id, date: dateStr, session_type: oType, duration_minutes: 120 })
                .select().single();
              if (oSessionErr) throw oSessionErr;
              oSessionId = newOSession.id;
           }
           
           // 2. Insert copied blocks
           for (const block of blocksToCopy) {
              // Delete existing block with the same title to prevent endless appending
              await supabase.from('training_blocks').delete().eq('session_id', oSessionId).eq('title', block.title);
              
              const { data: oBlocks } = await supabase
               .from('training_blocks')
               .select('order_index')
               .eq('session_id', oSessionId)
               .order('order_index', { ascending: false })
               .limit(1);
              let nextOrderIndex = oBlocks && oBlocks.length > 0 ? oBlocks[0].order_index + 1 : 0;

              const { data: newOBlock, error: oBlockErr } = await supabase
                .from('training_blocks')
                .insert({ session_id: oSessionId, title: block.title, order_index: nextOrderIndex })
                .select().single();
              if (oBlockErr) throw oBlockErr;

              if (block.sets.length > 0) {
                 const setsToInsert = block.sets.map((set: any, sIndex: number) => ({
                    block_id: newOBlock.id,
                    reps: set.reps,
                    distance_meters: set.distance,
                    description: set.description,
                    pace: set.pace,
                    order_index: sIndex
                 }));
                 await supabase.from('training_sets').insert(setsToInsert);
              }
           }
        }
      }

      setSaveSuccess(true);
      setIsDirty(false);
      setTimeout(() => {
        setSaveSuccess(false);
        setShowNotifyModal(true); // Open notification choice modal
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
      // Chiamiamo la nostra Serverless Function su Vercel (più sicuro e senza CORS)
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
      alert(err.message || "Errore nell'invio delle notifiche tramite OneSignal. Verifica la connessione e le chiavi.");
    } finally {
      setIsSendingNotification(false);
    }
  };

  // 4. Fetch Analytics
  useEffect(() => {
      if (!activeGroup) return;

    async function loadAnalytics() {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      try {
        const { data: weekly, error: wErr } = await supabase.rpc('get_weekly_distribution', { target_group_id: activeGroup.id, target_date: dateStr, target_session_type: activeSessionType });
        const { data: historic, error: hErr } = await supabase.rpc('get_historic_weekday_average', { target_group_id: activeGroup.id, target_date: dateStr, target_session_type: activeSessionType });

        if (!wErr && weekly && weekly.length > 0) {
          const dist = { 'A1/A2': 0, 'B1/B2': 0, 'C/D': 0 };
          weekly.forEach((row: any) => {
             if (['A1', 'A2'].includes(row.pace)) dist['A1/A2'] += Number(row.total_meters);
             else if (['B1', 'B2'].includes(row.pace)) dist['B1/B2'] += Number(row.total_meters);
             else if (['C1', 'C2', 'D'].includes(row.pace)) dist['C/D'] += Number(row.total_meters);
          });
          
          if (dist['A1/A2'] || dist['B1/B2'] || dist['C/D']) {
             setWeeklyDistributionData([
                { name: 'A1/A2', value: dist['A1/A2'], color: '#3b82f6' },
                { name: 'B1/B2', value: dist['B1/B2'], color: '#10b981' },
                { name: 'C/D', value: dist['C/D'], color: '#ef4444' }
             ]);
          } else {
             setWeeklyDistributionData([{ name: 'Nessun Dato', value: 1, color: '#cbd5e1' }]);
          }
        } else {
           setWeeklyDistributionData([{ name: 'Nessun Dato', value: 1, color: '#cbd5e1' }]);
        }

        if (!hErr && historic) {
          const mapped = paces.map(p => {
             const found = historic.find((h: any) => h.pace === p.id);
             return { name: p.id, km: found ? Number((Number(found.avg_meters) / 1000).toFixed(2)) : 0 };
          });
          setMovingAverageData(mapped);
        } else {
          setMovingAverageData(paces.map(p => ({ name: p.id, km: 0 })));
        }
      } catch (err) {
         console.error("Analytics fetch error:", err);
      }
    }
    loadAnalytics();
  }, [activeGroup, selectedDate, saveSuccess]);

  const totalVolume = blocks.reduce((acc, block) => {
    return acc + block.sets.reduce((setAcc: number, set: any) => setAcc + (Number(set.reps) * Number(set.distance)), 0);
  }, 0);

  // Helper functions for UI interaction
  const addBlock = () => { setBlocks([...blocks, { id: crypto.randomUUID(), title: 'Nuovo Blocco', sets: [], copyToAll: false }]); setIsDirty(true); };
  const removeBlock = (blockId: string) => { setBlocks(blocks.filter(b => b.id !== blockId)); setIsDirty(true); };
  const updateBlockTitle = (blockId: string, title: string) => { setBlocks(blocks.map(b => b.id === blockId ? { ...b, title } : b)); setIsDirty(true); };
  
  const addSet = (blockId: string) => {
    setBlocks(blocks.map(b => {
      if(b.id === blockId) {
         return { ...b, sets: [...b.sets, { id: crypto.randomUUID(), reps: 1, distance: 100, description: '', pace: 'A1' }]}
      }
      return b;
    }));
    setIsDirty(true);
  };
  
  const updateSet = (blockId: string, setId: string, field: string, value: any) => {
    setBlocks(blocks.map(b => {
      if (b.id === blockId) {
        return { ...b, sets: b.sets.map((s: any) => s.id === setId ? { ...s, [field]: value } : s) }
      }
      return b;
    }));
    setIsDirty(true);
  };

  const removeSet = (blockId: string, setId: string) => {
    setBlocks(blocks.map(b => {
      if (b.id === blockId) {
        return { ...b, sets: b.sets.filter((s:any) => s.id !== setId) }
      }
      return b;
    }));
    setIsDirty(true);
  };

  const handleSharePdf = async () => {
    setIsGeneratingPdf(true);
    try {
       const { jsPDF } = await import('jspdf');

       const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
       
       const margin = 20;
       const pageWidth = doc.internal.pageSize.getWidth();
       const pageHeight = doc.internal.pageSize.getHeight();
       let y = margin;
       
       const addText = (text: string, x: number, yPos: number, options: any = {}) => {
          doc.text(text, x, yPos, options);
       };

       const checkPageBreak = (neededHeight: number) => {
         if (y + neededHeight > pageHeight - margin) {
           doc.addPage();
           y = margin;
         }
       };

       // HEADER
       doc.setFont('helvetica', 'bold');
       doc.setFontSize(22);
       doc.setTextColor(30, 58, 138); // blue-900 approx
       addText('PeakSwim', margin, y);
       
       doc.setFont('helvetica', 'normal');
       doc.setFontSize(14);
       doc.setTextColor(100, 116, 139); // slate-500
       y += 8;
       addText('Programma di Allenamento', margin, y);
       y += 15;
       
       // SUBHEADER INFO
       const dateDisplay = format(selectedDate, "EEEE, d MMMM yyyy", { locale: it });
       // Capitalize first letter of day
       const capitalizedDateDisplay = dateDisplay.charAt(0).toUpperCase() + dateDisplay.slice(1);
       
       doc.setFont('helvetica', 'bold');
       doc.setFontSize(12);
       doc.setTextColor(15, 23, 42); // slate-900
       
       doc.text(`Gruppo: ${activeGroup?.name || ''}`, margin, y);
       doc.text(`Data: ${capitalizedDateDisplay}`, margin + 80, y);
       y += 8;
       doc.text(`Tipo: ${activeSessionType}`, margin, y);
       doc.text(`Volume: ${(totalVolume / 1000).toFixed(1)} km`, margin + 80, y);
       
       y += 12;
       doc.setDrawColor(226, 232, 240); // slate-200
       doc.line(margin, y, pageWidth - margin, y);
       y += 12;
       
       // BLOCKS
       blocks.forEach((block) => {
         checkPageBreak(25); // Need some space for block title
         
         doc.setFont('helvetica', 'bold');
         doc.setFontSize(14);
         doc.setTextColor(15, 23, 42); // slate-900
         
         // Block Title
         doc.text(block.title || 'Blocco senza nome', margin, y);
         
         // Block Volume
         const blockVol = block.sets.reduce((acc: number, s: any) => acc + (Number(s.reps) * Number(s.distance)), 0);
         doc.setFont('helvetica', 'normal');
         doc.setFontSize(10);
         doc.setTextColor(100, 116, 139); // slate-500
         doc.text(`Vol. ${blockVol}m`, pageWidth - margin, y, { align: 'right' });
         
         y += 10;
         
         // SETS
         block.sets.forEach((set: any) => {
           checkPageBreak(15);
           
           doc.setFont('helvetica', 'bold');
           doc.setFontSize(11);
           doc.setTextColor(51, 65, 85); // slate-700
           
           // Format distance string: N x Mm (or just Mm if N=1)
           const reps = Number(set.reps) || 1;
           const distStr = reps > 1 ? `${reps} x ${set.distance}m` : `${set.distance}m`;
           
           doc.text(distStr, margin + 5, y);
           
           // Format pace
           const activePace = paces.find(p => p.id === set.pace) || paces[0];
           doc.setFont('helvetica', 'italic');
           doc.setFontSize(10);
           doc.setTextColor(100, 116, 139); // slate-500
           doc.text(activePace.id, pageWidth - margin, y, { align: 'right' });
           
           // Format description
           doc.setFont('helvetica', 'normal');
           doc.setTextColor(71, 85, 105); // slate-600
           
           const desc = set.description || '';
           const splitDesc = doc.splitTextToSize(desc, 100);
           doc.text(splitDesc, margin + 40, y);
           
           // Calculate description height if wrapped
           const descHeight = splitDesc.length * 5;
           
           y += Math.max(8, descHeight + 3);
         });
         
         y += 6; // Space after block
       });

       const dateFileStr = format(selectedDate, 'yyMMdd');
       const filename = `Programma_${activeGroup?.name.replace(/\s+/g, '')}_${dateFileStr}.pdf`;
       const pdfBlob = doc.output('blob');

       // File for sharing
       const file = new File([pdfBlob], filename, { type: 'application/pdf' });
       const canShare = navigator.canShare && navigator.canShare({ files: [file] });

       if (canShare) {
         await navigator.share({
           title: 'Programma Allenamento',
           files: [file],
         });
       } else {
         // Fallback: download
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto pb-24 lg:pb-8">
      
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

      {/* Selectors Section - Unified Layout */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
        {/* Row 1: Groups */}
        <div className="p-3 flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center justify-between min-w-[80px]">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gruppo</span>
            <button 
              onClick={() => setIsEditingGroups(!isEditingGroups)}
              className={`sm:hidden p-1 rounded-md transition ${isEditingGroups ? 'bg-blue-100 text-blue-600' : 'text-slate-400'}`}
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
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
            
            {!isEditingGroups && (
              <button 
                onClick={() => setIsEditingGroups(true)}
                className="p-1.5 text-slate-400 hover:text-blue-500 transition"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            {isEditingGroups && (
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

        {/* Row 2: Session Types */}
        <div className="p-3 flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[80px]">Programma</span>
          <div className="flex gap-2">
            {sessionTypes.map(type => (
              <button 
                key={type}
                onClick={() => setActiveSessionType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  activeSessionType === type 
                  ? 'bg-slate-800 border-slate-800 text-white shadow-md shadow-slate-200' 
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Main Builder Column */}
        <div className="xl:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col xl:order-first lg:min-h-[700px]">
          
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30 rounded-t-2xl">
             <div className="flex items-center gap-3">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center">
                <Layout className="w-4 h-4 mr-2" />
                Dettagli <span className="text-slate-900 ml-2 normal-case tracking-normal font-black">{activeGroup?.name}</span>
              </h2>
              
              <div className="flex items-center gap-1.5">
                <button
                    onClick={handleSharePdf}
                    disabled={isDirty || isGeneratingPdf || blocks.length === 0}
                    className={`p-2 rounded-xl border transition-all ${isDirty || blocks.length === 0 ? 'opacity-30 cursor-not-allowed' : 'border-slate-200 text-slate-600 hover:bg-white hover:border-blue-300 hover:text-blue-600 active:scale-95'}`}
                    title="Condividi PDF"
                >
                  {isGeneratingPdf ? <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent animate-spin rounded-full" /> : <Share2 className="w-4 h-4" />}
                </button>
                
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className={`p-2 rounded-xl border-b-2 transition-all active:translate-y-0.5 active:border-b-0 ${saveSuccess ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-blue-600 border-blue-700 text-white hover:brightness-110 shadow-sm disabled:opacity-50'}`}
                  title="Salva"
                >
                  {saveSuccess ? <Check className="w-4 h-4" /> : 
                   isSaving    ? <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" /> : <Save className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-4">
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 uppercase tracking-tighter">
                VOL: <span className="text-blue-900 ml-1">{(totalVolume / 1000).toFixed(1)}km</span>
              </span>
            </div>
          </div>

          <div id="pdf-content" className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-6 bg-slate-50/30">
            {blocks.map((block) => (
              <div key={block.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-300">
                <div className="bg-slate-50 px-4 py-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-slate-200">
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3">
                    <input 
                      type="text" 
                      value={block.title}
                      onChange={(e) => updateBlockTitle(block.id, e.target.value)}
                      className="font-bold text-slate-800 text-sm bg-transparent outline-none focus:bg-white px-2 py-1 rounded transition border border-transparent focus:border-slate-300 w-full sm:w-auto min-w-[150px]"
                    />
                      <label className="flex items-center gap-2 cursor-pointer bg-white px-2.5 py-1 sm:py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors w-max pdf-ignore">
                        <input 
                          type="checkbox" 
                          checked={block.copyToAll || false}
                          onChange={(e) => {
                             setBlocks(blocks.map(b => b.id === block.id ? { ...b, copyToAll: e.target.checked } : b));
                             setIsDirty(true);
                          }}
                          className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 pointer-events-none"
                        />
                        <span className="text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors tracking-tight">Riporta su altri allenamenti</span>
                      </label>
                  </div>
                  
                  <div className="flex items-center space-x-2 self-end sm:self-auto">
                     <span className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-100">
                       {block.sets.reduce((acc: number, s:any) => acc + (Number(s.reps) * Number(s.distance)), 0)}m
                     </span>
                    <button onClick={() => removeBlock(block.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                
                <div className="p-2 sm:p-4 space-y-2">
                  {block.sets.map((set: any) => {
                    const activePace = paces.find(p => p.id === set.pace) || paces[0];
                    return (
                      <div key={set.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 group p-2 hover:bg-slate-50 rounded-lg transition border border-transparent hover:border-slate-100">
                        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                          <div className="flex items-center text-slate-800 font-bold bg-white border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                            <input 
                              type="number" 
                              value={set.reps || ''} 
                              onChange={(e) => updateSet(block.id, set.id, 'reps', Number(e.target.value))}
                              className="w-12 px-2 py-1.5 text-center outline-none text-sm bg-slate-50"
                            />
                            <span className="px-1 text-slate-400 font-mono text-sm">x</span>
                            <input 
                              type="number" 
                              value={set.distance || ''} 
                              onChange={(e) => updateSet(block.id, set.id, 'distance', Number(e.target.value))}
                              className="w-16 px-2 py-1.5 text-center outline-none text-sm bg-slate-50"
                              step="25"
                            />
                          </div>
                        </div>

                        <div className="flex-1 w-full pl-0 sm:pl-2">
                          <input 
                            type="text" 
                            value={set.description} 
                            onChange={(e) => updateSet(block.id, set.id, 'description', e.target.value)}
                            placeholder="Descrizione..."
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium placeholder:font-normal" 
                          />
                        </div>

                        <div className="w-full sm:w-auto shrink-0 flex items-center justify-between sm:justify-start gap-2">
                          <div className="relative flex-1 sm:flex-none">
                            <select 
                              value={set.pace}
                              onChange={(e) => updateSet(block.id, set.id, 'pace', e.target.value)}
                              className="w-full sm:w-28 appearance-none px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all pr-8 cursor-pointer"
                              style={{ color: activePace.color, borderColor: `${activePace.color}40`, backgroundColor: `${activePace.color}0a` }}
                            >
                              {paces.map(p => (
                                <option key={p.id} value={p.id} className="text-slate-800">{p.id} - {p.label.split(' - ')[1]}</option>
                              ))}
                            </select>
                            <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: activePace.color }} />
                          </div>
                          
                          <button onClick={() => removeSet(block.id, set.id)} className="p-2 text-slate-200 hover:text-red-500 bg-white border border-slate-100 hover:border-red-200 rounded-lg transition sm:opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  <div className="pt-2 px-2">
                     <button onClick={() => addSet(block.id)} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition w-full sm:w-auto justify-center">
                       <Plus className="w-3 h-3 mr-1" /> Aggiungi Riga
                     </button>
                  </div>
                </div>
              </div>
            ))}

            <button onClick={addBlock} className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:bg-slate-50 hover:border-blue-400 hover:text-blue-600 transition flex items-center justify-center">
              <Plus className="w-5 h-5 mr-2" /> Aggiungi Blocco
            </button>
          </div>
        </div>

        {/* Analytics Column - LAST in Desktop/Grid Order */}
        <div className="xl:col-span-1 space-y-6 flex flex-col xl:order-last">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex-1 shadow-blue-900/5">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center text-sm"><BarChart3 className="w-4 h-4 mr-2 text-blue-500"/> Analisi ({activeSessionType})</h3>
            </div>
            <div className="p-5 space-y-6">
               <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-500 block mb-1">Vol. Sessione</span>
                  <div className="flex items-end justify-between"><span className="text-xl font-black text-slate-800">{(totalVolume / 1000).toFixed(1)} <span className="text-sm text-slate-500 font-bold">km</span></span></div>
                </div>
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                  <span className="text-xs font-bold text-blue-600 block mb-1">Km {format(selectedDate, 'EEEE', {locale: it})} St.</span>
                  <div className="flex items-end justify-between"><span className="text-xl font-black text-blue-900">{movingAverageData.reduce((acc, curr) => acc + curr.km, 0).toFixed(1)}</span></div>
                </div>
              </div>

              {/* Chart 1: Moving Average by Pace */}
              <div className="mt-2">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Media storica {format(selectedDate, 'EEEE', {locale: it})}</h4>
                </div>
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={movingAverageData} margin={{ top: 5, right: 0, left: -30, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{fontSize: 9, fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} />
                      <YAxis tick={{fontSize: 9, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{fill: '#f8fafc'}}
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold'}}
                        formatter={(value: any) => [`${value} km`, 'Volume']}
                      />
                      <Bar dataKey="km" radius={[3, 3, 0, 0]}>
                        {movingAverageData.map((entry, index) => {
                          const paceColor = paces.find(p => p.id === entry.name)?.color || '#cbd5e1';
                          return <Cell key={`cell-${index}`} fill={paceColor} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Weekly Distribution */}
              <div className="pt-4 border-t border-slate-100 mt-4">
                <h4 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">Distribuzione Settimanale</h4>
                <div className="flex items-center">
                  <div className="w-16 h-16 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={weeklyDistributionData}
                          innerRadius={18}
                          outerRadius={28}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {weeklyDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 pl-3 space-y-1">
                    {weeklyDistributionData.slice(0, 3).map(item => (
                      <div key={item.name} className="flex items-center justify-between text-[10px] font-bold">
                        <div className="flex items-center truncate">
                          <div className="w-1.5 h-1.5 rounded-full mr-1.5 shrink-0" style={{backgroundColor: item.color}}></div>
                          <span className="text-slate-600 truncate">{item.name}</span>
                        </div>
                        <span className="text-slate-900 ml-1">{item.name === 'Nessun Dato' ? '-' : `${(item.value / 1000).toFixed(1)}k`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
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
