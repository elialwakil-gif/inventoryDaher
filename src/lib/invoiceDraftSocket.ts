import { io, Socket } from "socket.io-client";
import { getBaseURL } from "@/lib/axios";
export interface CurrentInventoryUser {
  id?: string;
  _id?: string;
  username?: string;
  role?: string;
}
let invoiceDraftSocket: Socket | null = null;
let socketIdentity = "";
export const getStoredInventoryUser = (): CurrentInventoryUser | null => {
  try {
    const storedUser = localStorage.getItem("InventoryUser");
    return storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
    console.error("Failed to read InventoryUser:", error);
    return null;
  }
};
export const getStoredAuthToken = () => localStorage.getItem("auth_token") || "";
export const getCurrentUserKey = () => {
  const user = getStoredInventoryUser();
  return String(user?.id || user?._id || user?.username || "");
};
export const getInvoiceDraftSocket = () => {
  const token = getStoredAuthToken();
  const user = getStoredInventoryUser();
  const userId = getCurrentUserKey();
  const nextIdentity = `${getBaseURL()}::${token}::${userId}`;
  if (invoiceDraftSocket && socketIdentity === nextIdentity) {
    return invoiceDraftSocket;
  }
  invoiceDraftSocket?.disconnect();
  socketIdentity = nextIdentity;
  invoiceDraftSocket = io(getBaseURL(), {
    transports: ["websocket", "polling"],
    auth: {
      moneySchema: "syp-v1",
      token,
      userId,
      username: user?.username,
    },
    query: {
      userId,
      username: user?.username || "",
    },
  });
  return invoiceDraftSocket;
};
export const disconnectInvoiceDraftSocket = () => {
  invoiceDraftSocket?.disconnect();
  invoiceDraftSocket = null;
  socketIdentity = "";
};
