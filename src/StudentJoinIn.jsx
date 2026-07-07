import { useState, useEffect } from "react";
import { Search, MapPin, Users, Calendar, Clock, ChevronRight, Loader2, Check } from "lucide-react";
import { db } from "./lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "./context/AuthContext";
import { createNotification } from "./lib/notificationUtils";
import { api } from "./lib/api";

export default function StudentJoinIn() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Join Modal State
  const [selectedSession, setSelectedSession] = useState(null);
  const [participants, setParticipants] = useState(1);
  const [studentId, setStudentId] = useState("");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchSharedSessions();
  }, []);

  const fetchSharedSessions = async () => {
    setLoading(true);
    try {
      // Get all shared sessions from MySQL
      const data = await api.getEvents({ type: 'shared_session' });
      const todayObj = new Date();
      const yyyy = todayObj.getFullYear();
      const mm = String(todayObj.getMonth() + 1).padStart(2, '0');
      const dd = String(todayObj.getDate()).padStart(2, '0');
      const today = `${yyyy}-${mm}-${dd}`;
      const currentHour = todayObj.getHours();
      
      const available = data
        .filter(s => s.status !== 'rejected')
        .filter(s => s.date > today || (s.date === today && s.slot > currentHour))
        .filter(s => (s.currentPlayers || 1) < s.maxplayers)
        .sort((a, b) => a.date.localeCompare(b.date) || a.slot - b.slot);

      // Group contiguous sessions
      const groupedSessions = [];
      
      available.forEach(session => {
        const existingGroupIndex = groupedSessions.findIndex(group => {
            return group.courtId === session.courtId &&
                   group.date === session.date &&
                   group.studentid === session.studentid &&
                   group.maxplayers === session.maxplayers &&
                   (group.currentPlayers || 1) === (session.currentPlayers || 1) &&
                   group.endSlot === session.slot;
        });

        if (existingGroupIndex !== -1) {
            groupedSessions[existingGroupIndex].endSlot = session.slot + 1;
            groupedSessions[existingGroupIndex].events.push(session);
        } else {
            groupedSessions.push({
                ...session,
                endSlot: session.slot + 1,
                events: [session]
            });
        }
      });

      setSessions(groupedSessions);
    } catch (error) {
      console.error("Error fetching shared sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatHour = (hour) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const h = hour > 12 ? hour - 12 : hour;
    return `${h}:00 ${period}`;
  };

  const handleJoin = async () => {
    if (!user) return alert("Please sign in first.");
    if (!selectedSession || !studentId.trim()) return;

    setProcessing(true);
    try {
      let proofUrl = "";

      await Promise.all(selectedSession.events.map(async (event) => {
        await api.joinEvent(event.id, {
          studentId: user.uid,
          participantCount: participants,
          proofUrl: proofUrl,
          status: 'approved'
        });
      }));

      const timeString = selectedSession.endSlot ? `${formatHour(selectedSession.slot)} - ${formatHour(selectedSession.endSlot)}` : formatHour(selectedSession.slot);
      await createNotification(user.uid, "Join Successful!", `You have successfully joined ${selectedSession.venue} at ${timeString}.`, "event");

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSelectedSession(null);
        fetchSharedSessions();
      }, 2000);

    } catch (error) {
      console.error("Join failed", error);
      alert("Failed to join session. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      <div className="flex flex-col space-y-2">
        <h2 className="text-2xl font-black text-brand-deep tracking-tight">Join In</h2>
        <p className="text-sm text-slate-500">Find open sessions and play with others!</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-[32px] border border-slate-100 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8" />
          </div>
          <p className="text-slate-500 font-bold">No open sessions available right now.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <div key={session.events.map(e => e.id).join('-')} className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm flex flex-col relative overflow-hidden group">
              <div className="absolute top-0 right-0 bg-brand-primary/10 text-brand-primary font-black text-[10px] uppercase px-4 py-1.5 rounded-bl-[16px] tracking-widest">
                {session.sportname}
              </div>
              
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-black text-brand-deep text-lg pr-16">{session.venue}</h3>
                  <div className="flex items-center space-x-3 text-xs font-bold text-slate-400 mt-2">
                    <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> {session.date}</span>
                    <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {session.endSlot ? `${formatHour(session.slot)} - ${formatHour(session.endSlot)}` : formatHour(session.slot)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between mb-4">
                 <div className="flex items-center space-x-2">
                    <div className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center text-brand-primary">
                       <Users className="w-5 h-5" />
                    </div>
                    <div>
                       <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Availability</p>
                       <p className="text-sm font-bold text-brand-deep">
                         {session.maxplayers - (session.currentPlayers || 1)} Slots Left
                       </p>
                    </div>
                 </div>
                 <div className="text-right">
                    <p className="text-2xl font-black text-brand-primary">{session.currentPlayers || 1}<span className="text-sm text-slate-400">/{session.maxplayers}</span></p>
                 </div>
              </div>

              <button 
                onClick={() => {
                  setSelectedSession(session);
                  setParticipants(1);
                  setStudentId("");
                }}
                className="w-full py-4 bg-brand-deep hover:bg-brand-deep/90 text-white font-black rounded-2xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-brand-deep/20"
              >
                <span>Join Session</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Join Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-[40px] w-full max-w-md p-6 space-y-6 shadow-2xl animate-in zoom-in-95">
            {success ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-10 h-10" strokeWidth={3} />
                </div>
                <h3 className="text-2xl font-black text-brand-deep tracking-tight">Successfully Joined!</h3>
                <p className="text-slate-500 font-medium pb-4">You are now part of the session.</p>
              </div>
            ) : (
              <>
                <div>
                  <h3 className="text-xl font-black text-brand-deep">{selectedSession.venue}</h3>
                  <p className="text-brand-primary font-bold flex items-center mt-1">
                    <Clock className="w-4 h-4 mr-1.5" />
                    {selectedSession.date} • {selectedSession.endSlot ? `${formatHour(selectedSession.slot)} - ${formatHour(selectedSession.endSlot)}` : formatHour(selectedSession.slot)}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-brand-primary ml-2 mb-2 block">Participants Joining *</label>
                    <div className="flex items-center space-x-2">
                       <input 
                         type="number" 
                         min="1"
                         max={selectedSession.maxplayers - (selectedSession.currentPlayers || 1)}
                         value={participants}
                         onChange={(e) => setParticipants(parseInt(e.target.value) || 1)}
                         className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-primary"
                       />
                       <span className="text-xs text-slate-400 font-bold whitespace-nowrap">Person</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-brand-primary ml-2 mb-2 block">Student ID / Matrix ID *</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 2021234567"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 pt-4 border-t border-slate-100">
                  <button 
                    onClick={() => setSelectedSession(null)}
                    disabled={processing}
                    className="flex-1 py-4 font-bold text-slate-500 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleJoin}
                    disabled={processing || !studentId.trim() || participants < 1 || participants > (selectedSession.maxplayers - (selectedSession.currentPlayers || 1))}
                    className="flex-1 py-4 font-black text-white bg-brand-primary rounded-2xl hover:bg-brand-primary/90 transition-all flex items-center justify-center shadow-lg shadow-brand-primary/30 disabled:opacity-50"
                  >
                    {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Join Now"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
