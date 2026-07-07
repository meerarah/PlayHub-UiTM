import { useState, useEffect } from "react";
import { MessageSquareShare, Star, Loader2 } from "lucide-react";
import { api } from "./lib/api";


export default function AdminFeedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const data = await api.getFeedbacks();
      setFeedbacks(data);
    } catch (error) {
      console.error("Error fetching feedbacks:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star 
            key={star} 
            className={`w-4 h-4 ${star <= rating ? 'fill-amber-450 text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-50'}`} 
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col space-y-2 mb-8 bg-admin-card p-6 rounded-[32px] border border-white/40 shadow-xl shadow-admin-accent/5">
        <h2 className="text-2xl font-black text-admin-text tracking-tight uppercase flex items-center">
          <MessageSquareShare className="w-6 h-6 mr-3 text-admin-accent" /> Student Feedback
        </h2>
        <p className="text-sm text-admin-text/60 font-bold">Review feedback and ratings from sports participants.</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 text-admin-accent animate-spin" />
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="text-center py-16 bg-admin-card rounded-[32px] border border-white/40 shadow-sm">
          <p className="text-admin-text/40 font-black uppercase tracking-wider text-sm">No feedback received yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {feedbacks.map((fb) => (
            <div key={fb.id} className="bg-white/70 backdrop-blur-sm rounded-[32px] p-6 border border-white shadow-xl shadow-admin-accent/5 flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-admin-accent/10 border border-admin-accent/15 text-admin-accent rounded-xl flex items-center justify-center font-black">
                       {fb.studentName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm font-black text-admin-text block">{fb.studentName}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest text-admin-accent mt-0.5 block">{fb.eventName}</span>
                    </div>
                  </div>
                  {renderStars(fb.rating)}
                </div>
                
                <div className="bg-admin-card/30 border border-white/40 p-4 rounded-2xl mt-4">
                  <p className="text-sm text-admin-text/80 font-medium italic">
                    "{fb.comment || "No written comment provided."}"
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-admin-text/40 font-black uppercase tracking-wider text-right mt-4">
                 {fb.timestamp ? new Date(fb.timestamp).toLocaleDateString() : 'Just now'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
