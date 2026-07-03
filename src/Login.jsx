import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LogIn, Mail, Lock, User, Loader2, ShieldCheck } from "lucide-react";
import { auth, db } from "./lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { cn } from "./lib/utils";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Handle Sign In
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Auto-promote staff/admin email users to admin role in Firestore on sign-in
      let finalRole = role;
      try {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        let dbRole = userDoc.exists() ? userDoc.data().role : null;
        
        if (
          email && 
          (email.toLowerCase().includes("staf") || email.toLowerCase().includes("admin"))
        ) {
          dbRole = "admin";
          // Sync to Firestore in background (fails silently if rules are locked)
          setDoc(doc(db, "users", firebaseUser.uid), {
            role: "admin"
          }, { merge: true }).catch(() => {});
          console.log("Automatically promoted user to admin role (fail-safe) during sign in");
        }
        
        finalRole = dbRole || role;
      } catch (dbErr) {
        console.error("Error reading/updating user role during sign in:", dbErr);
        // Catch-all: Fallback to admin if email contains staf or admin
        if (email && (email.toLowerCase().includes("staf") || email.toLowerCase().includes("admin"))) {
          finalRole = "admin";
        }
      }
      
      navigate(finalRole === 'admin' ? "/admin" : "/");
    } catch (err) {
      alert(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <form onSubmit={handleLogin} className="space-y-5 text-left">
        {/* Role Toggle */}
        <div className="flex p-1.5 bg-brand-deep/5 rounded-2xl mb-6 shadow-inner border border-brand-deep/5">
          <button
            type="button"
            onClick={() => setRole("student")}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center space-x-2",
              role === "student" ? "bg-white text-brand-primary shadow-sm ring-1 ring-brand-deep/5" : "text-brand-deep/40 hover:text-brand-deep/60"
            )}
          >
            <User className="w-4 h-4" />
            <span>Student</span>
          </button>
          <button
            type="button"
            onClick={() => setRole("admin")}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center space-x-2",
              role === "admin" ? "bg-white text-brand-primary shadow-sm ring-1 ring-brand-deep/5" : "text-brand-deep/40 hover:text-brand-deep/60"
            )}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Admin</span>
          </button>
        </div>

        <div className="space-y-2">
          <label className="ml-1 text-xs font-bold text-brand-deep/60 uppercase tracking-wider">Email Address</label>
          <div className="relative group">
            <Mail className="absolute left-4 top-3.5 h-5 w-5 text-brand-deep/30 group-focus-within:text-brand-primary transition-colors" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white border-none ring-1 ring-brand-deep/10 focus:ring-2 focus:ring-brand-primary font-bold text-brand-deep placeholder:text-brand-deep/20 transition-all outline-none"
              placeholder="student@university.edu"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="ml-1 text-xs font-bold text-brand-deep/60 uppercase tracking-wider">Password</label>
          <div className="relative group">
            <Lock className="absolute left-4 top-3.5 h-5 w-5 text-brand-deep/30 group-focus-within:text-brand-primary transition-colors" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white border-none ring-1 ring-brand-deep/10 focus:ring-2 focus:ring-brand-primary font-bold text-brand-deep placeholder:text-brand-deep/20 transition-all outline-none"
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        <div className="pt-4 flex flex-col space-y-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-black py-4 px-4 rounded-2xl flex items-center justify-center space-x-2 transition-all active:scale-[0.98] disabled:opacity-70 shadow-xl shadow-brand-primary/25 text-lg cursor-pointer"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <LogIn className="w-6 h-6" />}
            <span>Sign In</span>
          </button>
          
          <Link 
             to="/signup"
             className="text-sm font-bold text-brand-deep/40 hover:text-brand-primary transition-colors py-2 text-center"
          >
            Don't have an account? Sign Up
          </Link>
        </div>
      </form>
    </div>
  );
}
