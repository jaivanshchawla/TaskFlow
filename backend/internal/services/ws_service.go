package services

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/jaivanshchawla/taskflow/pkg/logger"
	"go.uber.org/zap"
)

// Event represents a WebSocket event.
type Event struct {
	Type      string      `json:"type"`
	Payload   interface{} `json:"payload"`
	UserID    string      `json:"user_id"`
	Timestamp time.Time   `json:"timestamp"`
}

// Client represents a WebSocket client connection.
type Client struct {
	UserID     string
	Conn       *websocket.Conn
	Send       chan []byte
	Subscribed map[string]bool // task IDs subscribed to
	Hub        *Hub
}

// Hub manages all active WebSocket connections.
type Hub struct {
	clients    map[string]*Client
	broadcast  chan *Event
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

// NewHub creates a new WebSocket hub.
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[string]*Client),
		broadcast:  make(chan *Event, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

// Run starts the hub's main loop in a goroutine.
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client.UserID] = client
			count := len(h.clients)
			h.mu.Unlock()
			logger.Info("WebSocket client connected",
				zap.String("user_id", client.UserID),
				zap.Int("total_clients", count),
			)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client.UserID]; ok {
				delete(h.clients, client.UserID)
				close(client.Send)
			}
			count := len(h.clients)
			h.mu.Unlock()
			logger.Info("WebSocket client disconnected",
				zap.String("user_id", client.UserID),
				zap.Int("total_clients", count),
			)

		case event := <-h.broadcast:
			h.mu.RLock()
			recipients := 0
			for _, client := range h.clients {
				// Broadcast to specified users or all if no users specified
				if len(event.UserID) == 0 || client.UserID == event.UserID {
					data, err := json.Marshal(event)
					if err != nil {
						logger.Error("Failed to marshal WebSocket event", zap.Error(err))
						continue
					}
					select {
					case client.Send <- data:
						recipients++
					default:
						// Client buffer full, skip
					}
				}
			}
			h.mu.RUnlock()
			logger.Debug("WebSocket event broadcast",
				zap.String("event", event.Type),
				zap.Int("recipients", recipients),
			)
		}
	}
}

// Broadcast sends an event to specified user(s).
// If recipientUserIDs is empty, the event is broadcast to all connected clients.
func (h *Hub) Broadcast(event *Event, recipientUserIDs ...string) {
	if event.Timestamp.IsZero() {
		event.Timestamp = time.Now()
	}

	if len(recipientUserIDs) > 0 {
		// Send to specific users
		h.mu.RLock()
		for _, userID := range recipientUserIDs {
			if client, ok := h.clients[userID]; ok {
				data, err := json.Marshal(event)
				if err != nil {
					logger.Error("Failed to marshal WebSocket event", zap.Error(err))
					continue
				}
				select {
				case client.Send <- data:
				default:
				}
			}
		}
		h.mu.RUnlock()
	} else {
		// Send to all
		h.broadcast <- event
	}
}

// ClientCount returns the number of connected clients.
func (h *Hub) ClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

// Register registers a new client with the hub.
func (h *Hub) Register(client *Client) {
	h.register <- client
}

// Unregister removes a client from the hub.
func (h *Hub) Unregister(client *Client) {
	h.unregister <- client
}

// WritePump pumps messages from the hub to the WebSocket connection.
func (c *Client) WritePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)
			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// ReadPump pumps messages from the WebSocket connection to the hub.
func (c *Client) ReadPump() {
	defer func() {
		c.Hub.Unregister(c)
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(512)
	c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				logger.Warn("WebSocket error",
					zap.String("user_id", c.UserID),
					zap.Error(err),
				)
			}
			break
		}

		// Parse incoming message
		var msg struct {
			Type   string `json:"type"`
			TaskID string `json:"task_id"`
		}
		if err := json.Unmarshal(message, &msg); err != nil {
			continue
		}

		switch msg.Type {
		case "ping":
			// Respond with pong
			pong := &Event{Type: "pong", Timestamp: time.Now()}
			data, _ := json.Marshal(pong)
			select {
			case c.Send <- data:
			default:
			}
		case "subscribe":
			if msg.TaskID != "" {
				c.Subscribed[msg.TaskID] = true
			}
		case "unsubscribe":
			delete(c.Subscribed, msg.TaskID)
		}
	}
}
