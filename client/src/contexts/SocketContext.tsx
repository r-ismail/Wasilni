import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/_core/hooks/useAuth";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export function useSocket() {
  return useContext(SocketContext);
}

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Connect to Socket.IO server
    const socketInstance = io(window.location.origin, {
      path: "/socket.io/",
      transports: ["websocket", "polling"],
    });

    socketInstance.on("connect", () => {
      console.log("[Socket.IO] Connected");
      setIsConnected(true);
      
      // Join user's personal room for notifications
      if (user?.id) {
        socketInstance.emit("user:join", user.id);
      }
    });

    socketInstance.on("disconnect", () => {
      console.log("[Socket.IO] Disconnected");
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [user?.id]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
