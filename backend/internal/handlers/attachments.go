package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jaivanshchawla/taskflow/internal/models"
	"github.com/jaivanshchawla/taskflow/internal/services"
	"github.com/jaivanshchawla/taskflow/pkg/logger"
	"github.com/jaivanshchawla/taskflow/pkg/response"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// CreateAttachment registers a file attachment metadata for a task.
func CreateAttachment(db *gorm.DB, hub *services.Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("user_id")
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user ID")
			return
		}

		taskID := c.Param("id")
		var task models.Task
		if err := db.Where("id = ? AND user_id = ?", taskID, userID).First(&task).Error; err != nil {
			response.Error(c, http.StatusNotFound, "TASK_NOT_FOUND", "Task not found")
			return
		}

		var input struct {
			FileName string `json:"file_name" validate:"required"`
			FileURL  string `json:"file_url" validate:"required"`
			FileSize int64  `json:"file_size"`
			FileType string `json:"file_type" validate:"required"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			response.Error(c, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid request body")
			return
		}

		attachment := models.Attachment{
			TaskID:   task.ID,
			UserID:   userID,
			FileName: input.FileName,
			FileURL:  input.FileURL,
			FileSize: input.FileSize,
			FileType: input.FileType,
		}

		if err := db.Create(&attachment).Error; err != nil {
			logger.Error("Failed to create attachment", zap.Error(err))
			response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create attachment")
			return
		}

		services.LogActivity(db, task.ID, userID, "attachment_added", "attachment", nil, attachment.FileName)

		hub.Broadcast(&services.Event{Type: "task:updated", Payload: gin.H{"attachment_added": attachment}, UserID: userIDStr}, userIDStr)

		logger.Info("Attachment created", zap.String("task_id", taskID), zap.String("file_name", input.FileName))
		response.Success(c, http.StatusCreated, attachment)
	}
}

// DeleteAttachment removes an attachment from a task.
func DeleteAttachment(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("user_id")
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user ID")
			return
		}

		taskID := c.Param("id")
		attachmentID := c.Param("attachment_id")

		var task models.Task
		if err := db.Where("id = ? AND user_id = ?", taskID, userID).First(&task).Error; err != nil {
			response.Error(c, http.StatusNotFound, "TASK_NOT_FOUND", "Task not found")
			return
		}

		var attachment models.Attachment
		if err := db.Where("id = ? AND task_id = ?", attachmentID, task.ID).First(&attachment).Error; err != nil {
			response.Error(c, http.StatusNotFound, "ATTACHMENT_NOT_FOUND", "Attachment not found")
			return
		}

		if err := db.Delete(&attachment).Error; err != nil {
			logger.Error("Failed to delete attachment", zap.Error(err))
			response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete attachment")
			return
		}

		services.LogActivity(db, task.ID, userID, "attachment_deleted", "attachment", attachment.FileName, nil)

		logger.Info("Attachment deleted", zap.String("attachment_id", attachmentID))
		response.SuccessNoContent(c)
	}
}
