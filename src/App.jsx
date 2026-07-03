import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useEffect } from "react";
import { db } from "./lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

import AuthLayout from "./layouts/AuthLayout";
import StudentLayout from "./layouts/StudentLayout";
import AdminLayout from "./layouts/AdminLayout";
import Login from "./Login";
import Signup from "./Signup";

import Home from "./StudentHome";
import Availability from "./CourtAvailability";
import Gallery from "./StudentGallery";
import Feedback from "./StudentFeedback";
import Profile from "./StudentProfile";
import TournamentRequest from "./TournamentRequest";
import StudentMaps from "./StudentMaps";
import StudentJoinIn from "./StudentJoinIn";
import TournamentDetails from "./TournamentDetails";
import StudentTournaments from "./StudentTournaments";

import AdminDashboard from "./AdminDashboard";
import AdminTournaments from "./AdminTournaments";
import AdminFeedback from "./AdminFeedback";
import AdminSettings from "./AdminSettings";

const ProtectedRoute = ({ children, allowedRole = "student" }) => {
  const { session, userRole } = useAuth();
  
  if (!session) return <Navigate to="/login" replace />;
  
  // If we have a session but haven't fetched the role yet, wait gracefully!
  if (userRole === null) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-400">Loading profile...</div>;
  
  if (userRole !== allowedRole) {
     return <Navigate to={userRole === 'admin' ? "/admin" : "/"} replace />;
  }
  return children;
};

// Check if already logged in to prevent revisiting /login
const AuthRoute = ({ children }) => {
  const { session, userRole } = useAuth();
  
  if (session && userRole === null) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-400">Loading...</div>;
  
  if (session) {
     return <Navigate to={userRole === 'admin' ? "/admin" : "/"} replace />;
  }
  return children;
};

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={
             <AuthRoute>
                <Login />
             </AuthRoute>
          } />
          <Route path="/signup" element={
             <AuthRoute>
                <Signup />
             </AuthRoute>
          } />
        </Route>

        {/* Student Routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute allowedRole="student">
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="availability" element={<Availability />} />
          <Route path="join-in" element={<StudentJoinIn />} />
          <Route path="request-tournament" element={<TournamentRequest />} />
          <Route path="tournaments" element={<StudentTournaments />} />
          <Route path="tournament/:id" element={<TournamentDetails />} />
          <Route path="maps" element={<StudentMaps />} />
          <Route path="gallery" element={<Gallery />} />
          <Route path="feedback" element={<Feedback />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Admin Routes */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="tournaments" element={<AdminTournaments />} />
          <Route path="feedback" element={<AdminFeedback />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

let isSeedingTriggered = false;

export default function App() {
   useEffect(() => {
      const checkAndSeed = async () => {
         if (isSeedingTriggered) return;
         isSeedingTriggered = true;
         try {
            const q = query(collection(db, "courts"), where("arena", "==", "Arena 6"));
            const snap = await getDocs(q);
            if (snap.empty) {
               console.log("Auto-seeder: Arena 6 courts missing. Initializing system...");
               const { initializeSystem } = await import("./lib/adminUtils");
               await initializeSystem();
               console.log("Auto-seeder: System initialized successfully!");
            }
         } catch (e) {
            console.error("Auto-seeder check failed:", e);
            isSeedingTriggered = false;
         }
      };
      checkAndSeed();
   }, []);

   return (
      <AuthProvider>
         <AppRoutes />
      </AuthProvider>
   )
}
