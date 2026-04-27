import { io } from "socket.io-client";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const SOCKET_BASE = API_BASE.replace(/\/api\/?$/, "");

let socketInstance = null;

export const getChatSocket = () => {
  if (socketInstance) return socketInstance;

  socketInstance = io(SOCKET_BASE, {
    autoConnect: false,
    path: "/socket.io",
    transports: ["websocket", "polling"],
    withCredentials: true,
  });

  return socketInstance;
};

export const closeChatSocket = () => {
  if (!socketInstance) return;
  socketInstance.removeAllListeners();
  socketInstance.disconnect();
  socketInstance = null;
};
