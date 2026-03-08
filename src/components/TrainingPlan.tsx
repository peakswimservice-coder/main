import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Save, Plus, Trash2, TrendingUp, Activity, BarChart3, ChevronDown, Check, Settings } from 'lucide-react';
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
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error("Save Error: ", e);
      alert("Errore durante il salvataggio.");
    } finally {
      setIsSaving(false);
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
  const addBlock = () => setBlocks([...blocks, { id: crypto.randomUUID(), title: 'Nuovo Blocco', sets: [], copyToAll: false }]);
  const removeBlock = (blockId: string) => setBlocks(blocks.filter(b => b.id !== blockId));
  const updateBlockTitle = (blockId: string, title: string) => setBlocks(blocks.map(b => b.id === blockId ? { ...b, title } : b));
  
  const addSet = (blockId: string) => {
    setBlocks(blocks.map(b => {
      if(b.id === blockId) {
         return { ...b, sets: [...b.sets, { id: crypto.randomUUID(), reps: 1, distance: 100, description: '', pace: 'A1' }]}
      }
      return b;
    }));
  };
  
  const updateSet = (blockId: string, setId: string, field: string, value: any) => {
    setBlocks(blocks.map(b => {
      if (b.id === blockId) {
        return { ...b, sets: b.sets.map((s: any) => s.id === setId ? { ...s, [field]: value } : s) }
      }
      return b;
    }));
  };

  const removeSet = (blockId: string, setId: string) => {
    setBlocks(blocks.map(b => {
      if (b.id === blockId) {
        return { ...b, sets: b.sets.filter((s:any) => s.id !== setId) }
      }
      return b;
    }));
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500 pb-24 lg:pb-0">
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center">
            <Activity className="w-8 h-8 mr-3 text-blue-600 bg-blue-100 p-1.5 rounded-xl" />
            Training Builder
          </h1>
          <p className="text-slate-500 mt-1 pl-11">Pianifica le sessioni supportato dai dati di carico.</p>
        </div>
        
        <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-xl p-1 shadow-sm w-full sm:w-auto overflow-hidden">
          <button onClick={() => setSelectedDate(subDays(selectedDate, 1))} className="p-2 hover:bg-slate-50 rounded-lg text-slate-600 transition shrink-0"><ChevronLeft className="w-5 h-5" /></button>
          
          <div className="flex-1 flex items-center justify-center space-x-2 px-1 py-1 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100 transition min-w-[200px] relative">
             <DatePicker 
                selected={selectedDate} 
                onChange={(date: Date | null) => date && setSelectedDate(date)} 
                locale="it"
                dateFormat="EEE, d MMMM ''yy"
                className="bg-transparent font-bold text-slate-800 text-sm text-center w-full outline-none cursor-pointer"
             />
             <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
          </div>

          <button onClick={() => setSelectedDate(subDays(selectedDate, -1))} className="p-2 hover:bg-slate-50 rounded-lg text-slate-600 transition shrink-0"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        
        {/* Colonna Sinistra: Gruppi & Analytics */}
        <div className="xl:col-span-1 space-y-6 flex flex-col">
          
          {/* Selettore Gruppi dal DB */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden shrink-0">
             <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Gruppi</h3>
              <button 
                onClick={() => setIsEditingGroups(!isEditingGroups)}
                className={`p-1.5 rounded-lg transition ${isEditingGroups ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-blue-500 hover:bg-slate-100'}`}
                title="Gestisci Gruppi"
              >
                {isEditingGroups ? <Check className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
              </button>
            </div>
            <div className="p-2 flex xl:flex-col gap-2 overflow-x-auto xl:overflow-x-visible no-scrollbar">
              {groups.map((group) => {
                const isActive = activeGroup?.id === group.id && !isEditingGroups;
                return (
                  <div key={group.id} className="relative group/btn">
                    {isEditingGroups ? (
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          defaultValue={group.name}
                          onBlur={async (e) => {
                             if (e.target.value !== group.name && e.target.value.trim() !== '') {
                               const {error} = await supabase.from('groups').update({name: e.target.value}).eq('id', group.id);
                               if(!error) { fetchGroups(); if(activeGroup?.id === group.id) setActiveGroup({...activeGroup, name: e.target.value}); }
                             }
                          }}
                          className="w-full px-2 py-1.5 text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        />
                        <button 
                          onClick={async () => {
                             const {error} = await supabase.from('groups').delete().eq('id', group.id);
                             if(error) alert("Impossibile eliminare: ci sono allenamenti associati a questo gruppo.");
                             else fetchGroups();
                          }}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setActiveGroup(group)}
                        className={`w-full min-w-[150px] xl:min-w-0 xl:w-full text-left p-3 rounded-xl transition shrink-0 border relative ${
                          isActive 
                          ? 'bg-blue-50 border-blue-200 shadow-sm' 
                          : 'bg-white border-transparent hover:bg-slate-50 border-slate-100'
                        }`}
                      >
                        <span className={`block font-bold ${isActive ? 'text-blue-800' : 'text-slate-700'}`}>{group.name}</span>
                        {isActive && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500"></div>}
                      </button>
                    )}
                  </div>
                )
              })}
              
              {isEditingGroups && (
                <button
                  onClick={async () => {
                    const {error} = await supabase.from('groups').insert({name: 'Nuovo Gruppo'});
                    if(!error) fetchGroups();
                  }}
                  className="w-full mt-2 py-2 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 text-sm font-bold hover:bg-slate-50 hover:text-blue-600 transition flex items-center justify-center"
                >
                  <Plus className="w-4 h-4 mr-1" /> Aggiungi Gruppo
                </button>
              )}
            </div>
          </div>

          {/* Analytics Panel */}
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
              <div className="mt-6">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Media ultimi {format(selectedDate, 'EEEE', {locale: it})}</h4>
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold">Per Andatura</span>
                </div>
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={movingAverageData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} />
                      <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{fill: '#f8fafc'}}
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold'}}
                        formatter={(value: any) => [`${value} km`, 'Volume']}
                      />
                      <Bar dataKey="km" radius={[4, 4, 0, 0]}>
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
              <div className="pt-4 border-t border-slate-100 mt-6">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Distribuzione in Sett.</h4>
                <div className="flex items-center">
                  <div className="w-20 h-20 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={weeklyDistributionData}
                          innerRadius={25}
                          outerRadius={35}
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
                  <div className="flex-1 pl-4 space-y-2">
                    {weeklyDistributionData.map(item => (
                      <div key={item.name} className="flex items-center justify-between text-xs font-bold">
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full mr-2" style={{backgroundColor: item.color}}></div>
                          <span className="text-slate-600 truncate">{item.name}</span>
                        </div>
                        <span className="text-slate-900 ml-2">{item.name === 'Nessun Dato' ? '-' : `${item.value} m`}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Colonna Destra: Builder Interattivo */}
        <div className="xl:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col lg:min-h-[700px]">
          
          <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-slate-50/50 rounded-t-2xl">
             <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center">
                Programma <span className="text-blue-600 ml-2 bg-blue-100 px-3 py-1 rounded-lg text-lg hidden sm:inline-block">{activeGroup?.name}</span>
              </h2>
              
              {/* Type Tabs */}
              <div className="flex bg-slate-200/50 p-1 rounded-xl w-fit mt-3">
                 {sessionTypes.map(type => (
                   <button 
                     key={type}
                     onClick={() => setActiveSessionType(type)}
                     className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                       activeSessionType === type ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                     }`}
                   >
                     {type}
                   </button>
                 ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3">
                <span className="text-sm font-bold text-blue-800 flex items-center bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-100">
                  <TrendingUp className="w-4 h-4 mr-1.5 text-blue-500" /> 
                  Volume Previsto: <span className="text-blue-900 ml-1.5 font-black">{(totalVolume / 1000).toFixed(1)} km</span>
                </span>
              </div>
            </div>
            
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className={`${saveSuccess ? 'bg-emerald-500 border-emerald-600' : 'bg-blue-600 border-blue-700'} text-white border-b-4 px-6 py-2.5 rounded-xl font-bold flex items-center justify-center hover:brightness-110 active:border-b-0 active:translate-y-1 transition-all w-full sm:w-auto disabled:opacity-50`}
            >
              {saveSuccess ? <><Check className="w-5 h-5 mr-2" /> Salvato!</> : 
               isSaving    ? "Salvataggio..." : <><Save className="w-5 h-5 mr-2" /> Salva Sessione</>}
            </button>
          </div>

          <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-6 bg-slate-50/30">
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
                    <label className="flex items-center gap-2 cursor-pointer bg-white px-2.5 py-1 sm:py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors w-max">
                      <input 
                        type="checkbox" 
                        checked={block.copyToAll || false}
                        onChange={(e) => setBlocks(blocks.map(b => b.id === block.id ? { ...b, copyToAll: e.target.checked } : b))}
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
      </div>
    </div>
  );
}
