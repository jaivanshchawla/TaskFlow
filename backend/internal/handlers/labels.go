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

// ListLabels returns all labels for the current user.
func ListLabels(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("user_id")
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user ID")
			return
		}

		var labels []models.Label
		if err := db.Where("user_id = ?", userID).Order("created_at ASC").Limit(100).Find(&labels).Error; err != nil {
			logger.Error("Failed to list labels", zap.Error(err))
			response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list labels")
			return
		}

		response.Success(c, http.StatusOK, labels)
	}
}

// CreateLabel creates a new label.
func CreateLabel(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("user_id")
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user ID")
			return
		}

		var input struct {
			Name  string `json:"name" validate:"required,max=100"`
			Color string `json:"color" validate:"required"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			response.Error(c, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid request body")
			return
		}

		label := models.Label{
			UserID: userID,
			Name:   input.Name,
			Color:  input.Color,
		}

		if err := db.Create(&label).Error; err != nil {
			logger.Error("Failed to create label", zap.Error(err))
			response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create label")
			return
		}

		logger.Info("Label created", zap.String("label_id", label.ID.String()), zap.String("name", input.Name))
		response.Success(c, http.StatusCreated, label)
	}
}

// UpdateLabel updates a label.
func UpdateLabel(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("user_id")
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user ID")
			return
		}

		labelID := c.Param("id")
		var label models.Label
		if err := db.Where("id = ? AND user_id = ?", labelID, userID).First(&label).Error; err != nil {
			response.Error(c, http.StatusNotFound, "LABEL_NOT_FOUND", "Label not found")
			return
		}

		var input struct {
			Name  *string `json:"name"`
			Color *string `json:"color"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			response.Error(c, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid request body")
			return
		}

		updates := map[string]interface{}{}
		if input.Name != nil {
			updates["name"] = *input.Name
		}
		if input.Color != nil {
			updates["color"] = *input.Color
		}

		if len(updates) > 0 {
			if err := db.Model(&label).Updates(updates).Error; err != nil {
				logger.Error("Failed to update label", zap.Error(err))
				response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update label")
				return
			}
		}

		logger.Info("Label updated", zap.String("label_id", labelID))
		response.Success(c, http.StatusOK, label)
	}
}

// DeleteLabel deletes a label and its task associations.
func DeleteLabel(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("user_id")
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user ID")
			return
		}

		labelID := c.Param("id")
		var label models.Label
		if err := db.Where("id = ? AND user_id = ?", labelID, userID).First(&label).Error; err != nil {
			response.Error(c, http.StatusNotFound, "LABEL_NOT_FOUND", "Label not found")
			return
		}

		// Remove task_label associations and delete label in a transaction
		txErr := db.Transaction(func(tx *gorm.DB) error {
			if err := tx.Exec("DELETE FROM task_labels WHERE label_id = ?", label.ID).Error; err != nil {
				return err
			}
			return tx.Delete(&label).Error
		})
		if txErr != nil {
			logger.Error("Failed to delete label", zap.Error(txErr))
			response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete label")
			return
		}

		logger.Info("Label deleted", zap.String("label_id", labelID))
		response.SuccessNoContent(c)
	}
}
