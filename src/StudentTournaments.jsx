import { useState, useEffect } from "react";
import { Trophy, Calendar as CalendarIcon, Loader2, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "./lib/api";


export default function StudentTournaments() {
  const [activeTournaments, setActiveTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const data = await api.getTournaments();
      setActiveTournaments(data);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      <div className="flex flex-col space-y-2">
        <h2 className="text-2xl font-black text-brand-deep tracking-tight flex items-center">
          <Trophy className="w-6 h-6 mr-2 text-brand-primary" /> Active Tournaments
        </h2>
        <p className="text-sm text-slate-500">Browse official tournaments and register your team!</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
        </div>
      ) : activeTournaments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-[32px] border border-slate-100 shadow-sm">
          <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8" />
          </div>
          <p className="text-slate-500 font-bold">No official tournaments available right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {activeTournaments.map(t => (
            <div key={t.id} className="bg-white p-5 rounded-[32px] border border-brand-primary/20 shadow-md shadow-brand-primary/5 flex flex-col group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
              
              <div className="flex justify-between items-start mb-3 relative z-10">
                <div>
                  <span className="inline-block px-3 py-1 bg-brand-primary/10 text-brand-primary rounded-full text-[10px] font-black uppercase tracking-widest mb-2">
                    {t.sport}
                  </span>
                  <h4 className="font-black text-brand-deep text-lg leading-tight">{t.name}</h4>
                </div>
              </div>
              
              <p className="text-sm text-slate-500 font-medium line-clamp-2 mb-4 relative z-10">
                 {t.description || "Join this official tournament!"}
              </p>
              
              <div className="flex items-center space-x-4 text-xs font-bold text-slate-400 mb-4 relative z-10">
                <span className="flex items-center"><CalendarIcon className="w-3.5 h-3.5 mr-1" /> {t.date}</span>
                <span>•</span>
                <span>{t.maxTeams} Teams Max</span>
              </div>
              
              {(() => {
                const isPast = t.date ? new Date(t.date + "T23:59:59") < new Date() : false;
                return (
                  <Link 
                    to={`/tournament/${t.id}`} 
                    className={`w-full py-3 text-center transition-all text-sm relative z-10 font-black rounded-xl ${
                      isPast 
                        ? "bg-slate-100 text-slate-400 cursor-pointer" 
                        : "bg-brand-deep hover:bg-brand-deep/90 text-white shadow-lg shadow-brand-deep/20"
                    }`}
                  >
                    {isPast ? "Closed (View Details)" : "View & Register"}
                  </Link>
                );
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
