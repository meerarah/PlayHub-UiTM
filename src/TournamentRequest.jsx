import { useState } from "react";
import { Trophy, Send, Loader2, Calendar as CalendarIcon, Users, FileText, Upload } from "lucide-react";
import { useAuth } from "./context/AuthContext";
import { useNavigate } from "react-router-dom";
import { api } from "./lib/api";

export default function TournamentRequest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    sport: "Futsal",
    preferredDate: new Date().toISOString().split("T")[0],
    teamsCount: 4,
    description: "",
  });

  // Uploaded document state variables
  const [docFileName, setDocFileName] = useState("");
  const [docBase64, setDocBase64] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size limit: Firestore document size limit is 1MB, so we cap base64 size at 800KB
    if (file.size > 800 * 1024) {
      alert("File is too large. Please select a document smaller than 800 KB.");
      e.target.value = null; // Reset input element
      return;
    }

    setDocFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setDocBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert("Please sign in first.");

    if (!docBase64) {
      alert("Please upload a supporting document to hold the tournament.");
      return;
    }

    setLoading(true);
    try {
      await api.createTournamentRequest({
        ...formData,
        studentId: user.uid,
        documentName: docFileName,
        documentBase64: docBase64
      });
      setSuccess(true);
    } catch (error) {
      console.error("Error submitting request:", error);
      alert("Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-6 animate-in zoom-in-95">
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
          <Trophy className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-black text-brand-deep mb-2">Request Sent!</h2>
        <p className="text-slate-500 mb-8">
          The Admin will review your request, check the uploaded supporting document, and key in the tournament. You'll be notified soon.
        </p>
        <button
          onClick={() => navigate("/")}
          className="bg-brand-primary text-white font-bold px-8 py-4 rounded-2xl shadow-lg hover:bg-brand-primary/90 transition-all"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      <div className="flex flex-col space-y-2">
        <h2 className="text-2xl font-black text-brand-deep tracking-tight">Request Tournament</h2>
        <p className="text-sm text-slate-500">Fill this form to request a tournament or match. Admin will organize it and generate certificates.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
        
        {/* Sport Selection */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-brand-primary ml-2 mb-2 block">Sport</label>
          <select 
            value={formData.sport}
            onChange={(e) => setFormData({...formData, sport: e.target.value})}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-brand-primary font-bold text-slate-700 appearance-none"
          >
            <option value="Futsal">Futsal</option>
            <option value="Basketball">Basketball</option>
            <option value="Lawn Bowls">Lawn Bowls</option>
            <option value="Cricket">Cricket</option>
          </select>
        </div>

        {/* Date Selection */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-brand-primary ml-2 mb-2 block">Preferred Date</label>
          <div className="relative w-full">
             <CalendarIcon className="w-5 h-5 absolute left-4 top-4 text-slate-400 z-10" />
             <input 
              type="date" 
              min={new Date().toISOString().split('T')[0]}
              value={formData.preferredDate}
              onChange={(e) => setFormData({...formData, preferredDate: e.target.value})}
              className="w-full min-w-0 max-w-full block bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-5 py-4 outline-none focus:ring-2 focus:ring-brand-primary font-bold text-slate-700 relative z-0"
             />
          </div>
        </div>

        {/* Teams Count */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-brand-primary ml-2 mb-2 block">Expected Teams/Participants</label>
          <div className="relative">
             <Users className="w-5 h-5 absolute left-4 top-4 text-slate-400" />
             <input 
              type="number" 
              min="2"
              max="50"
              value={formData.teamsCount}
              onChange={(e) => setFormData({...formData, teamsCount: parseInt(e.target.value)})}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-5 py-4 outline-none focus:ring-2 focus:ring-brand-primary font-bold text-slate-700"
             />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-brand-primary ml-2 mb-2 block">Additional Details</label>
          <div className="relative">
             <FileText className="w-5 h-5 absolute left-4 top-4 text-slate-400" />
             <textarea 
              rows="3"
              placeholder="E.g., Inter-faculty match, requires referee..."
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-5 py-4 outline-none focus:ring-2 focus:ring-brand-primary font-bold text-slate-700 resize-none"
             />
          </div>
        </div>

        {/* Supporting Document Upload */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-brand-primary ml-2 mb-2 block">
            Supporting Document (Required, Max 800KB)
          </label>
          <div className="relative border-2 border-dashed border-slate-200 hover:border-brand-primary rounded-2xl p-6 transition-all bg-slate-50 flex flex-col items-center justify-center cursor-pointer group">
             <input 
               type="file" 
               accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
               onChange={handleFileChange}
               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
             />
             <Upload className="w-8 h-8 text-slate-400 group-hover:text-brand-primary transition-colors mb-2" />
             {docFileName ? (
                <div className="text-center">
                   <p className="text-sm font-bold text-brand-deep">{docFileName}</p>
                   <p className="text-[10px] text-slate-400 uppercase font-black mt-1">Click or drag to change file</p>
                </div>
             ) : (
                <div className="text-center">
                   <p className="text-sm font-bold text-slate-500">Select supporting document</p>
                   <p className="text-[10px] text-slate-400 uppercase font-black mt-1">Accepts PDF, Word, or Images</p>
                </div>
             )}
          </div>
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-brand-primary text-white font-black py-5 rounded-2xl shadow-xl shadow-brand-primary/30 flex items-center justify-center space-x-2 transition-all active:scale-[0.98] disabled:opacity-70"
        >
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
            <>
              <span>Submit Request</span>
              <Send className="w-5 h-5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
