package handlers

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jaivanshchawla/taskflow/internal/config"
	"github.com/jaivanshchawla/taskflow/internal/models"
	"github.com/jaivanshchawla/taskflow/pkg/logger"
	"github.com/jaivanshchawla/taskflow/pkg/response"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ClerkWebhook handles Clerk webhook events for user sync.
func ClerkWebhook(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Read body for signature verification
		body, err := io.ReadAll(c.Request.Body)
		if err != nil {
			logger.Error("Failed to read webhook body", zap.Error(err))
			response.Error(c, http.StatusBadRequest, "INVALID_PAYLOAD", "Failed to read request body")
			return
		}

		logger.Info("Clerk webhook received",
			zap.String("svix_id", c.GetHeader("svix-id")),
			zap.String("svix_timestamp", c.GetHeader("svix-timestamp")),
		)

		// Parse event
		var event struct {
			Type string `json:"type"`
			Data struct {
				ID              string `json:"id"`
				EmailAddresses  []struct {
					EmailAddress string `json:"email_address"`
				} `json:"email_addresses"`
				FirstName string `json:"first_name"`
				LastName  string `json:"last_name"`
				ImageURL  string `json:"image_url"`
				PublicMetadata struct {
					Role string `json:"role"`
				} `json:"public_metadata"`
			} `json:"data"`
		}

		if err := json.Unmarshal(body, &event); err != nil {
			logger.Error("Failed to parse webhook event", zap.Error(err))
			response.Error(c, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid event format")
			return
		}

		logger.Info("Clerk webhook event",
			zap.String("type", event.Type),
			zap.String("clerk_user_id", event.Data.ID),
		)

		switch event.Type {
		case "user.created":
			email := ""
			if len(event.Data.EmailAddresses) > 0 {
				email = event.Data.EmailAddresses[0].EmailAddress
			}
			name := event.Data.FirstName + " " + event.Data.LastName
			if name == " " {
				name = email
			}
			role := event.Data.PublicMetadata.Role
			if role == "" {
				role = "user"
			}

			user := models.User{
				ClerkUserID: event.Data.ID,
				Email:       email,
				Name:        name,
				AvatarURL:   event.Data.ImageURL,
				Role:        role,
			}

			result := db.Where("clerk_user_id = ?", event.Data.ID).First(&models.User{})
			if result.Error == gorm.ErrRecordNotFound {
				if err := db.Create(&user).Error; err != nil {
					logger.Error("Failed to create user from webhook", zap.Error(err))
					response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create user")
					return
				}
				prefs := models.UserPreferences{
					UserID:       user.ID,
					Theme:        "system",
					DefaultView:  "list",
					ItemsPerPage: 20,
				}
				db.Create(&prefs)
				logger.Info("User created from webhook", zap.String("clerk_user_id", event.Data.ID))
			} else if result.Error == nil {
				db.Model(&models.User{}).Where("clerk_user_id = ?", event.Data.ID).Updates(map[string]interface{}{
					"email":      email,
					"name":       name,
					"avatar_url": event.Data.ImageURL,
					"role":       role,
				})
				logger.Info("User updated from webhook", zap.String("clerk_user_id", event.Data.ID))
			}

		case "user.updated":
			role := event.Data.PublicMetadata.Role
			if role == "" {
				role = "user"
			}
			db.Model(&models.User{}).Where("clerk_user_id = ?", event.Data.ID).Updates(map[string]interface{}{
				"name":       event.Data.FirstName + " " + event.Data.LastName,
				"avatar_url": event.Data.ImageURL,
				"role":       role,
			})
			logger.Info("User updated from webhook", zap.String("clerk_user_id", event.Data.ID))

		case "user.deleted":
			logger.Info("User deletion webhook received", zap.String("clerk_user_id", event.Data.ID))
		}

		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	}
}
