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

// ListComments returns all comments for a task.
func ListComments(db *gorm.DB) gin.HandlerFunc {
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

		var comments []models.Comment
		db.Where("task_id = ?", task.ID).Order("created_at ASC").Preload("User").Find(&comments)

		logger.Info("Comments listed", zap.String("task_id", taskID), zap.Int("count", len(comments)))
		response.Success(c, http.StatusOK, comments)
	}
}

// CreateComment adds a comment to a task.
func CreateComment(db *gorm.DB, hub *services.Hub) gin.HandlerFunc {
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
			Content string `json:"content" validate:"required,max=5000"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			response.Error(c, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid request body")
			return
		}

		comment := models.Comment{
			TaskID:  task.ID,
			UserID:  userID,
			Content: input.Content,
		}

		if err := db.Create(&comment).Error; err != nil {
			logger.Error("Failed to create comment", zap.Error(err))
			response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create comment")
			return
		}

		// Reload with user
		db.Preload("User").First(&comment, comment.ID)

		services.LogActivity(db, task.ID, userID, "comment_added", "comment", nil, comment.Content)

		hub.Broadcast(&services.Event{Type: "comment:added", Payload: comment, UserID: userIDStr}, userIDStr)

		logger.Info("Comment created", zap.String("task_id", taskID), zap.String("comment_id", comment.ID.String()))
		response.Success(c, http.StatusCreated, comment)
	}
}

// UpdateComment updates a comment (only author can edit).
func UpdateComment(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("user_id")
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user ID")
			return
		}

		taskID := c.Param("id")
		commentID := c.Param("comment_id")

		var task models.Task
		if err := db.Where("id = ? AND user_id = ?", taskID, userID).First(&task).Error; err != nil {
			response.Error(c, http.StatusNotFound, "TASK_NOT_FOUND", "Task not found")
			return
		}

		var comment models.Comment
		if err := db.Where("id = ? AND task_id = ?", commentID, task.ID).First(&comment).Error; err != nil {
			response.Error(c, http.StatusNotFound, "COMMENT_NOT_FOUND", "Comment not found")
			return
		}

		// Only author can edit
		if comment.UserID != userID {
			response.Error(c, http.StatusForbidden, "FORBIDDEN", "Only the comment author can edit")
			return
		}

		var input struct {
			Content string `json:"content"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			response.Error(c, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid request body")
			return
		}

		oldContent := comment.Content
		db.Model(&comment).Update("content", input.Content)

		services.LogActivity(db, task.ID, userID, "comment_edited", "comment", oldContent, input.Content)

		logger.Info("Comment updated", zap.String("comment_id", commentID))
		response.Success(c, http.StatusOK, comment)
	}
}

// DeleteComment deletes a comment (author or admin).
func DeleteComment(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("user_id")
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user ID")
			return
		}

		taskID := c.Param("id")
		commentID := c.Param("comment_id")
		role, _ := c.Get("role")

		var task models.Task
		if err := db.Where("id = ? AND user_id = ?", taskID, userID).First(&task).Error; err != nil {
			response.Error(c, http.StatusNotFound, "TASK_NOT_FOUND", "Task not found")
			return
		}

		var comment models.Comment
		if err := db.Where("id = ? AND task_id = ?", commentID, task.ID).First(&comment).Error; err != nil {
			response.Error(c, http.StatusNotFound, "COMMENT_NOT_FOUND", "Comment not found")
			return
		}

		// Only author or admin can delete
		if comment.UserID != userID && role != "admin" {
			response.Error(c, http.StatusForbidden, "FORBIDDEN", "Not authorized to delete this comment")
			return
		}

		if err := db.Delete(&comment).Error; err != nil {
			logger.Error("Failed to delete comment", zap.Error(err))
			response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete comment")
			return
		}

		services.LogActivity(db, task.ID, userID, "comment_deleted", "comment", comment.Content, nil)

		logger.Info("Comment deleted", zap.String("comment_id", commentID))
		response.SuccessNoContent(c)
	}
}
