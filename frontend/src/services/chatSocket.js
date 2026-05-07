import { io } from "socket.io-client";
import { getApiBaseUrl } from "./runtimeUrl";

const API_BASE = getApiBaseUrl();
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
