import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { Trophy, CheckCircle, XCircle, Loader2, User, Plus, X, Calendar as CalendarIcon, Award, Download, Trash2, Edit2, FileText } from "lucide-react";
import { api } from "./lib/api";


export default function AdminTournaments() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "", sport: "Futsal", date: "", time: "", venue: "", maxTeams: 8, description: "", requestId: null
  });
  const [editingItem, setEditingItem] = useState(null);

  // Published Tournaments & Registrations States
  const [activeSubTab, setActiveSubTab] = useState("requests"); // "requests" | "published"
  const [publishedTournaments, setPublishedTournaments] = useState([]);
  const [selectedT, setSelectedT] = useState(null);
  const [tRegistrations, setTRegistrations] = useState([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [updatingRegistrationId, setUpdatingRegistrationId] = useState(null);

  useEffect(() => {
    if (activeSubTab === "requests") {
      fetchRequests();
    } else {
      fetchPublishedTournaments();
    }
  }, [activeSubTab]);

  const fetchPublishedTournaments = async () => {
    setLoading(true);
    try {
      const data = await api.getTournaments();
      setPublishedTournaments(data);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRegistrations = async (t) => {
     setSelectedT(t);
     setLoadingRegistrations(true);
     try {
        const data = await api.getTournamentRegistrations(t.id);
        setTRegistrations(data);
     } catch (err) {
        console.error(err);
     } finally {
        setLoadingRegistrations(false);
     }
  };

  const updateRegistrationStatus = async (regId, status) => {
     if (!confirm(`Are you sure you want to mark this registration as ${status}?`)) return;
     setUpdatingRegistrationId(regId);
     try {
        await api.updateTournamentRegistrationStatus(regId, status);
        setTRegistrations(prev => prev.map(r => r.id === regId ? { ...r, status } : r));
     } catch (err) {
        console.error(err);
        alert("Failed to update status");
     } finally {
        setUpdatingRegistrationId(null);
     }
  };

  const completeTournamentTeam = async (regId) => {
     if (!confirm("Complete tournament participation for this team? This will generate their E-Certificate!")) return;
     setUpdatingRegistrationId(regId);
     try {
        await api.updateTournamentRegistrationStatus(regId, "completed");
        setTRegistrations(prev => prev.map(r => r.id === regId ? { ...r, status: "completed" } : r));
        alert("Tournament completed for this team. E-Certificate issued!");
     } catch (err) {
        console.error(err);
        alert("Failed to complete tournament team");
     } finally {
        setUpdatingRegistrationId(null);
     }
  };

  const getSportCategory = (name) => {
     if (!name) return "Sport";
     const lower = name.toLowerCase();
     if (lower.includes("futsal")) return "Futsal";
     if (lower.includes("bola sepak") || lower.includes("football") || lower.includes("bola padang")) return "Bola Sepak";
     if (lower.includes("badminton")) return "Badminton";
     if (lower.includes("kriket") || lower.includes("cricket")) return "Kriket";
     if (lower.includes("netball") || lower.includes("bola jaring")) return "Bola Jaring";
     if (lower.includes("volleyball") || lower.includes("bola tampar")) return "Bola Tampar";
     if (lower.includes("basketball") || lower.includes("bola keranjang")) return "Bola Keranjang";
     if (lower.includes("ping pong") || lower.includes("table tennis")) return "Ping Pong";
     if (lower.includes("rugby") || lower.includes("ragbi")) return "Ragbi";
     return name;
  };

  const downloadEMeritReport = (residencyType) => {
       if (!tRegistrations || tRegistrations.length === 0) return;

       const filtered = [];
       tRegistrations.forEach(r => {
          if (r.members && r.members.length > 0) {
             r.members.forEach(member => {
                const mRes = member.residencyType || "College";
                if (mRes.toLowerCase() === residencyType.toLowerCase()) {
                   filtered.push({
                      studentName: member.fullname || "Unknown",
                      matrixId: member.matrixId || "N/A",
                      phone: r.phone || "N/A",
                      residencyType: mRes,
                      collegeName: member.collegeName || "",
                      certId: `${r.id}_${member.matrixId}`,
                      status: r.status || "N/A"
                   });
                }
             });
          } else {
             const pRes = r.residencyType || "College";
             if (pRes.toLowerCase() === residencyType.toLowerCase()) {
                filtered.push({
                   studentName: r.studentName || "Unknown",
                   matrixId: r.matrixId || "N/A",
                   phone: r.phone || "N/A",
                   residencyType: pRes,
                   collegeName: r.collegeName || "",
                   certId: r.id,
                   status: r.status || "N/A"
                });
             }
          }
       });

       if (filtered.length === 0) {
          alert(`No participants found with residency type: ${residencyType === 'College' ? 'College Resident' : 'Non-Resident (NR)'}`);
          return;
       }

       const headers = ["STUDENT NAME", "MATRIX ID", "PHONE NUMBER", "EVENT NAME", "SPORT CATEGORY", "RESIDENCY STATUS", "CERTIFICATE ID", "STATUS"];
       const rows = filtered.map(item => {
          const eventName = selectedT?.name || "Unknown Tournament";
          const sportCategory = getSportCategory(selectedT?.sport);
          const residencyStr = item.residencyType === "NR" ? "NR" : `COLLEGE (${item.collegeName || "Kolej Perindu"})`;
          
          return [
             item.studentName.toUpperCase(),
             item.matrixId.toUpperCase(),
             item.phone.toUpperCase(),
             eventName.toUpperCase(),
             sportCategory.toUpperCase(),
             residencyStr.toUpperCase(),
             item.certId.toUpperCase(),
             item.status.toUpperCase()
          ];
       });

      const worksheetData = [headers, ...rows];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Set column widths
      const maxColWidths = headers.map((h, i) => {
         let maxLen = h.length;
         rows.forEach(r => {
            if (r[i] && r[i].toString().length > maxLen) {
               maxLen = r[i].toString().length;
            }
         });
         return { wch: maxLen + 3 };
      });
      worksheet['!cols'] = maxColWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "e-Merit Roster");
      
      const dateStr = selectedT?.date ? selectedT.date.replace(/[^a-zA-Z0-9]/g, "_") : "Report";
      const sportStr = selectedT?.name ? selectedT.name.replace(/[^a-zA-Z0-9]/g, "_") : "Tournament";
      const filename = `eMerit_Report_${residencyType}_${sportStr}_${dateStr}.xlsx`;
      
      XLSX.writeFile(workbook, filename);
   };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await api.getTournamentRequests();
      setRequests(data);
    } catch (error) {
      console.error("Error fetching tournament requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    setProcessing(id);
    try {
      await api.updateTournamentRequestStatus(id, status);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status");
    } finally {
      setProcessing(null);
    }
  };

  const openCreateModal = (req = null) => {
    setEditingItem(null);
    if (req) {
      setFormData({
        name: `${req.sport} Tournament`,
        sport: req.sport,
        date: req.preferredDate,
        time: "09:00",
        venue: "",
        maxTeams: req.teamsCount || 8,
        description: req.description || "",
        requestId: req.id
      });
    } else {
      setFormData({
        name: "", sport: "Futsal", date: "", time: "", venue: "", maxTeams: 8, description: "", requestId: null
      });
    }
    setShowModal(true);
  };

  const handleEditTournament = (t) => {
    setEditingItem(t);
    setFormData({
      name: t.name || "",
      sport: t.sport || "Futsal",
      date: t.date || "",
      time: t.time || "09:00",
      venue: t.venue || "",
      maxTeams: t.maxTeams || 8,
      description: t.description || "",
      requestId: t.requestId || null
    });
    setShowModal(true);
  };

  const handleCreateTournament = async (e) => {
    e.preventDefault();
    setProcessing(editingItem ? "updating" : "creating");
    try {
      if (editingItem) {
        await api.updateTournament(editingItem.id, formData);
        alert("Tournament updated successfully!");
      } else {
        await api.createTournament(formData);
        
        if (formData.requestId) {
           setRequests(prev => prev.map(r => r.id === formData.requestId ? { ...r, status: 'approved' } : r));
        }
        alert("Tournament created successfully!");
      }

      setShowModal(false);
      setEditingItem(null);
      fetchPublishedTournaments();
    } catch (error) {
      console.error(error);
      alert(`Failed to ${editingItem ? 'update' : 'create'} tournament.`);
    } finally {
      setProcessing(null);
    }
  };

  const handleDeleteTournament = async (id) => {
    if (!confirm("Are you sure you want to delete this tournament? This action cannot be undone and will remove the tournament entirely.")) return;
    try {
      await api.deleteTournament(id);
      setPublishedTournaments(prev => prev.filter(t => t.id !== id));
      alert("Tournament deleted successfully!");
    } catch (error) {
      console.error("Error deleting tournament:", error);
      alert("Failed to delete tournament.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-admin-card p-6 rounded-[32px] border border-white/40 shadow-xl shadow-admin-accent/5">
        <div>
          <h2 className="text-2xl font-black text-admin-text tracking-tight uppercase flex items-center">
            <Trophy className="w-6 h-6 mr-3 text-admin-accent" /> Tournaments Control
          </h2>
          <p className="text-sm text-admin-text/60 font-bold">Manage tournament requests and publish official events.</p>
        </div>
        <button onClick={() => openCreateModal()} className="bg-admin-accent hover:bg-admin-accent/90 text-white font-black text-xs uppercase tracking-widest py-3 px-6 rounded-[20px] flex items-center shadow-lg shadow-admin-accent/20 transition-all active:scale-[0.98]">
           <Plus className="w-4 h-4 mr-2" /> Create Tournament
        </button>
      </div>

      {/* Sub-tab Selection Toggle */}
      <div className="flex space-x-4 mb-6">
         <button
           onClick={() => setActiveSubTab("requests")}
           className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-[0.98] ${
              activeSubTab === "requests" 
                ? "bg-admin-accent text-white shadow-md shadow-admin-accent/20" 
                : "bg-admin-card text-admin-text/60 hover:text-admin-text"
           }`}
         >
            Student Requests
         </button>
         <button
           onClick={() => setActiveSubTab("published")}
           className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-[0.98] ${
              activeSubTab === "published" 
                ? "bg-admin-accent text-white shadow-md shadow-admin-accent/20" 
                : "bg-admin-card text-admin-text/60 hover:text-admin-text"
           }`}
         >
            Published Tournaments
         </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 text-admin-accent animate-spin" />
        </div>
      ) : activeSubTab === "requests" ? (
        requests.length === 0 ? (
          <div className="text-center py-16 bg-admin-card rounded-[32px] border border-white/40 shadow-sm">
            <p className="text-admin-text/40 font-black uppercase tracking-wider text-sm">No tournament requests found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requests.map((req) => (
              <div key={req.id} className="bg-white/70 backdrop-blur-sm rounded-[32px] p-6 border border-white shadow-xl shadow-admin-accent/5 flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border ${
                      req.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                      req.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                      'bg-red-50 text-red-500 border-red-200'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                  <h3 className="font-black text-admin-text text-lg leading-tight mb-1">{req.sport} Tournament</h3>
                  <p className="text-[10px] text-admin-text/50 font-black uppercase tracking-wider mb-4">{req.preferredDate} • {req.teamsCount} Teams Limit</p>
                  
                  <div className="bg-admin-card/20 border border-white/40 p-4 rounded-2xl mb-4">
                    <p className="text-xs text-admin-text/80 font-medium leading-relaxed line-clamp-3">
                      {req.description || "No description provided."}
                    </p>
                  </div>

                  {req.documentBase64 ? (
                    <div className="mb-4">
                      <a 
                        href={req.documentBase64} 
                        download={req.documentName || "supporting_document"}
                        className="inline-flex items-center justify-center space-x-1.5 text-admin-accent hover:text-admin-accent/80 font-black text-[10px] uppercase tracking-wider bg-admin-accent/5 border border-admin-accent/20 px-3 py-2 rounded-xl transition-all shadow-sm w-full"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span className="truncate">View Document ({req.documentName || "Download"})</span>
                      </a>
                    </div>
                  ) : (
                    <div className="mb-4 text-center py-2.5 bg-admin-card/10 rounded-xl border border-white/40">
                      <span className="text-[10px] text-admin-text/40 font-bold uppercase tracking-wider">No document uploaded</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center space-x-2.5 mb-5">
                    <div className="w-8 h-8 bg-admin-accent/10 border border-admin-accent/15 text-admin-accent rounded-xl flex items-center justify-center font-black">
                      {req.studentName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-black text-admin-text/80 uppercase tracking-wider">{req.studentName}</span>
                  </div>

                  {req.status === 'pending' && (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        disabled={processing === req.id}
                        onClick={() => updateStatus(req.id, 'rejected')}
                        className="flex items-center justify-center py-3 bg-red-50 hover:bg-red-100 text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4 mr-2" /> Reject
                      </button>
                      <button
                        disabled={processing === req.id}
                        onClick={() => openCreateModal(req)}
                        className="flex items-center justify-center py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" /> Approve & Key In
                      </button>
                    </div>
                  )}
                  {req.status !== 'pending' && (
                    <div className="py-3 text-center bg-admin-card/30 border border-white/40 text-admin-text/50 font-black uppercase tracking-widest rounded-2xl text-[10px]">
                      Processed
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
         publishedTournaments.length === 0 ? (
            <div className="text-center py-16 bg-admin-card rounded-[32px] border border-white/40 shadow-sm">
              <p className="text-admin-text/40 font-black uppercase tracking-wider text-sm">No published tournaments found</p>
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {publishedTournaments.map((t) => {
                  const isPast = t.date ? new Date(t.date + "T23:59:59") < new Date() : false;
                  return (
                  <div key={t.id} className="bg-white/70 backdrop-blur-sm rounded-[32px] p-6 border border-white shadow-xl shadow-admin-accent/5 flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                     <div>
                        <div className="flex justify-between items-start mb-4">
                           <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border ${
                              isPast 
                                ? 'bg-slate-100 text-slate-500 border-slate-200' 
                                : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                           }`}>
                              {isPast ? 'closed' : (t.status || 'active')}
                           </span>
                            <div className="flex space-x-1 animate-in fade-in">
                               <button 
                                 onClick={() => handleEditTournament(t)}
                                 className="text-admin-text hover:text-admin-accent p-1.5 hover:bg-admin-card rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center border border-transparent hover:border-admin-card"
                                 title="Edit Tournament"
                               >
                                 <Edit2 className="w-3.5 h-3.5" />
                               </button>
                               <button 
                                 onClick={() => handleDeleteTournament(t.id)}
                                 className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center border border-transparent hover:border-red-100"
                                 title="Delete Tournament"
                               >
                                 <Trash2 className="w-3.5 h-3.5" />
                               </button>
                            </div>
                        </div>
                        <h3 className="font-black text-admin-text text-lg leading-tight mb-1">{t.name}</h3>
                        <p className="text-[10px] text-admin-text/50 font-black uppercase tracking-wider mb-4">{t.date} • {t.sport}</p>
                        
                        <div className="bg-admin-card/20 border border-white/40 p-4 rounded-2xl mb-4">
                           <p className="text-xs text-admin-text/80 font-medium leading-relaxed line-clamp-3">
                              {t.description || "No description provided."}
                           </p>
                        </div>
                     </div>

                     <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-admin-text/60 uppercase">
                           <span>Venue: {t.venue}</span>
                        </div>
                        <button
                          onClick={() => handleOpenRegistrations(t)}
                          className="w-full py-3 bg-admin-accent hover:bg-admin-accent/90 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.98] shadow-md shadow-admin-accent/20"
                        >
                           Manage Teams
                        </button>
                     </div>
                  </div>
               )})}
            </div>
         )
      )}  {/* Unified Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-admin-text/60 backdrop-blur-xl z-50 flex items-center justify-center p-4">
           <div className="bg-admin-panel border border-white/60 rounded-[40px] w-full max-w-lg shadow-2xl p-8 animate-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center mb-8">
                     <h3 className="font-black text-2xl text-admin-text uppercase tracking-tight">
                        {editingItem ? "Edit Tournament" : (formData.requestId ? "Approve & Key In" : "New Tournament")}
                     </h3>
                     <button onClick={() => { setShowModal(false); setEditingItem(null); }} className="text-admin-text/50 hover:bg-admin-card p-2.5 rounded-2xl transition-colors"><X className="w-6 h-6" /></button>
                  </div>
              
              <form onSubmit={handleCreateTournament} className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-admin-text/50 uppercase tracking-widest pl-1">Tournament Title</label>
                    <input required type="text" placeholder="Tournament Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-admin-card/50 border border-white/40 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-admin-accent text-admin-text placeholder:text-admin-text/30 font-bold" />
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-admin-text/50 uppercase tracking-widest pl-1">Sport Type</label>
                       <select required value={formData.sport} onChange={e => setFormData({...formData, sport: e.target.value})} className="w-full bg-admin-card/50 border border-white/40 p-4 rounded-2xl outline-none text-admin-text font-bold">
                          <option>Futsal</option><option>Basketball</option><option>Lawn Bowls</option><option>Badminton</option><option>Cricket</option>
                       </select>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-admin-text/50 uppercase tracking-widest pl-1">Max Teams</label>
                       <input required type="number" placeholder="8" value={formData.maxTeams} onChange={e => setFormData({...formData, maxTeams: parseInt(e.target.value)})} className="w-full bg-admin-card/50 border border-white/40 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-admin-accent text-admin-text placeholder:text-admin-text/30 font-bold" />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-admin-text/50 uppercase tracking-widest pl-1">Date</label>
                       <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-admin-card/50 border border-white/40 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-admin-accent text-admin-text font-bold" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-admin-text/50 uppercase tracking-widest pl-1">Time</label>
                       <input required type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full bg-admin-card/50 border border-white/40 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-admin-accent text-admin-text font-bold" />
                    </div>
                 </div>

                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-admin-text/50 uppercase tracking-widest pl-1">Venue Location</label>
                    <input required type="text" placeholder="e.g. Futsal Court 1" value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})} className="w-full bg-admin-card/50 border border-white/40 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-admin-accent text-admin-text placeholder:text-admin-text/30 font-bold" />
                 </div>
                 
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-admin-text/50 uppercase tracking-widest pl-1">Notes / Description</label>
                    <textarea placeholder="Additional Admin Notes..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows="3" className="w-full bg-admin-card/50 border border-white/40 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-admin-accent text-admin-text placeholder:text-admin-text/30 font-bold text-sm resize-none"></textarea>
                 </div>

                 <button disabled={processing === "creating"} className="w-full py-4 mt-6 bg-admin-accent hover:bg-admin-accent/90 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-admin-accent/30 flex justify-center items-center transition-all active:scale-95 disabled:opacity-50">
                    {processing === "creating" ? <Loader2 className="w-6 h-6 animate-spin" /> : "Publish Tournament"}
                 </button>
              </form>
            </div>
         </div>
      )}

      {/* Tournament Registrations Modal */}
      {selectedT && (
         <div className="fixed inset-0 bg-admin-text/60 backdrop-blur-xl z-50 flex items-center justify-center p-4">
            <div className="bg-admin-panel border border-white/60 rounded-[40px] w-full max-w-2xl shadow-2xl p-8 animate-in zoom-in-95 duration-200">
               <div className="flex justify-between items-start mb-6">
                  <div>
                     <h3 className="font-black text-2xl text-admin-text uppercase tracking-tight">Tournament Registrations</h3>
                     <p className="text-admin-accent font-black text-xs uppercase tracking-widest mt-1">
                        {selectedT.name} • {selectedT.date}
                     </p>
                  </div>
                  <button onClick={() => setSelectedT(null)} className="text-admin-text/50 hover:bg-admin-card p-2.5 rounded-2xl transition-colors"><X className="w-6 h-6" /></button>
               </div>

               <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-4 hide-scrollbar">
                  {loadingRegistrations ? (
                     <div className="flex flex-col items-center justify-center py-12 text-admin-text/50">
                        <Loader2 className="w-8 h-8 animate-spin mb-4" />
                        <p className="font-black uppercase tracking-widest text-xs">Syncing player records...</p>
                     </div>
                  ) : tRegistrations.length === 0 ? (
                     <div className="text-center py-12 bg-admin-card rounded-[32px] border border-white/40">
                        <p className="text-admin-text/40 font-black uppercase tracking-wider text-xs">No registered players found</p>
                     </div>
                  ) : (
                     <div className="divide-y divide-white/20">
                        {tRegistrations.map((r) => (
                           <div key={r.id} className="py-5 flex flex-col space-y-3">
                              <div className="flex justify-between items-start">
                                 <div>
                                    <div className="flex items-center space-x-2">
                                       <span className="bg-admin-accent/15 border border-admin-accent/20 text-admin-accent px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">
                                          {r.teamSlot || "Slot TBA"}
                                       </span>
                                       <h4 className="font-black text-admin-text text-base leading-tight">
                                          {r.teamName || "Individual Registration"}
                                       </h4>
                                    </div>
                                    <p className="text-xs text-admin-text/50 font-medium mt-1">Leader: {r.studentName} ({r.email})</p>
                                    {r.proofUrl && (
                                       <a href={r.proofUrl} target="_blank" rel="noreferrer" className="inline-block text-[10px] text-admin-accent underline font-bold mt-1">
                                          View Student ID proof
                                       </a>
                                    )}
                                 </div>

                                 <div className="flex items-center space-x-2 shrink-0">
                                    {r.status === 'pending' && (
                                       <>
                                          <button 
                                            disabled={updatingRegistrationId === r.id}
                                            onClick={() => updateRegistrationStatus(r.id, 'rejected')}
                                            className="bg-red-50 hover:bg-red-100 text-red-500 p-2.5 rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
                                            title="Reject"
                                          >
                                             <X className="w-4 h-4" />
                                          </button>
                                          <button 
                                            disabled={updatingRegistrationId === r.id}
                                            onClick={() => updateRegistrationStatus(r.id, 'approved')}
                                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-md shadow-emerald-500/20 font-black text-xs uppercase tracking-widest transition-all active:scale-95 cursor-pointer"
                                          >
                                             Approve
                                          </button>
                                       </>
                                    )}

                                    {r.status === 'approved' && (
                                       <button 
                                         disabled={updatingRegistrationId === r.id}
                                         onClick={() => completeTournamentTeam(r.id)}
                                         className="bg-admin-accent hover:bg-admin-accent/90 text-white px-5 py-2.5 rounded-xl shadow-md shadow-admin-accent/20 font-black text-xs uppercase tracking-widest flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                                       >
                                          {updatingRegistrationId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                                          <span>Complete & Issue Certs</span>
                                       </button>
                                    )}

                                    {r.status === 'completed' && (
                                       <div className="flex items-center space-x-1.5 text-emerald-600 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-sm">
                                          <CheckCircle className="w-4 h-4" />
                                          <span>Completed & Certs Issued</span>
                                       </div>
                                    )}

                                    {r.status === 'rejected' && (
                                       <div className="flex items-center space-x-1.5 text-red-500 bg-red-50 border border-red-100 px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-sm">
                                          <XCircle className="w-4 h-4" />
                                          <span>Rejected</span>
                                       </div>
                                    )}
                                 </div>
                              </div>

                              {/* Collapsible/List Roster view */}
                              {r.members && r.members.length > 0 && (
                                 <div className="bg-admin-card/25 border border-white/40 p-3 rounded-2xl space-y-1">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-admin-text/40 mb-1">Roster Players</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                       {r.members.map((m, idx) => (
                                          <div key={idx} className="flex justify-between items-center text-xs font-bold text-admin-text bg-white/40 px-3 py-2 rounded-xl">
                                             <span className="truncate">{m.fullname}</span>
                                             <span className="text-[10px] text-admin-text/50 shrink-0 pl-2">
                                                ID: {m.matrixId} ({m.residencyType === 'NR' ? 'NR' : 'Col'})
                                             </span>
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              )}
                           </div>
                        ))}
                     </div>
                  )}
               </div>

                <div className="mt-8 pt-6 border-t border-white/40 flex flex-col sm:flex-row sm:justify-between items-center gap-4">
                   <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      <button
                        disabled={tRegistrations.length === 0}
                        onClick={() => downloadEMeritReport('College')}
                        className="inline-flex items-center justify-center space-x-2 bg-admin-accent hover:bg-admin-accent/90 disabled:bg-admin-card disabled:text-admin-text/30 disabled:border-transparent border border-white/20 text-white px-5 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                      >
                         <Download className="w-4 h-4" />
                         <span>Export Excel for College Students</span>
                      </button>
                      <button
                        disabled={tRegistrations.length === 0}
                        onClick={() => downloadEMeritReport('NR')}
                        className="inline-flex items-center justify-center space-x-2 bg-admin-card hover:bg-white/60 disabled:bg-admin-card disabled:text-admin-text/30 disabled:border-transparent border border-white/40 text-admin-text px-5 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                      >
                         <Download className="w-4 h-4 text-admin-accent" />
                         <span>Export Excel for NR Students</span>
                      </button>
                   </div>
                   <button 
                     onClick={() => setSelectedT(null)}
                     className="w-full sm:w-auto px-8 py-3.5 bg-admin-card text-admin-text font-black rounded-2xl hover:bg-white/60 shadow-sm transition-colors text-xs uppercase tracking-widest"
                   >
                     Close View
                   </button>
                </div>
            </div>
         </div>
      )}
    </div>
  );
}
