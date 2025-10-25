import { useEffect, useRef, useState } from "react";
import { queryClient } from "@/lib/queryClient";

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        setIsConnected(false);
        wsRef.current = null;
        
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("Attempting to reconnect...");
          connect();
        }, 5000);
      };
    } catch (error) {
      console.error("WebSocket connection error:", error);
      setIsConnected(false);
    }
  };

  const handleMessage = (message: WebSocketMessage) => {
    console.log("WebSocket message:", message);

    switch (message.type) {
      case "newBlock":
        queryClient.invalidateQueries({ queryKey: ["/api/blocks/latest"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
        break;

      case "newTransaction":
        queryClient.invalidateQueries({ queryKey: ["/api/transactions/latest"] });
        queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
        break;

      case "contractVerified":
        if (message.address) {
          queryClient.invalidateQueries({ queryKey: ["/api/address", message.address] });
          queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
        }
        break;

      case "logoStatusChanged":
        if (message.tokenAddress) {
          queryClient.invalidateQueries({ queryKey: ["/api/tokens"] });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/review-logos"] });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
        }
        break;

      case "logoSubmitted":
        queryClient.invalidateQueries({ queryKey: ["/api/admin/review-logos"] });
        queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
        break;

      default:
        break;
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return { isConnected };
}
