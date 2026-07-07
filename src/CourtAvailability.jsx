import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Clock, Users, ChevronRight, Check, Loader2, MapPin, Search } from "lucide-react";
import { db } from "./lib/firebase";
import { collection, query, getDocs, getDoc, addDoc, where, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "./context/AuthContext";
import { cn } from "./lib/utils";
import { createNotification } from "./lib/notificationUtils";
import { api } from "./lib/api";

// Define the standard operational hours (24h format) available for court bookings at Pusat Sukan
const AVAILABLE_SLOTS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20, 21];

export default function CourtAvailability() {
  const { user } = useAuth(); // Auth context for user identification
  const [courts, setCourts] = useState([]); // Stores all court facilities fetched from Firestore
  const [events, setEvents] = useState([]); // Stores all booked/active events for the selected date
  const [loading, setLoading] = useState(true); // Loading state for data fetching
  
  // Selection State for filtering courts & schedules
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // Default to today's date
  const [selectedArena, setSelectedArena] = useState("All"); // Arena filter (e.g. Arena 1, Arena 2, etc.)
  
  // Booking Modal State (used for handling the user's booking workflow)
  const [selectedSlot, setSelectedSlot] = useState(null); // The hour slot currently being booked
  const [selectedCourt, setSelectedCourt] = useState(null); // The specific court document being booked
  const [bookingMode, setBookingMode] = useState(null); // 'full_court' (private), 'shared_session' (open group), or 'join' (adding to open group)
  const [maxDuration, setMaxDuration] = useState(1); // Dynamic max booking duration (hours) allowed based on subsequent slots
  const [isModalOpen, setIsModalOpen] = useState(false); // Controls booking modal visibility
  const [processing, setProcessing] = useState(false); // True during database write/submission
  const [bookingStep, setBookingStep] = useState(1); // Multi-step modal navigation (1: Choose type, 2: Form/Details, 3: Success)
  const [formData, setFormData] = useState({
    fullName: "",
    matrixId: "",
    course: "",
    phone: "",
    participants: "",
    maxPlayers: "10",
    duration: 1
  });

  // Fetch active student profile data from Firestore to autofill the booking form
  useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        try {
          const uDoc = await getDoc(doc(db, "users", user.uid));
          if (uDoc.exists()) {
            const data = uDoc.data();
            setFormData(prev => ({
              ...prev,
              fullName: data.fullname || "",
              matrixId: data.matrixId || "",
              course: data.course || "",
              phone: data.phone || ""
            }));
          }
        } catch (e) {}
      };
      fetchProfile();
    }
  }, [user]);

  // Refetch database events/bookings whenever the selected calendar date changes
  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  // Fetch both court configurations from MySQL and all active sport events for the chosen date from Firestore
  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Courts list from MySQL
      const courtsData = await api.getCourts();
      setCourts(courtsData);

      // Fetch Events/bookings for the selected date only from MySQL
      const eventsData = await api.getEvents({ date: selectedDate });
      setEvents(eventsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const arenas = ["All", ...new Set(courts.map(c => c.arena).filter(Boolean))].sort();
  const filteredCourts = selectedArena === "All" ? courts : courts.filter(c => c.arena === selectedArena);

  // Check the booking availability of a specific time slot on a court
  const getSlotStatus = (courtId, hour) => {
    const event = events.find(e => e.courtId === courtId && e.slot === hour && e.status !== "rejected");
    if (!event) return { status: "available" }; // Green slot: Free to book
    if (event.type === "full_court") return { status: "booked", event }; // Grey slot: Fully reserved
    if (event.type === "shared_session") {
      const isFull = event.currentPlayers >= event.maxplayers;
      return { status: isFull ? "booked" : "joinable", event }; // Blue slot: Open session with space to join
    }
    return { status: "booked", event };
  };

  const formatHour = (hour) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const h = hour > 12 ? hour - 12 : hour;
    return `${h}:00 ${period}`;
  };

  const formatHourRange = (hour) => {
    const formatSingle = (h) => {
      const period = h >= 12 ? 'PM' : 'AM';
      let formattedH = h > 12 ? h - 12 : h;
      if (formattedH === 0) formattedH = 12;
      return `${formattedH}:00 ${period}`;
    };
    return `${formatSingle(hour)} - ${formatSingle(hour + 1)}`;
  };

  // Opens the booking confirmation modal and calculates maximum booking duration based on consecutive free slots
  const openBookingModal = (court, hour, slotStatus) => {
    if (!user) return alert("Please sign in to book a court.");
    setSelectedCourt(court);
    setSelectedSlot(hour);
    
    if (slotStatus.status === "available") {
      setBookingMode("full_court"); // Default configuration for a new booking
      
      // Calculate how many consecutive hours (up to 3 max) the student can book without hitting existing bookings
      let maxD = 1;
      let curr = hour;
      for (let i = 2; i <= 3; i++) {
        const nextIdx = AVAILABLE_SLOTS.indexOf(curr);
        if (nextIdx !== -1 && nextIdx + 1 < AVAILABLE_SLOTS.length) {
          const nextSlot = AVAILABLE_SLOTS[nextIdx + 1];
          if (nextSlot === curr + 1) {
            const nextEvent = events.find(e => e.courtId === court.id && e.slot === nextSlot);
            if (!nextEvent) {
               maxD = i;
               curr = nextSlot;
            } else {
               break;
            }
          } else {
            break;
          }
        } else {
          break;
        }
      }
      setMaxDuration(maxD);
      setFormData(prev => ({ ...prev, duration: 1 }));
    } else if (slotStatus.status === "joinable") {
      setBookingMode("join"); // Player is joining an existing shared session
      setMaxDuration(1);
      setFormData(prev => ({ ...prev, duration: 1 }));
    }
    
    setBookingStep(1);
    setIsModalOpen(true);
  };

  // Processes and submits the booking or join reservation to Firestore
  const handleBooking = async () => {
    const cleanMatrixId = formData.matrixId.trim();
    const isNumericTen = /^\d{10}$/;
    if (!isNumericTen.test(cleanMatrixId)) {
      alert("Invalid Student ID. It must contain only numbers and be exactly 10 digits long.");
      return;
    }

    setProcessing(true);
    try {
      let proofUrl = ""; // Placeholder for booking receipt/proof if required

      if (bookingMode === "join") {
        // Find existing open session event in Firestore
        const event = events.find(e => e.courtId === selectedCourt.id && e.slot === selectedSlot);
        if (!event) throw new Error("Event not found");

        const participantsToAdd = parseInt(formData.participants) || 1;
        const remainingSlots = event.maxplayers - (event.currentPlayers || 1);
        
        // Ensure we do not exceed the capacity limit of the shared session
        if (participantsToAdd > remainingSlots) {
           alert(`Cannot join! Only ${remainingSlots} slots remaining.`);
           setProcessing(false);
           return;
        }

        // Add a registration record linking the user to the shared event
        // Add a registration record linking the user to the shared event
        await api.joinEvent(event.id, {
          studentId: user.uid,
          participantCount: participantsToAdd,
          proofUrl: proofUrl,
          status: 'approved'
        });
        
        // Trigger in-app notification to the joining user
        await createNotification(user.uid, "Join Successful!", `You have successfully joined ${selectedCourt.name} at ${formatHour(selectedSlot)}.`, "event");
      } else {
        // Create new private booking (full_court) or shared session (shared_session)
        const slotsToBook = [selectedSlot];
        let currentS = selectedSlot;
        
        // Populate array of hours to book if duration is > 1 hour
        for (let i = 1; i < formData.duration; i++) {
           const nextIdx = AVAILABLE_SLOTS.indexOf(currentS);
           if (nextIdx !== -1 && nextIdx + 1 < AVAILABLE_SLOTS.length) {
              const nextS = AVAILABLE_SLOTS[nextIdx + 1];
              slotsToBook.push(nextS);
              currentS = nextS;
           }
        }

        // Write each hour slot as an individual event document in MySQL
        for (const s of slotsToBook) {
            const eventDoc = await api.createEvent({
              courtid: selectedCourt.id,
              sportname: selectedCourt.sport,
              venue: selectedCourt.name,
              date: selectedDate,
              slot: s,
              type: bookingMode,
              maxplayers: bookingMode === "full_court" ? selectedCourt.capacity : (parseInt(formData.maxPlayers) || 10),
              currentPlayers: parseInt(formData.participants) || 1,
              studentid: user.uid,
              studentName: formData.fullName,
              matrixId: formData.matrixId,
              course: formData.course,
              phone: formData.phone,
              proofUrl: proofUrl,
              status: "approved"
            });

            // Register the creator to the event so it appears in their user calendar
            await api.joinEvent(eventDoc.id, {
              studentId: user.uid,
              participantCount: parseInt(formData.participants) || 1,
              proofUrl: proofUrl,
              status: 'approved'
            });
        }

        // Trigger confirmation notification for the new booking
        await createNotification(user.uid, "Booking Confirmed!", `Your ${bookingMode === 'full_court' ? 'private' : 'shared'} session at ${selectedCourt.name} has been confirmed.`, "booking");
      }
      
      setBookingStep(3); // Shift modal step to the success screen
      fetchData(); // Refetch database data to update UI instantly
    } catch (error) {
      console.error("Booking failed", error);
      alert("Failed to process request. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      <div className="flex flex-col space-y-2">
        <h2 className="text-2xl font-black text-brand-deep tracking-tight">Court Availability</h2>
        <p className="text-sm text-slate-500">Book your sessions at UiTM Shah Alam Pusat Sukan</p>
      </div>

      {/* Filters */}
      <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
        <div className="relative flex-none">
          <input 
            type="date" 
            min={new Date().toISOString().split('T')[0]}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="pl-10 pr-4 py-3 bg-white border border-slate-100 shadow-sm rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <CalendarIcon className="w-5 h-5 text-brand-primary absolute left-3 top-3.5" />
        </div>
        
        {arenas.map(arena => (
          <button
            key={arena}
            onClick={() => setSelectedArena(arena)}
            className={cn(
              "px-5 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all",
              selectedArena === arena ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/30" : "bg-white text-slate-600 border border-slate-100 hover:border-brand-primary/30"
            )}
          >
            {arena}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center p-10">
          <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {filteredCourts.length === 0 && (
             <div className="text-center p-8 bg-slate-50 rounded-2xl">
               <p className="text-slate-500">No courts found.</p>
             </div>
          )}
          
          {filteredCourts.map(court => (
            <div key={court.id} className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center space-x-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0">
                   <img src={court.image} alt={court.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary bg-brand-primary/10 px-2 py-0.5 rounded-md">
                      {court.sport}
                    </span>
                    <span className="text-xs font-bold text-slate-400 flex items-center">
                       <MapPin className="w-3 h-3 mr-1" /> {court.arena || "Arena"}
                    </span>
                  </div>
                  <h3 className="font-bold text-brand-deep text-lg mt-1">{court.name}</h3>
                </div>
              </div>

              {/* Time Slots Grid */}
              <div className="p-4">
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                  {AVAILABLE_SLOTS.map(hour => {
                    const status = getSlotStatus(court.id, hour);
                    const isAvailable = status.status === "available";
                    const isJoinable = status.status === "joinable";
                    const isBooked = status.status === "booked";

                    const today = new Date();
                    const yyyy = today.getFullYear();
                    const mm = String(today.getMonth() + 1).padStart(2, '0');
                    const dd = String(today.getDate()).padStart(2, '0');
                    const todayStr = `${yyyy}-${mm}-${dd}`;
                    const currentHour = today.getHours();

                    const isPast = selectedDate < todayStr || (selectedDate === todayStr && hour <= currentHour);
                    const isDisabled = isBooked || isPast;

                    return (
                      <button
                        key={hour}
                        disabled={isDisabled}
                        onClick={() => openBookingModal(court, hour, status)}
                        className={cn(
                          "py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition-all border",
                          isDisabled ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed" :
                          isAvailable ? "bg-white border-green-200 text-green-700 hover:bg-green-50" :
                          "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                        )}
                      >
                        <span>{formatHourRange(hour)}</span>
                        {isJoinable && <span className="text-[9px] mt-0.5 px-1.5 bg-blue-200 text-blue-800 rounded-full">{status.event.currentPlayers}/{status.event.maxplayers}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Modal */}
      {isModalOpen && selectedCourt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-[40px] w-full max-w-md p-6 space-y-6 shadow-2xl animate-in zoom-in-95">
            {bookingStep === 3 ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-10 h-10" strokeWidth={3} />
                </div>
                <h3 className="text-2xl font-black text-brand-deep tracking-tight">Successfully Submitted!</h3>
                <p className="text-slate-500 font-medium pb-4">Your booking has been confirmed.</p>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-4 font-black text-white bg-brand-primary rounded-2xl hover:bg-brand-primary/90 transition-all shadow-lg shadow-brand-primary/30 active:scale-95"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div>
                  <h3 className="text-xl font-black text-brand-deep">{selectedCourt.name}</h3>
                  <p className="text-brand-primary font-bold flex items-center mt-1">
                    <Clock className="w-4 h-4 mr-1.5" />
                    {selectedDate} • {formatHour(selectedSlot)}
                  </p>
                </div>

                {bookingStep === 1 && (
                  <>
                    {bookingMode !== "join" ? (
                      <div className="space-y-3">
                        <p className="text-sm font-bold text-slate-600 mb-2">Select Session Type:</p>
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            onClick={() => setBookingMode("full_court")}
                            className={cn(
                              "p-4 rounded-2xl border-2 flex flex-col items-center text-center transition-all",
                              bookingMode === "full_court" ? "border-brand-primary bg-brand-primary/5 text-brand-primary" : "border-slate-100 text-slate-500 hover:border-slate-200"
                            )}
                          >
                            <Users className="w-6 h-6 mb-2" />
                            <span className="font-bold text-sm">Full Court</span>
                            <span className="text-[10px] opacity-70 mt-1">Private Session</span>
                          </button>
                          <button 
                            onClick={() => setBookingMode("shared_session")}
                            className={cn(
                              "p-4 rounded-2xl border-2 flex flex-col items-center text-center transition-all",
                              bookingMode === "shared_session" ? "border-brand-primary bg-brand-primary/5 text-brand-primary" : "border-slate-100 text-slate-500 hover:border-slate-200"
                            )}
                          >
                            <Search className="w-6 h-6 mb-2" />
                            <span className="font-bold text-sm">Join-in</span>
                            <span className="text-[10px] opacity-70 mt-1">Open to others</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-blue-800 text-sm font-medium">
                        This is a shared session. By continuing, you will reserve a spot to play with others!
                      </div>
                    )}

                    <div className="flex space-x-3 pt-2">
                      <button 
                        onClick={() => setIsModalOpen(false)}
                        className="flex-1 py-4 font-bold text-slate-500 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => setBookingStep(2)}
                        className="flex-1 py-4 font-black text-white bg-brand-primary rounded-2xl hover:bg-brand-primary/90 transition-all flex items-center justify-center shadow-lg shadow-brand-primary/30"
                      >
                        Continue
                      </button>
                    </div>
                  </>
                )}

                {bookingStep === 2 && (
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1 pb-4 custom-scrollbar">
                    {/* Summary Table */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
                       <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase">
                             <tr>
                                <th className="px-3 py-2">Date</th>
                                <th className="px-3 py-2">Start Time</th>
                                <th className="px-3 py-2">End Time</th>
                             </tr>
                          </thead>
                          <tbody className="font-bold text-brand-deep">
                             <tr>
                                <td className="px-3 py-2">{selectedDate}</td>
                                <td className="px-3 py-2">{formatHour(selectedSlot)}</td>
                                <td className="px-3 py-2">{formatHour(selectedSlot + formData.duration)}</td>
                             </tr>
                          </tbody>
                       </table>
                    </div>

                    <div className="space-y-4">
                      {bookingMode !== "join" && (
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-brand-primary ml-2 mb-2 block">Duration *</label>
                          <div className="grid grid-cols-3 gap-2">
                            {[1, 2, 3].map(d => (
                              <button
                                key={d}
                                disabled={d > maxDuration}
                                onClick={() => setFormData({...formData, duration: d})}
                                className={cn(
                                  "py-2 rounded-xl text-xs font-bold border transition-all",
                                  formData.duration === d ? "bg-brand-primary text-white border-brand-primary" : "bg-slate-50 text-slate-500 border-slate-200 hover:border-brand-primary/50",
                                  d > maxDuration && "opacity-50 cursor-not-allowed bg-slate-100 hover:border-slate-200"
                                )}
                              >
                                {d} Hour{d > 1 ? 's' : ''}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-brand-primary ml-2 mb-2 block">
                           {bookingMode === "join" ? "Participants Joining *" : "Total Participants *"}
                        </label>
                        <div className="flex items-center space-x-2">
                           {(() => {
                              const event = bookingMode === "join" ? events.find(e => e.courtId === selectedCourt.id && e.slot === selectedSlot) : null;
                              const maxJoinable = event ? event.maxplayers - (event.currentPlayers || 1) : undefined;
                              return (
                                 <input 
                                   type="number" 
                                   min="1"
                                   max={maxJoinable}
                                   placeholder={bookingMode === "join" ? `Max ${maxJoinable}` : "e.g. 10"} 
                                   value={formData.participants}
                                   onChange={(e) => setFormData({...formData, participants: e.target.value})}
                                   className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-primary"
                                 />
                              )
                           })()}
                           <span className="text-xs text-slate-400 font-bold">Person</span>
                        </div>
                      </div>

                      {bookingMode === "shared_session" && (
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-brand-primary ml-2 mb-2 block">Max Capacity For Session *</label>
                          <div className="flex items-center space-x-2">
                             <input 
                               type="number" 
                               min={Math.max(1, parseInt(formData.participants) || 1)}
                               placeholder="e.g. 10" 
                               value={formData.maxPlayers}
                               onChange={(e) => setFormData({...formData, maxPlayers: e.target.value})}
                               className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-primary"
                             />
                             <span className="text-xs text-slate-400 font-bold">Person</span>
                          </div>
                        </div>
                      )}



                      <div className="pt-2 border-t border-slate-100">
                         <p className="text-sm font-bold text-slate-600 mb-3">Student Information:</p>
                         <div className="space-y-3">
                           <input 
                             type="text" 
                             placeholder="Full Name" 
                             value={formData.fullName}
                             onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                             className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-primary"
                           />
                           <div className="grid grid-cols-2 gap-3">
                             <input 
                               type="text" 
                               placeholder="Matrix ID" 
                               value={formData.matrixId}
                               onChange={(e) => setFormData({...formData, matrixId: e.target.value})}
                               className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-primary"
                             />
                             <input 
                               type="text" 
                               placeholder="Course" 
                               value={formData.course}
                               onChange={(e) => setFormData({...formData, course: e.target.value})}
                               className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-primary"
                             />
                           </div>
                           <input 
                             type="tel" 
                             placeholder="Phone Number" 
                             value={formData.phone}
                             onChange={(e) => setFormData({...formData, phone: e.target.value})}
                             className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-brand-primary"
                           />
                         </div>
                      </div>
                    </div>

                    <div className="flex space-x-3 pt-4 sticky bottom-0 bg-white pb-2">
                      <button 
                        onClick={() => setBookingStep(1)}
                        disabled={processing}
                        className="flex-1 py-4 font-bold text-slate-500 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors"
                      >
                        Back
                      </button>
                      <button 
                        onClick={handleBooking}
                        disabled={processing || !formData.fullName || !formData.matrixId || !formData.participants}
                        className="flex-1 py-4 font-black text-white bg-brand-primary rounded-2xl hover:bg-brand-primary/90 transition-all flex items-center justify-center shadow-lg shadow-brand-primary/30 disabled:opacity-50"
                      >
                        {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Submit"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
