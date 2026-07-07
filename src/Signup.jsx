import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { UserPlus, Mail, Lock, User, Loader2, ShieldCheck } from "lucide-react";
import { auth, db } from "./lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { api } from "./lib/api";


export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [matrixId, setMatrixId] = useState("");
  const [residencyType, setResidencyType] = useState("College");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const cleanMatrixId = matrixId.trim();
      const isNumericTen = /^\d{10}$/;
      if (!isNumericTen.test(cleanMatrixId)) {
        alert("Invalid Student ID. It must contain only numbers and be exactly 10 digits long.");
        setLoading(false);
        return;
      }
      
      if (password.length < 8) {
        alert("Password must be at least 8 characters long.");
        setLoading(false);
        return;
      }
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // If successful, create Firestore record in 'users' collection
      await setDoc(doc(db, "users", firebaseUser.uid), {
        email,
        fullname: fullName,
        matrixId: matrixId.trim(),
        residencyType: residencyType,
        role: "student",
        createdAt: serverTimestamp()
      });
      
      // Also sync user to MySQL
      try {
        await api.syncUser({
          id: firebaseUser.uid,
          fullname: fullName,
          email,
          role: "student",
          matrixId: matrixId.trim(),
          residencyType: residencyType
        });
      } catch (mysqlErr) {
        console.warn("Failed to sync user registration to MySQL database:", mysqlErr.message);
      }
      
      alert("Registration successful! You can now sign in.");
      navigate("/login");
    } catch (err) {
      alert(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <form onSubmit={handleSignup} className="space-y-5 text-left">
        <div className="space-y-4 animate-in slide-in-from-top-2">
          <div className="space-y-2">
            <label className="ml-1 text-xs font-bold text-brand-deep/60 uppercase tracking-wider">Full Name</label>
            <div className="relative group">
              <User className="absolute left-4 top-3.5 h-5 w-5 text-brand-deep/30 group-focus-within:text-brand-primary transition-colors" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white border-none ring-1 ring-brand-deep/10 focus:ring-2 focus:ring-brand-primary font-bold text-brand-deep placeholder:text-brand-deep/20 transition-all outline-none"
                placeholder="Muhammad Ahsan"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="ml-1 text-xs font-bold text-brand-deep/60 uppercase tracking-wider">Student ID / Matrix ID</label>
            <div className="relative group">
              <input
                type="text"
                value={matrixId}
                onChange={(e) => setMatrixId(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl bg-white border-none ring-1 ring-brand-deep/10 focus:ring-2 focus:ring-brand-primary font-bold text-brand-deep placeholder:text-brand-deep/20 transition-all outline-none"
                placeholder="e.g. 2024123456"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="ml-1 text-xs font-bold text-brand-deep/60 uppercase tracking-wider">Residency Status</label>
            <select
              value={residencyType}
              onChange={(e) => setResidencyType(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl bg-white border-none ring-1 ring-brand-deep/10 focus:ring-2 focus:ring-brand-primary font-bold text-brand-deep transition-all outline-none"
            >
              <option value="College">College Resident</option>
              <option value="NR">Non-Resident (NR)</option>
            </select>
          </div>

          <div className="p-4 bg-brand-primary/5 border border-brand-primary/10 rounded-2xl">
            <p className="text-xs text-brand-primary font-bold flex items-center">
              <ShieldCheck className="w-4 h-4 mr-2" />
              Registration is for Students only.
            </p>
          </div>
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
              placeholder="@student.uitm.edu.my"
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
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <UserPlus className="w-6 h-6" />}
            <span>Sign Up</span>
          </button>
          
          <Link
            to="/login"
            className="text-sm font-bold text-brand-deep/40 hover:text-brand-primary transition-colors py-2 text-center"
          >
            Already have an account? Sign In
          </Link>
        </div>
      </form>
    </div>
  );
}
