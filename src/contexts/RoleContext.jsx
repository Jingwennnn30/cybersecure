import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";

const RoleContext = createContext();

export function RoleProvider({ children }) {
  const [user] = useAuthState(auth);
  const [role, setRole] = useState(null);

  useEffect(() => {
    if (user) {
      getDoc(doc(db, "users", user.uid)).then((docSnap) => {
        setRole(docSnap.exists() ? docSnap.data().role : null);
      });
    } else {
      setRole(null);
    }
  }, [user]);

  return (
    <RoleContext.Provider value={role}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}