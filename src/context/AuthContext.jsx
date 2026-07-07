/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { api } from '../lib/api';


const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        console.log("[AuthContext] Active User Email:", firebaseUser.email, "UID:", firebaseUser.uid);
        
        let currentRole = 'student';
        
        // Fetch role from MySQL backend (falling back to Firestore if needed)
        try {
          const dbUser = await api.getUser(firebaseUser.uid);
          currentRole = dbUser.role || 'student';
          console.log("[AuthContext] Loaded user role from MySQL:", currentRole);
        } catch (error) {
          console.log("[AuthContext] User not found in MySQL or server offline, trying Firestore/Sync...", error.message);
          
          // Try Firestore fallback
          try {
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userDoc.exists()) {
              currentRole = userDoc.data().role || 'student';
              
              // Sync this user to MySQL in background
              api.syncUser({
                id: firebaseUser.uid,
                fullname: userDoc.data().fullname || firebaseUser.displayName || 'Student',
                email: firebaseUser.email,
                role: currentRole,
                matrixId: userDoc.data().matrixId || null,
                residencyType: userDoc.data().residencyType || null,
                course: userDoc.data().course || null
              }).catch(err => console.warn("[AuthContext] Background MySQL sync failed:", err.message));
            } else {
              // Create user in MySQL (first time login fallback)
              api.syncUser({
                id: firebaseUser.uid,
                fullname: firebaseUser.displayName || 'Student',
                email: firebaseUser.email,
                role: 'student'
              }).catch(err => console.warn("[AuthContext] Background MySQL create failed:", err.message));
            }
          } catch (fsError) {
            console.error("[AuthContext] Firestore fallback failed:", fsError.message);
          }
        }

        // Fail-safe: Force admin role if email matches staff/admin pattern
        if (
          firebaseUser.email && 
          (firebaseUser.email.toLowerCase().includes("staf") || firebaseUser.email.toLowerCase().includes("admin"))
        ) {
          console.log("[AuthContext] Fail-safe active: Forcing 'admin' role based on email pattern");
          currentRole = 'admin';
          
          // Background sync to MySQL
          api.syncUser({
            id: firebaseUser.uid,
            fullname: firebaseUser.displayName || 'Admin',
            email: firebaseUser.email,
            role: 'admin'
          }).catch(err => console.warn("[AuthContext] Background MySQL Admin sync failed:", err.message));
          
          // Background sync to Firestore (fails silently if rules are locked)
          setDoc(doc(db, 'users', firebaseUser.uid), {
            role: 'admin'
          }, { merge: true }).catch((err) => {
            console.warn("[AuthContext] Background Firestore update failed (expected if rules are locked):", err.message);
          });
        }

        console.log("[AuthContext] Resolved User Role:", currentRole);
        setUserRole(currentRole);
      } else {
        console.log("[AuthContext] No user logged in.");
        setUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Helpful for Supabase-to-Firebase transition mapping
  const value = {
    user,
    session: user ? { user: { id: user.uid, email: user.email, user_metadata: { role: userRole } } } : null,
    userRole,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
