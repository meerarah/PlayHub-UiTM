import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { 
  Users, 
  Calendar as CalendarIcon, 
  MessageSquareShare, 
  Plus, 
  MoreVertical, 
  Loader2, 
  X, 
  Edit2, 
  Trash2, 
  AlertCircle, 
  LogOut,
  LayoutGrid,
  MapPin,
  ClipboardList,
  CheckCircle2,
  ExternalLink,
  Award,
  Clock,
  Compass,
  Download
} from "lucide-react";
import { auth, db } from "./lib/firebase";
import { 
  collection, 
  query, 
  getDocs,
  getDoc,
  doc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  orderBy, 
  getCountFromServer, 
  serverTimestamp,
  where 
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { cn } from "./lib/utils";
import { api } from "./lib/api";
import { initializeSystem } from "./lib/adminUtils";

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState("courts");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ students: 0, events: 0, feedbacks: 0 });
  
  // Data State
  const [events, setEvents] = useState([]);
  const [courts, setCourts] = useState([]);
  const [bookings, setBookings] = useState([]);
  
  // Modal / Form State
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  
  const [formData, setFormData] = useState({
    sportName: "",
    venue: "",
    date: "",
    time: "",
    maxPlayers: "",
    difficultyLevel: "Beginner",
    courtName: "",
    courtSport: "Futsal",
    courtCapacity: "",
    courtImage: ""
  });
  
  // Participant Management State
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [selectedEventParticipants, setSelectedEventParticipants] = useState(null);
  const [participantsList, setParticipantsList] = useState([]);
  const [fetchingParticipants, setFetchingParticipants] = useState(false);
  const [updatingParticipant, setUpdatingParticipant] = useState(null);

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
     if (!participantsList || participantsList.length === 0) return;

     const filtered = participantsList.filter(p => {
        const pRes = p.user?.residencyType || "College";
        return pRes.toLowerCase() === residencyType.toLowerCase();
     });

     if (filtered.length === 0) {
        alert(`No participants found with residency type: ${residencyType === 'College' ? 'College Resident' : 'Non-Resident (NR)'}`);
        return;
     }

     const headers = ["STUDENT NAME", "MATRIX ID", "EVENT NAME", "SPORT CATEGORY", "RESIDENCY STATUS", "CERTIFICATE ID", "STATUS"];
     const rows = filtered.map(p => {
        const studentName = p.user?.fullname || "Unknown";
        const matrixId = p.user?.matrixId || "N/A";
        const eventName = selectedEventParticipants?.sportname || "Unknown Event";
        const sportCategory = getSportCategory(selectedEventParticipants?.sportname);
        const residency = p.user?.residencyType || "College";
        const collegeName = p.user?.collegeName || "Kolej Perindu";
        const residencyStr = residency === "NR" ? "NR" : `COLLEGE (${collegeName})`;
        const certId = p.id || "N/A";
        const status = p.status || "N/A";
        
        return [
           studentName.toUpperCase(),
           matrixId.toUpperCase(),
           eventName.toUpperCase(),
           sportCategory.toUpperCase(),
           residencyStr.toUpperCase(),
           certId.toUpperCase(),
           status.toUpperCase()
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
     
     const dateStr = selectedEventParticipants?.date ? selectedEventParticipants.date.replace(/[^a-zA-Z0-9]/g, "_") : "Report";
     const sportStr = selectedEventParticipants?.sportname ? selectedEventParticipants.sportname.replace(/[^a-zA-Z0-9]/g, "_") : "Event";
     const filename = `eMerit_Report_${residencyType}_${sportStr}_${dateStr}.xlsx`;
     
     XLSX.writeFile(workbook, filename);
  };

  useEffect(() => {
    fetchDashboardData();
  }, [activeTab]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Stats from MySQL
      const counts = await api.getDashboardStats();
      setStats({
        students: counts.users,
        events: counts.events,
        feedbacks: counts.feedbacks
      });

      // 2. Fetch Tab Specific Data from MySQL
      if (activeTab === "events") {
        const data = await api.getEvents({ type: 'event' });
        setEvents(data);
      } else if (activeTab === "courts") {
        const courtsData = await api.getCourts();
        setCourts(courtsData);
      } else if (activeTab === "bookings") {
        const data = await api.getEvents({ type: 'full_court,shared_session' });
        setBookings(data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    if (!confirm("This will seed all 13 courts for UiTM Shah Alam Pusat Sukan. Continue?")) return;
    const res = await initializeSystem(true);
    alert(res.message);
    fetchDashboardData();
  };

  const handleDelete = async (coll, id) => {
    if (!confirm("Are you sure?")) return;
    try {
      if (coll === 'Sport_event') {
        await api.deleteEvent(id);
      } else if (coll === 'courts') {
        await api.deleteCourt(id);
      }
      fetchDashboardData();
    } catch (e) { alert("Delete failed"); }
  };

  const resetForm = () => {
    setFormData({
      sportName: "", venue: "", date: "", time: "", maxPlayers: "", difficultyLevel: "Beginner",
      courtName: "", courtSport: "Futsal", courtCapacity: "", courtImage: ""
    });
    setEditingItem(null);
    setShowModal(false);
  };

  const handleEditCourt = (c) => {
    setEditingItem(c);
    setFormData({
      sportName: "", venue: "", date: "", time: "", maxPlayers: "", difficultyLevel: "Beginner",
      courtName: c.name || "",
      courtSport: c.sport || "Futsal",
      courtCapacity: c.capacity || "",
      courtImage: c.image || ""
    });
    setShowModal(true);
  };

  const fetchParticipants = async (event) => {
    setSelectedEventParticipants(event);
    setShowParticipantModal(true);
    setFetchingParticipants(true);
    try {
      const data = await api.getEventParticipants(event.id);
      
      // Enriched with user names (for UI compatibility)
      const enriched = data.map(r => ({
        ...r,
        user: {
          fullname: r.studentName,
          email: r.email,
          phone: r.phoneNumber
        }
      }));
      setParticipantsList(enriched);
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingParticipants(false);
    }
  };

  const markAsCompleted = async (regId, studentId) => {
    if (!confirm("Confirm completion? This will issue a certificate and may award a badge!")) return;
    setUpdatingParticipant(regId);
    try {
      await api.updateParticipantStatus(regId, 'completed', studentId);
      
      // Refresh list
      fetchParticipants(selectedEventParticipants);
    } catch (e) {
      alert("Update failed");
    } finally {
      setUpdatingParticipant(null);
    }
  };

  const updateBookingStatus = async (id, status) => {
    if (!confirm(`Confirm mark booking as ${status}?`)) return;
    try {
      await api.updateBookingStatus(id, status);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    } catch (error) {
      alert("Failed to update status");
    }
  };

  const updateParticipantStatus = async (regId, status) => {
     if (!confirm(`Confirm mark participant as ${status}?`)) return;
     setUpdatingParticipant(regId);
     try {
       await api.updateParticipantStatus(regId, status);
       fetchParticipants(selectedEventParticipants);
     } catch(e) {
       alert("Failed to update");
     } finally {
       setUpdatingParticipant(null);
     }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      if (activeTab === "events") {
        const payload = {
          sportname: formData.sportName,
          venue: formData.venue,
          date: formData.date,
          time: formData.time,
          maxplayers: parseInt(formData.maxPlayers),
          difficultylevel: formData.difficultyLevel,
          adminid: user.uid,
          type: 'event',
          status: 'confirmed'
        };
        await api.createEvent(payload);
        alert("Event created successfully!");
      } else if (activeTab === "courts") {
        const payload = {
          name: formData.courtName,
          sport: formData.courtSport,
          capacity: parseInt(formData.courtCapacity),
          image: formData.courtImage.trim() || "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80",
          arena: 'Pusat Sukan'
        };
        if (editingItem) {
          await api.updateCourt(editingItem.id, payload);
          alert("Facility updated successfully!");
        } else {
          await api.createCourt(payload);
          alert("Facility added successfully!");
        }
      }
      resetForm();
      fetchDashboardData();
    } catch (err) {
      alert("Error saving data: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const renderStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {[
        { n: "Students Registered", v: stats.students, i: Users, c: "text-admin-text bg-white/60" },
        { n: "Active Bookings", v: stats.events, i: CalendarIcon, c: "text-admin-text bg-white/60" },
        { n: "Student Feedback", v: stats.feedbacks, i: MessageSquareShare, c: "text-admin-text bg-white/60" },
      ].map(s => (
        <div key={s.n} className="bg-admin-card p-6 rounded-[32px] border border-white/40 shadow-xl shadow-admin-accent/5 flex items-center space-x-4 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 group">
          <div className={`p-4 rounded-[20px] transition-transform group-hover:scale-110 shadow-sm ${s.c}`}>
            <s.i className="w-6 h-6 text-admin-accent" />
          </div>
          <div>
            <h3 className="text-3xl font-black text-admin-text leading-tight">{loading ? "..." : s.v}</h3>
            <p className="font-bold text-admin-text/60 text-xs uppercase tracking-wider mt-1">{s.n}</p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-admin-card p-6 rounded-[32px] border border-white/40 shadow-xl shadow-admin-accent/5 gap-4">
        <div>
           <h2 className="text-2xl font-black text-admin-text tracking-tight uppercase">Dashboard Control</h2>
           <p className="text-admin-text/60 text-xs mt-1.5 flex items-center font-bold">
             <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block mr-2 animate-pulse" />
             PlayHub Engine Active
           </p>
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <button onClick={handleSeed} className="flex-1 md:flex-none px-6 py-3.5 bg-white/60 hover:bg-white text-admin-text rounded-[20px] text-xs font-black uppercase tracking-wider transition-all active:scale-[0.98] shadow-sm">Seed Facilities</button>
          {activeTab === "courts" && (
            <button onClick={() => { resetForm(); setShowModal(true); }} className="flex-1 md:flex-none bg-admin-accent hover:bg-admin-accent/90 text-white font-black text-xs uppercase tracking-widest py-3.5 px-6 rounded-[20px] flex items-center justify-center space-x-2 shadow-lg shadow-admin-accent/20 transition-all active:scale-[0.98]">
               <Plus className="w-4 h-4" />
               <span>Add Facility</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 bg-admin-card p-2 rounded-[28px] border border-white/40 shadow-inner w-fit overflow-x-auto">
        {[
          { id: "courts", label: "Facilities", icon: MapPin },
          { id: "bookings", label: "Court Bookings", icon: ClipboardList },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              "flex items-center space-x-2 px-6 py-3 rounded-[20px] text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap",
              activeTab === t.id ? "bg-white text-admin-text shadow-sm" : "text-admin-text/50 hover:bg-white/40 hover:text-admin-text"
            )}
          >
            <t.icon className="w-4 h-4" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {renderStats()}

      {/* Main Content Area */}
      <div>
        {activeTab === "events" && (
          <div>
            {loading ? (
              <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-admin-accent animate-spin" /></div>
            ) : events.length === 0 ? (
              <div className="text-center py-16 bg-admin-card rounded-[32px] border border-white/40">
                 <p className="text-admin-text/40 font-black uppercase tracking-wider text-sm">No Active Events Found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map(e => (
                  <div key={e.id} className="bg-white/70 backdrop-blur-sm border border-white rounded-[32px] p-6 flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative group overflow-hidden">
                    <div className="absolute -right-6 -top-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                      <Compass className="w-32 h-32 text-admin-accent" />
                    </div>
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <span className="px-3 py-1 bg-admin-accent/10 text-admin-accent border border-admin-accent/15 rounded-lg text-[9px] font-black uppercase tracking-wider">
                          {e.difficultylevel || "Intermediate"}
                        </span>
                        <div className="flex space-x-1 relative z-10">
                          <button 
                            onClick={() => fetchParticipants(e)} 
                            className="p-2 bg-admin-accent/5 hover:bg-admin-accent/15 text-admin-accent rounded-xl transition-all"
                            title="Manage Participants"
                          >
                            <Users className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete('Sport_event', e.id)} 
                            className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all"
                            title="Delete Event"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <h4 className="text-lg font-black text-admin-text leading-snug mb-3 group-hover:text-admin-accent transition-colors line-clamp-2">{e.sportname}</h4>
                      <div className="space-y-1.5 text-xs text-admin-text/60 font-bold uppercase tracking-wider">
                        <p className="flex items-center"><MapPin className="w-3.5 h-3.5 mr-2 text-admin-accent" /> {e.venue}</p>
                        <p className="flex items-center"><CalendarIcon className="w-3.5 h-3.5 mr-2 text-admin-accent" /> {e.date} • {e.time || 'TBA'}</p>
                      </div>
                    </div>
                    <div className="border-t border-slate-100 mt-6 pt-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-admin-text/40">
                      <span>Capacity: {e.maxplayers || "Unlimited"} max</span>
                      <span className="text-admin-accent">Active Match</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "courts" && (
          <div>
            {loading ? (
              <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-admin-accent animate-spin" /></div>
            ) : courts.length === 0 ? (
              <div className="text-center py-16 bg-admin-card rounded-[32px] border border-white/40">
                 <p className="text-admin-text/40 font-black uppercase tracking-wider text-sm">No Facilities Found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courts.map(c => (
                  <div key={c.id} className="bg-white rounded-[32px] overflow-hidden hover:shadow-xl hover:-translate-y-1 border border-white/30 transition-all duration-300 flex flex-col justify-between">
                    <div className="relative h-44 bg-slate-200">
                      <img 
                        src={c.image || "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80"} 
                        alt={c.name} 
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-4 left-4 px-3 py-1 bg-white/90 text-admin-text font-black text-[9px] uppercase tracking-widest rounded-lg shadow-sm">
                        {c.sport}
                      </span>
                      <div className="absolute top-4 right-4 flex space-x-1.5 animate-in fade-in">
                        <button 
                          onClick={() => handleEditCourt(c)} 
                          className="p-2.5 bg-white hover:bg-slate-100 text-admin-text rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center border border-transparent"
                          title="Edit Facility"
                        >
                          <Edit2 className="w-4 h-4 text-admin-text" />
                        </button>
                        <button 
                          onClick={() => handleDelete('courts', c.id)} 
                          className="p-2.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center border border-transparent"
                          title="Delete Facility"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="p-6">
                      {c.arena && <p className="text-[9px] font-black text-admin-accent uppercase tracking-widest mb-1">{c.arena}</p>}
                      <h4 className="text-lg font-black text-admin-text leading-tight mb-2">{c.name}</h4>
                      <p className="text-xs font-bold text-admin-text/60">Capacity limit: {c.capacity} students / hour</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "bookings" && (
          <div>
            {loading ? (
              <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-admin-accent animate-spin" /></div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-16 bg-admin-card rounded-[32px] border border-white/40">
                 <p className="text-admin-text/40 font-black uppercase tracking-wider text-sm">No Court Bookings Found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {bookings.map(b => (
                  <div key={b.id} className="bg-white/70 backdrop-blur-sm border border-white rounded-[32px] p-6 flex flex-col justify-between hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-admin-accent/10 border border-admin-accent/15 text-admin-accent rounded-xl flex items-center justify-center font-black">
                            {b.studentName ? b.studentName.charAt(0).toUpperCase() : "S"}
                          </div>
                          <div>
                            <h4 className="font-black text-admin-text leading-tight">{b.studentName || "Student"}</h4>
                            <p className="text-[9px] text-admin-text/40 font-bold uppercase tracking-wider">ID: {b.studentid?.slice(0, 8)}...</p>
                          </div>
                        </div>
                        <span className={cn(
                          "px-3 py-1 rounded-xl text-[9px] font-black uppercase shadow-sm border",
                          b.status === 'pending' ? "bg-amber-50 text-amber-600 border-amber-200" : 
                          b.status === 'active' ? "bg-emerald-50 text-emerald-600 border-emerald-200" : 
                          "bg-red-50 text-red-500 border-red-200"
                        )}>
                          {b.status || 'active'}
                        </span>
                      </div>
                      
                      <div className="space-y-2 my-5 font-bold text-xs uppercase tracking-wider text-admin-text/60">
                        <div className="text-sm font-black text-admin-text flex items-center normal-case">
                          <MapPin className="w-4 h-4 mr-2 text-admin-accent" /> {b.venue}
                        </div>
                        <div className="flex items-center pl-6">Sport Category: {b.sportname}</div>
                        <div className="flex items-center pl-6">Slot Booked: {b.date} @ {b.slot}:00</div>
                        <div className="pl-6 text-[9px] font-black text-admin-accent uppercase tracking-widest">
                          {b.type === 'full_court' ? "Full Booking" : "Shared Session"}
                        </div>
                      </div>
                    </div>
                    
                    <div className="border-t border-slate-100 mt-4 pt-4 flex justify-between items-center">
                      {b.proofUrl ? (
                        <a 
                          href={b.proofUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="inline-flex items-center space-x-1.5 text-admin-accent font-black text-[10px] uppercase tracking-wider hover:bg-admin-accent/10 border border-admin-accent/25 px-4 py-2.5 rounded-xl transition-all shadow-sm"
                        >
                          <span>Receipt Proof</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="text-[10px] text-admin-text/30 font-bold italic">No attachment</span>
                      )}
                      
                      {b.status === 'pending' && (
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => updateBookingStatus(b.id, 'active')} 
                            className="bg-emerald-500 hover:bg-emerald-600 text-white p-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer" 
                            title="Approve"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => updateBookingStatus(b.id, 'rejected')} 
                            className="bg-red-505 hover:bg-red-600 bg-red-500 text-white p-2.5 rounded-xl shadow-lg shadow-red-500/20 transition-all active:scale-95 cursor-pointer" 
                            title="Reject"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Unified Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-admin-text/60 backdrop-blur-xl z-50 flex items-center justify-center p-4">
           <div className="bg-admin-panel border border-white/60 rounded-[40px] w-full max-w-lg shadow-2xl p-8 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-8">
                 <h3 className="font-black text-2xl text-admin-text uppercase tracking-tight">
                   {editingItem ? "Edit" : "Add"} {activeTab === "events" ? "New Event" : "Facility Court"}
                 </h3>
                 <button onClick={resetForm} className="text-admin-text/50 hover:bg-admin-card hover:text-admin-text p-2.5 rounded-2xl transition-colors"><X className="w-6 h-6" /></button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {activeTab === "events" ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-admin-text/50 uppercase tracking-widest pl-1">Event Title</label>
                      <input required type="text" placeholder="e.g. Futsal Weekly Tournament" value={formData.sportName} onChange={e => setFormData({...formData, sportName: e.target.value})} className="w-full bg-admin-card/50 border border-white/40 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-admin-accent text-admin-text placeholder:text-admin-text/30 font-bold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-admin-text/50 uppercase tracking-widest pl-1">Venue Name</label>
                      <input required type="text" placeholder="e.g. Arena 7 Futsal Court B" value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})} className="w-full bg-admin-card/50 border border-white/40 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-admin-accent text-admin-text placeholder:text-admin-text/30 font-bold" />
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
                      <label className="text-[10px] font-black text-admin-text/50 uppercase tracking-widest pl-1">Max Player Count</label>
                      <input required type="number" placeholder="10" value={formData.maxPlayers} onChange={e => setFormData({...formData, maxPlayers: e.target.value})} className="w-full bg-admin-card/50 border border-white/40 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-admin-accent text-admin-text placeholder:text-admin-text/30 font-bold" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-admin-text/50 uppercase tracking-widest pl-1">Facility Name</label>
                      <input required type="text" placeholder="e.g. Futsal Court 3" value={formData.courtName} onChange={e => setFormData({...formData, courtName: e.target.value})} className="w-full bg-admin-card/50 border border-white/40 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-admin-accent text-admin-text placeholder:text-admin-text/30 font-bold" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-admin-text/50 uppercase tracking-widest pl-1">Sport Category</label>
                        <select value={formData.courtSport} onChange={e => setFormData({...formData, courtSport: e.target.value})} className="w-full bg-admin-card/50 border border-white/40 p-4 rounded-2xl outline-none text-admin-text font-bold">
                           <option>Futsal</option><option>Badminton</option><option>Tennis</option><option>Basketball</option><option>Lawn Bowls</option><option>Cricket</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-admin-text/50 uppercase tracking-widest pl-1">Max Player Capacity</label>
                        <input required type="number" placeholder="4" value={formData.courtCapacity} onChange={e => setFormData({...formData, courtCapacity: e.target.value})} className="w-full bg-admin-card/50 border border-white/40 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-admin-accent text-admin-text placeholder:text-admin-text/30 font-bold" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-admin-text/50 uppercase tracking-widest pl-1">Facility Photo Image URL</label>
                      <input type="text" placeholder="e.g. https://images.unsplash.com/..." value={formData.courtImage} onChange={e => setFormData({...formData, courtImage: e.target.value})} className="w-full bg-admin-card/50 border border-white/40 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-admin-accent text-admin-text placeholder:text-admin-text/30 font-bold" />
                    </div>
                  </>
                )}
                <button disabled={creating} className="w-full py-4 mt-6 bg-admin-accent hover:bg-admin-accent/90 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-admin-accent/30 flex justify-center items-center transition-all active:scale-95">
                   {creating ? <Loader2 className="w-6 h-6 animate-spin" /> : "Save Changes"}
                </button>
              </form>
           </div>
        </div>
      )}

      {/* Participant Management Modal */}
      {showParticipantModal && (
        <div className="fixed inset-0 bg-admin-text/60 backdrop-blur-xl z-[60] flex items-center justify-center p-4">
           <div className="bg-admin-panel border border-white/60 rounded-[40px] w-full max-w-2xl shadow-2xl p-8 animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-start mb-8">
                 <div>
                    <h3 className="font-black text-2xl text-admin-text uppercase tracking-tight">Active Players</h3>
                    <p className="text-admin-accent font-black text-xs uppercase tracking-widest mt-1.5">
                      {selectedEventParticipants?.sportname} • {selectedEventParticipants?.date}
                    </p>
                 </div>
                 <button 
                   onClick={() => setShowParticipantModal(false)} 
                   className="text-admin-text/50 hover:bg-admin-card hover:text-admin-text p-2.5 rounded-2xl transition-all"
                 >
                   <X className="w-6 h-6" />
                 </button>
              </div>

              <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-4 hide-scrollbar">
                 {fetchingParticipants ? (
                    <div className="flex flex-col items-center justify-center py-12 text-admin-text/50">
                       <Loader2 className="w-8 h-8 animate-spin mb-4" />
                       <p className="font-black uppercase tracking-widest text-xs">Syncing player records...</p>
                    </div>
                 ) : participantsList.length === 0 ? (
                    <div className="text-center py-12 bg-admin-card rounded-[32px] border border-white/40">
                       <p className="text-admin-text/40 font-black uppercase tracking-wider text-xs">No registered participants</p>
                    </div>
                 ) : (
                    <div className="divide-y divide-white/20">
                       {participantsList.map(p => (
                          <div key={p.id} className="py-4 flex items-center justify-between">
                             <div className="flex items-center space-x-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/60 text-admin-accent border border-white/50 shadow-sm flex items-center justify-center font-black">
                                   {p.user.fullname.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                   <h4 className="font-black text-admin-text leading-tight">{p.user.fullname}</h4>
                                   <p className="text-xs text-admin-text/50 font-bold">{p.user.email}</p>
                                </div>
                             </div>
                             
                             {p.status === 'completed' ? (
                                <div className="flex items-center space-x-2 text-emerald-600 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-sm">
                                   <CheckCircle2 className="w-4 h-4" />
                                   <span>Awarded</span>
                                </div>
                             ) : p.status === 'pending' ? (
                                <div className="flex space-x-2">
                                  {p.proofUrl && (
                                     <a href={p.proofUrl} target="_blank" rel="noreferrer" className="flex items-center bg-white border border-admin-accent/20 text-admin-accent px-3 py-2 rounded-xl text-xs font-black hover:bg-white shadow-sm transition-colors">
                                       <ExternalLink className="w-3.5 h-3.5 mr-1" /> View Proof
                                     </a>
                                  )}
                                  <button onClick={() => updateParticipantStatus(p.id, 'joined')} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 flex items-center transition-all active:scale-95">
                                     <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve
                                  </button>
                                  <button onClick={() => updateParticipantStatus(p.id, 'rejected')} className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 flex items-center transition-all active:scale-95">
                                     <X className="w-3.5 h-3.5 mr-1" /> Reject
                                  </button>
                                </div>
                             ) : (
                                <button
                                  disabled={updatingParticipant === p.id}
                                  onClick={() => markAsCompleted(p.id, p.studentid)}
                                  className="bg-admin-accent hover:bg-admin-accent/80 disabled:opacity-50 text-white px-5 py-2.5 rounded-[16px] text-[10px] uppercase tracking-widest font-black shadow-lg shadow-admin-accent/20 transition-all active:scale-95 flex items-center cursor-pointer"
                                >
                                   {updatingParticipant === p.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Award className="w-4 h-4 mr-2" />}
                                   Complete Match
                                </button>
                             )}
                          </div>
                       ))}
                    </div>
                 )}
              </div>
              
              <div className="mt-8 pt-6 border-t border-white/40 flex flex-col sm:flex-row sm:justify-between items-center gap-4">
                 <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <button
                      disabled={participantsList.length === 0}
                      onClick={() => downloadEMeritReport('College')}
                      className="inline-flex items-center justify-center space-x-2 bg-admin-accent hover:bg-admin-accent/90 disabled:bg-admin-card disabled:text-admin-text/30 disabled:border-transparent border border-white/20 text-white px-5 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                    >
                       <Download className="w-4 h-4" />
                       <span>Export Excel for College Students</span>
                    </button>
                    <button
                      disabled={participantsList.length === 0}
                      onClick={() => downloadEMeritReport('NR')}
                      className="inline-flex items-center justify-center space-x-2 bg-admin-card hover:bg-white/60 disabled:bg-admin-card disabled:text-admin-text/30 disabled:border-transparent border border-white/40 text-admin-text px-5 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                    >
                       <Download className="w-4 h-4 text-admin-accent" />
                       <span>Export Excel for NR Students</span>
                    </button>
                 </div>
                 <button 
                   onClick={() => setShowParticipantModal(false)}
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
