class WebSocketManager {
  constructor() {
    this.backendWs = null;
    this.agendaWs = null;
    this.reconnectAttempts = { backend: 0, agenda: 0 };
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = { backend: 1000, agenda: 1000 };
    this.listeners = new Map();
    this.isAuthenticated = { backend: false, agenda: false };
    this.accountId = null;
  }

  connect(accountId) {
    this.accountId = accountId;
    this.connectBackend(accountId);
    this.connectAgenda(accountId);
  }

  connectBackend(accountId) {
    if (this.backendWs && this.backendWs.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.DEV
      ? 'localhost:3000'
      : window.location.host;

    const wsUrl = `${protocol}//${host}`;

    console.log('Connecting to backend WebSocket:', wsUrl);

    try {
      this.backendWs = new WebSocket(wsUrl);

      this.backendWs.onopen = () => {
        console.log('Backend WebSocket connected to:', wsUrl);
        this.reconnectAttempts.backend = 0;
        this.reconnectDelay.backend = 1000;

        setTimeout(() => {
          this.authenticate('backend', accountId);
        }, 100);
      };

      this.backendWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data, 'backend');
        } catch (error) {
          console.error('Error parsing backend WebSocket message:', error);
        }
      };

      this.backendWs.onclose = (event) => {
        console.log('Backend WebSocket disconnected:', event.code, event.reason);
        this.isAuthenticated.backend = false;

        if (this.reconnectAttempts.backend < this.maxReconnectAttempts) {
          setTimeout(() => {
            this.reconnectAttempts.backend++;
            console.log(`Backend WebSocket reconnect attempt ${this.reconnectAttempts.backend}`);
            this.connectBackend(accountId);
          }, this.reconnectDelay.backend);

          this.reconnectDelay.backend = Math.min(this.reconnectDelay.backend * 2, 30000);
        } else {
          console.log('Backend WebSocket max reconnect attempts reached');
        }
      };

      this.backendWs.onerror = (error) => {
        console.error('Backend WebSocket error:', error);
      };
    } catch (error) {
      console.error('Error creating backend WebSocket connection:', error);
    }
  }

  connectAgenda(accountId) {
    if (this.agendaWs && this.agendaWs.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const agendaHost = import.meta.env.DEV
      ? 'localhost:3001'
      : window.location.host;

    const wsUrl = `${protocol}//${agendaHost}`;

    console.log('Connecting to agenda WebSocket:', wsUrl);

    try {
      this.agendaWs = new WebSocket(wsUrl);

      this.agendaWs.onopen = () => {
        console.log('Agenda WebSocket connected to:', wsUrl);
        this.reconnectAttempts.agenda = 0;
        this.reconnectDelay.agenda = 1000;

        setTimeout(() => {
          this.authenticate('agenda', accountId);
        }, 100);
      };

      this.agendaWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data, 'agenda');
        } catch (error) {
          console.error('Error parsing agenda WebSocket message:', error);
        }
      };

      this.agendaWs.onclose = (event) => {
        console.log('Agenda WebSocket disconnected:', event.code, event.reason);
        this.isAuthenticated.agenda = false;

        if (this.reconnectAttempts.agenda < this.maxReconnectAttempts) {
          setTimeout(() => {
            this.reconnectAttempts.agenda++;
            console.log(`Agenda WebSocket reconnect attempt ${this.reconnectAttempts.agenda}`);
            this.connectAgenda(accountId);
          }, this.reconnectDelay.agenda);

          this.reconnectDelay.agenda = Math.min(this.reconnectDelay.agenda * 2, 30000);
        } else {
          console.log('Agenda WebSocket max reconnect attempts reached');
        }
      };

      this.agendaWs.onerror = (error) => {
        console.error('Agenda WebSocket error:', error);
      };
    } catch (error) {
      console.error('Error creating agenda WebSocket connection:', error);
    }
  }

  authenticate(service, accountId) {
    const ws = service === 'backend' ? this.backendWs : this.agendaWs;
    console.log(`Authenticating ${service} WebSocket with account_id:`, accountId, 'readyState:', ws?.readyState);
    if (ws && ws.readyState === WebSocket.OPEN) {
      const authMessage = {
        type: 'authenticate',
        account_id: accountId
      };
      console.log(`Sending ${service} auth message:`, authMessage);
      ws.send(JSON.stringify(authMessage));
    } else {
      console.warn(`Cannot authenticate ${service} - WebSocket not ready. ReadyState:`, ws?.readyState);
    }
  }

  handleMessage(data, service) {
    console.log(`[${service}] WebSocket received message:`, data);

    if (data.type === 'authenticated') {
      this.isAuthenticated[service] = data.success;
      console.log(`[${service}] WebSocket authentication:`, data.success ? 'success' : 'failed');
      return;
    }

    // Notify listeners
    const typeListeners = this.listeners.get(data.type);
    console.log(`Found ${typeListeners ? typeListeners.size : 0} listeners for type: ${data.type}`);

    if (typeListeners) {
      typeListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('Error in WebSocket listener:', error);
        }
      });
    }
  }

  on(type, listener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type).add(listener);
  }

  off(type, listener) {
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      typeListeners.delete(listener);
      if (typeListeners.size === 0) {
        this.listeners.delete(type);
      }
    }
  }

  disconnect() {
    if (this.backendWs) {
      this.backendWs.close();
      this.backendWs = null;
    }
    if (this.agendaWs) {
      this.agendaWs.close();
      this.agendaWs = null;
    }
    this.isAuthenticated = { backend: false, agenda: false };
    this.reconnectAttempts = { backend: this.maxReconnectAttempts, agenda: this.maxReconnectAttempts };
  }
}

// Create a singleton instance
const wsManager = new WebSocketManager();
export default wsManager;
