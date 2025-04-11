import { WebSocketServer } from 'ws';

declare global {
  var wsServer: WebSocketServer;
  
  namespace NodeJS {
    interface Global {
      wsServer: WebSocketServer;
    }
  }
}

export {};