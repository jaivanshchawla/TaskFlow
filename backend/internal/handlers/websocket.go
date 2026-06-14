package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/jaivanshchawla/taskflow/internal/services"
	"github.com/jaivanshchawla/taskflow/pkg/logger"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins in dev; restrict in production
	},
}

// WebSocketHandler handles WebSocket upgrade and connection.
// The Auth middleware must run before this handler to set user_id in context.
func WebSocketHandler(hub *services.Hub, db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Auth middleware already validated JWT and set user_id in context
		userIDStr := c.GetString("user_id")
		if userIDStr == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			return
		}

		clerkUserID := c.GetString("clerk_user_id")
		if clerkUserID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication required"})
			return
		}

		// Look up user
		var user struct {
			ID          uuid.UUID
			ClerkUserID string
		}
		if err := db.Raw("SELECT id, clerk_user_id FROM users WHERE clerk_user_id = ?", clerkUserID).Scan(&user).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			return
		}

		// Upgrade to WebSocket
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			logger.Error("WebSocket upgrade failed", zap.Error(err))
			return
		}

		client := &services.Client{
			UserID:     user.ID.String(),
			Conn:       conn,
			Send:       make(chan []byte, 256),
			Subscribed: make(map[string]bool),
			Hub:        hub,
		}

		hub.Register(client)

		// Start goroutines
		go client.WritePump()
		go client.ReadPump()

		// Send welcome message
		welcome, _ := json.Marshal(services.Event{
			Type:      "connected",
			Payload:   fmt.Sprintf("Welcome %s", user.ID.String()),
			Timestamp: time.Now(),
		})
		client.Send <- welcome
	}
}
