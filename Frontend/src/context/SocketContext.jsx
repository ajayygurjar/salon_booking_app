import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        const URL = import.meta.env.VITE_API_URL?.replace("/api/v1", "") || "http://localhost:5000";
        const s = io(URL, { transports: ["websocket", "polling"] });

        s.on("connect", () => {
            setConnected(true);
            if (user?.id) s.emit("join", user.id);
            if (user?.role === "admin") s.emit("join-admin");
        });

        s.on("disconnect", () => setConnected(false));
        setSocket(s);

        return () => { s.disconnect(); };
    }, []);

    // Re-join rooms when user changes (login/logout)
    useEffect(() => {
        if (!socket || !connected) return;
        if (user?.id) socket.emit("join", user.id);
        if (user?.role === "admin") socket.emit("join-admin");
    }, [user, connected]);

    return (
        <SocketContext.Provider value={{ socket, connected }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
export default SocketContext;
