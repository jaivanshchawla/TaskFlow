package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jaivanshchawla/taskflow/internal/models"
	"github.com/jaivanshchawla/taskflow/pkg/logger"
	"github.com/jaivanshchawla/taskflow/pkg/response"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// GetMe returns the current user's profile and preferences.
func GetMe(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("user_id")
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user ID")
			return
		}

		var user models.User
		if err := db.Preload("Preferences").First(&user, "id = ?", userID).Error; err != nil {
			logger.Error("Failed to get user profile",
				zap.String("user_id", userIDStr),
				zap.Error(err),
			)
			response.Error(c, http.StatusNotFound, "USER_NOT_FOUND", "User not found")
			return
		}

		logger.Info("User profile retrieved", zap.String("user_id", userIDStr))
		response.Success(c, http.StatusOK, user)
	}
}

// UpdatePreferences updates the current user's preferences.
func UpdatePreferences(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("user_id")
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user ID")
			return
		}

		var input struct {
			Theme       *string `json:"theme"`
			DefaultView *string `json:"default_view"`
			ItemsPerPage *int   `json:"items_per_page"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			response.Error(c, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid request body")
			return
		}

		var prefs models.UserPreferences
		result := db.Where("user_id = ?", userID).First(&prefs)
		if result.Error != nil {
			// Create preferences if they don't exist
			prefs = models.UserPreferences{
				UserID:       userID,
				Theme:        "system",
				DefaultView:  "list",
				ItemsPerPage: 20,
			}
			db.Create(&prefs)
		}

		// Update only provided fields
		updates := map[string]interface{}{}
		if input.Theme != nil {
			updates["theme"] = *input.Theme
		}
		if input.DefaultView != nil {
			updates["default_view"] = *input.DefaultView
		}
		if input.ItemsPerPage != nil {
			updates["items_per_page"] = *input.ItemsPerPage
		}

		if len(updates) > 0 {
			if err := db.Model(&prefs).Updates(updates).Error; err != nil {
				logger.Error("Failed to update preferences",
					zap.String("user_id", userIDStr),
					zap.Error(err),
				)
				response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update preferences")
				return
			}
		}

		// Reload preferences
		db.Where("user_id = ?", userID).First(&prefs)

		logger.Info("Preferences updated", zap.String("user_id", userIDStr))
		response.Success(c, http.StatusOK, prefs)
	}
}
