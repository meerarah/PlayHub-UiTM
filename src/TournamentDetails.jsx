import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Trophy, Calendar, Clock, MapPin, Users, ChevronLeft, Loader2, Check } from "lucide-react";
import { db } from "./lib/firebase";
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "./context/AuthContext";
import { createNotification } from "./lib/notificationUtils";
import { api } from "./lib/api";


export default function TournamentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [hasRegistered, setHasRegistered] = useState(false);
  
  // Registration Form State
  const [teamName, setTeamName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedTeamSlot, setSelectedTeamSlot] = useState("");
  const [takenTeamSlots, setTakenTeamSlots] = useState([]);
  const [members, setMembers] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const getSportPlayerCount = (sport) => {
     if (!sport) return 5;
     const lower = sport.toLowerCase();
     if (lower.includes("badminton")) return 2;
     if (lower.includes("lawn bowls")) return 4;
     if (lower.includes("futsal")) return 5;
     if (lower.includes("basketball")) return 5;
     if (lower.includes("cricket") || lower.includes("kriket")) return 11;
     return 5;
  };

  useEffect(() => {
    fetchTournament();
  }, [id, user]);

  const fetchTournament = async () => {
    setLoading(true);
    try {
      // 1. Fetch tournament details from MySQL backend
      const tData = await api.getTournamentById(id);
      setTournament(tData);

      // 2. Fetch all registrations for this tournament
      const registrations = await api.getTournamentRegistrations(id);
      setRegisteredCount(registrations.length);
      
      const taken = registrations.map(d => d.teamSlot).filter(Boolean);
      setTakenTeamSlots(taken);

      // 3. Initialize team roster based on sport player count
      const count = getSportPlayerCount(tData.sport);
      let leaderName = "";
      let leaderMatrix = "";
      let leaderResidency = "College";
      let leaderCollege = "";
      let leaderPhone = "";
      if (user) {
         try {
           const dbUser = await api.getUser(user.uid);
           leaderName = dbUser.fullname || "";
           leaderMatrix = dbUser.matrixId || "";
           leaderResidency = dbUser.residencyType || "College";
           leaderCollege = dbUser.collegeName || "";
           leaderPhone = dbUser.phoneNumber || "";
         } catch (userErr) {
           console.error("Error loading user profile from MySQL:", userErr.message);
         }
      }
      setPhone(leaderPhone);

      const initialMembers = Array.from({ length: count }, (_, i) => {
         if (i === 0) {
            return { fullname: leaderName, matrixId: leaderMatrix, residencyType: leaderResidency, collegeName: leaderCollege, role: "leader" };
         }
         return { fullname: "", matrixId: "", residencyType: "College", collegeName: "Kolej Perindu", role: "member" };
      });
      setMembers(initialMembers);

      // 4. Check if user already registered (as leader or in a roster)
      if (user) {
         let isReg = registrations.some(r => r.studentID === user.uid);
         if (!isReg && leaderMatrix) {
            isReg = registrations.some(r => r.memberMatrixIds && r.memberMatrixIds.includes(leaderMatrix));
         }
         setHasRegistered(isReg);
      }
    } catch (error) {
      console.error("Error fetching tournament:", error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!user) return alert("Please sign in first.");
    if (!selectedTeamSlot) return alert("Please select a team slot.");
    if (!teamName.trim()) return alert("Please enter a team name.");
    if (!phone.trim()) return alert("Please enter a contact phone number.");

    // Validate roster inputs
    const isNumericTen = /^\d{10}$/;
    for (let i = 0; i < members.length; i++) {
       const cleanMatrixId = members[i].matrixId.trim();
       if (!members[i].fullname.trim() || !cleanMatrixId) {
          return alert(`Please fill in both name and Matrix ID for Player ${i + 1}`);
       }
       if (!isNumericTen.test(cleanMatrixId)) {
          return alert(`Invalid Matrix ID for Player ${i + 1}. It must contain only numbers and be exactly 10 digits long.`);
       }
    }

    setProcessing(true);
    try {
      const membersList = members.map((m, idx) => ({
         fullname: m.fullname.trim(),
         matrixId: m.matrixId.trim(),
         residencyType: m.residencyType,
         collegeName: m.residencyType === 'College' ? (m.collegeName || "Kolej Perindu") : "",
         role: idx === 0 ? "leader" : "member"
      }));

      const memberMatrixIds = membersList.map(m => m.matrixId).filter(Boolean);

      await api.registerTournament(tournament.id, {
        studentId: user.uid,
        teamSlot: selectedTeamSlot,
        teamName: teamName.trim(),
        phone: phone.trim(),
        participantsCount: membersList.length,
        members: membersList,
        memberMatrixIds: memberMatrixIds
      });
      
      await createNotification(user.uid, "Tournament Registration Sent!", `Your registration for ${tournament.name} is pending admin approval.`, "event");

      setSuccess(true);
    } catch (error) {
      console.error("Registration failed", error);
      alert("Failed to register. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-brand-warm">
        <Loader2 className="w-10 h-10 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (!tournament) return null;

  const isFull = registeredCount >= tournament.maxTeams;
  const isPast = tournament?.date ? new Date(tournament.date + "T23:59:59") < new Date() : false;

  if (success) {
    return (
      <div className="min-h-screen bg-brand-warm flex flex-col items-center justify-center p-6 text-center animate-in zoom-in-95">
        <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-500/20">
          <Check className="w-12 h-12" strokeWidth={3} />
        </div>
        <h2 className="text-3xl font-black text-brand-deep tracking-tight mb-2">Registration Sent!</h2>
        <p className="text-slate-500 font-medium mb-8 max-w-xs">Your team details have been sent to the admin for verification. You will be notified soon.</p>
        <button onClick={() => navigate("/")} className="bg-brand-deep text-white font-black py-4 px-8 rounded-2xl shadow-lg hover:bg-brand-deep/90 transition-all">
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-warm pb-24">
       {/* Header */}
       <header className="bg-white/80 backdrop-blur-md px-6 py-5 sticky top-0 z-40 flex items-center border-b border-brand-deep/5">
         <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-brand-deep hover:bg-slate-100 rounded-xl transition-colors mr-4">
            <ChevronLeft className="w-6 h-6" />
         </button>
         <h1 className="text-xl font-black tracking-tight text-brand-deep">Tournament Details</h1>
       </header>

       <main className="p-6 max-w-xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-slate-100">
             <div className="bg-gradient-to-br from-brand-primary to-brand-deep p-8 text-white relative overflow-hidden">
                <Trophy className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 rotate-12" />
                <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest mb-4">{tournament.sport}</span>
                <h2 className="text-3xl font-black leading-tight relative z-10">{tournament.name}</h2>
             </div>
             
             <div className="p-6 space-y-6">
                <p className="text-slate-500 font-medium leading-relaxed">
                   {tournament.description || "Join this official PlayHub tournament. Compete with other teams and win certificates!"}
                </p>

                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-slate-50 rounded-2xl p-4 flex items-start space-x-3">
                      <Calendar className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                      <div>
                         <p className="text-[10px] font-black uppercase text-slate-400">Date</p>
                         <p className="text-sm font-bold text-brand-deep">{tournament.date}</p>
                      </div>
                   </div>
                   <div className="bg-slate-50 rounded-2xl p-4 flex items-start space-x-3">
                      <Clock className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                      <div>
                         <p className="text-[10px] font-black uppercase text-slate-400">Time</p>
                         <p className="text-sm font-bold text-brand-deep">{tournament.time}</p>
                      </div>
                   </div>
                   <div className="bg-slate-50 rounded-2xl p-4 flex items-start space-x-3 col-span-2">
                      <MapPin className="w-5 h-5 text-brand-primary shrink-0 mt-0.5" />
                      <div>
                         <p className="text-[10px] font-black uppercase text-slate-400">Venue</p>
                         <p className="text-sm font-bold text-brand-deep">{tournament.venue}</p>
                      </div>
                   </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-brand-primary/5 rounded-2xl border border-brand-primary/10">
                   <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-brand-primary shadow-sm">
                         <Users className="w-5 h-5" />
                      </div>
                      <div>
                         <p className="text-[10px] font-black uppercase text-brand-primary tracking-widest">Team Slots</p>
                         <p className="text-sm font-bold text-brand-deep">{tournament.maxTeams - registeredCount} Available</p>
                      </div>
                   </div>
                   <span className="text-2xl font-black text-brand-primary">{registeredCount}<span className="text-sm text-brand-primary/50">/{tournament.maxTeams}</span></span>
                </div>
             </div>
          </div>

          {isPast && (
             <div className="bg-slate-50 rounded-[32px] p-6 text-center border border-slate-200">
                <h3 className="font-black text-slate-500 text-lg">Registration Closed</h3>
                <p className="text-slate-400 text-sm font-medium mt-1">This tournament date has passed and registration is closed.</p>
             </div>
          )}          {!hasRegistered && !isFull && !isPast && (() => {
             const allSlots = Array.from({ length: tournament.maxTeams }, (_, i) => "Team " + String.fromCharCode(65 + i));
             const availableSlots = allSlots.filter(slot => !takenTeamSlots.includes(slot));
             return (
                <form onSubmit={handleRegister} className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100 space-y-6">
                   <h3 className="font-black text-brand-deep text-lg mb-2">Register for Tournament</h3>
                   
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                       <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-brand-primary ml-2 mb-2 block">Select Team Slot *</label>
                          <select
                            required
                            value={selectedTeamSlot}
                            onChange={(e) => setSelectedTeamSlot(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-brand-primary font-bold text-slate-700"
                          >
                             <option value="">-- Select Slot --</option>
                             {availableSlots.map(slot => (
                                <option key={slot} value={slot}>{slot}</option>
                             ))}
                          </select>
                       </div>

                       <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-brand-primary ml-2 mb-2 block">Custom Team Name *</label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. Perindu Cats"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-brand-primary font-bold text-slate-700 placeholder:text-slate-400"
                          />
                       </div>

                       <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-brand-primary ml-2 mb-2 block">Contact Phone Number *</label>
                          <input
                            required
                            type="tel"
                            placeholder="e.g. 0123456789"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-brand-primary font-bold text-slate-700 placeholder:text-slate-400"
                          />
                       </div>
                    </div>

                   {/* Roster Inputs */}
                   <div className="space-y-4 pt-2">
                      <h4 className="text-xs font-black uppercase tracking-widest text-brand-primary border-b border-slate-100 pb-2">Roster Members ({members.length} Players)</h4>
                      {members.map((member, index) => (
                         <div key={index} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase">Player {index + 1} {index === 0 ? "(Leader)" : ""}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                               <input
                                 required
                                 disabled={index === 0 && member.fullname !== ""}
                                 type="text"
                                 placeholder="Full Name"
                                 value={member.fullname}
                                 onChange={(e) => {
                                    const updated = [...members];
                                    updated[index].fullname = e.target.value;
                                    setMembers(updated);
                                 }}
                                 className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-primary"
                               />
                               <input
                                 required
                                 disabled={index === 0 && member.matrixId !== ""}
                                 type="text"
                                 placeholder="Matrix ID"
                                 value={member.matrixId}
                                 onChange={(e) => {
                                    const updated = [...members];
                                    updated[index].matrixId = e.target.value;
                                    setMembers(updated);
                                 }}
                                 className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-primary"
                               />
                            </div>
                            <div>
                               <select
                                 required
                                 disabled={index === 0 && member.fullname !== ""}
                                 value={member.residencyType}
                                 onChange={(e) => {
                                    const updated = [...members];
                                    updated[index].residencyType = e.target.value;
                                    if (e.target.value === 'NR') {
                                       updated[index].collegeName = '';
                                    }
                                    setMembers(updated);
                                 }}
                                 className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-primary"
                               >
                                  <option value="College">College Resident</option>
                                  <option value="NR">Non-Resident (NR)</option>
                               </select>
                               
                               {member.residencyType === "College" && (
                                  <select
                                    required
                                    disabled={index === 0 && member.fullname !== ""}
                                    value={member.collegeName || "Kolej Perindu"}
                                    onChange={(e) => {
                                       const updated = [...members];
                                       updated[index].collegeName = e.target.value;
                                       setMembers(updated);
                                    }}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-primary"
                                  >
                                     <option value="Kolej Perindu">Kolej Perindu</option>
                                     <option value="Kolej Mawar">Kolej Mawar</option>
                                     <option value="Kolej Melati">Kolej Melati</option>
                                     <option value="Kolej Seroja">Kolej Seroja</option>
                                     <option value="Kolej Teratai">Kolej Teratai</option>
                                     <option value="Kolej Meranti">Kolej Meranti</option>
                                     <option value="Kolej Delima">Kolej Delima</option>
                                  </select>
                               )}
                            </div>
                         </div>
                      ))}
                   </div>

                   <button 
                     type="submit"
                     disabled={processing}
                     className="w-full py-4 bg-brand-primary hover:bg-brand-primary/90 text-white font-black rounded-2xl transition-all shadow-lg shadow-brand-primary/30 flex justify-center mt-4 disabled:opacity-50"
                   >
                     {processing ? <Loader2 className="w-6 h-6 animate-spin" /> : "Submit Roster Registration"}
                   </button>
                </form>
             );
          })()}
          {hasRegistered && (
             <div className="bg-green-50 rounded-[32px] p-6 text-center border border-green-100">
                <Check className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <h3 className="font-black text-green-700 text-lg">You're Registered!</h3>
                <p className="text-green-600/70 text-sm font-medium mt-1">Your team is pending admin verification.</p>
             </div>
          )}

          {isFull && !hasRegistered && !isPast && (
             <div className="bg-red-50 rounded-[32px] p-6 text-center border border-red-100">
                <h3 className="font-black text-red-700 text-lg">Tournament Full</h3>
                <p className="text-red-600/70 text-sm font-medium mt-1">All slots have been filled for this tournament.</p>
             </div>
          )}

       </main>
    </div>
  );
}
