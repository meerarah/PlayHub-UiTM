import { useState } from "react";
import { Star, Send, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "./context/AuthContext";
import { api } from "./lib/api";


export default function Feedback() {
  const { user } = useAuth();

  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [category, setCategory] = useState("General");
  const [eventName, setEventName] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const categories = ["General", "Court Condition", "Equipment"];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) return alert("Please leave a star rating!");
    if (!user?.uid) return;

    setSubmitting(true);

    try {
      const payload = {
        rating: rating,
        comment: comment,
        category: category,
        studentid: user.uid
      };

      // Attach event name if they typed one
      if (eventName.trim()) {
        payload.eventName = eventName.trim();
      }

      await api.createFeedback(payload);

      setSuccess(true);
      setRating(0);
      setComment("");
      setCategory("General");
      setEventName("");
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("Failed to submit feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <h2 className="text-2xl font-black text-slate-800">Feedback</h2>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        {success ? (
          <div className="text-center py-10 animate-in zoom-in duration-500">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-black text-slate-800">Thank You!</h3>
            <p className="text-slate-500">Your feedback has been recorded.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Rate your recent session</h3>
            <p className="text-sm text-slate-500 mb-6">Let admins know what you think!</p>

            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-600 mb-1">Which event is this for? </label>
              <input
                type="text"
                value={eventName}
                onChange={e => setEventName(e.target.value)}
                placeholder="e.g. Futsal Tournament 2026"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-primary"
              />
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-600 mb-2">What is this feedback about?</label>
              <div className="flex flex-wrap gap-2">
                {categories.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${category === c
                        ? "bg-brand-primary text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              {category === "Court Condition" && (
                <p className="text-xs text-slate-500 mt-2">Example: Grass panjang, ada ranting bersepah, lantai licin, etc.</p>
              )}
              {category === "Equipment" && (
                <p className="text-xs text-slate-500 mt-2">Example: Bola tak cukup angin, bola keras sangat, net rosak, etc.</p>
              )}
            </div>

            <div className="flex justify-center space-x-2 mb-8">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110 active:scale-95"
                >
                  <Star
                    className={`w-10 h-10 ${(hoveredRating || rating) >= star
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-slate-200 fill-slate-50"
                      } transition-colors`}
                  />
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <textarea
                rows={4}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder={
                  category === "Court Condition" ? "Describe the court condition..." :
                    category === "Equipment" ? "Describe the equipment issue..." :
                      "Tell us what you liked or how we can improve..."
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none resize-none transition-all"
              ></textarea>

              <button disabled={submitting} type="submit" className="w-full bg-brand-primary hover:opacity-90 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all active:scale-[0.98] shadow-md shadow-brand-primary/20">
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Submit Feedback</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
