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

// CreateSubtask creates a new subtask for a task.
func CreateSubtask(db *gorm.DB, hub *services.Hub) gin.HandlerFunc {
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
			Title    string `json:"title" validate:"required"`
			Position *int   `json:"position"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			response.Error(c, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid request body")
			return
		}

		position := 0
		if input.Position != nil {
			position = *input.Position
		} else {
			var maxPos int
			db.Model(&models.Subtask{}).Where("task_id = ?", task.ID).Select("COALESCE(MAX(position), 0)").Scan(&maxPos)
			position = maxPos + 1
		}

		subtask := models.Subtask{
			TaskID:    task.ID,
			Title:     input.Title,
			Position:  position,
			Completed: false,
		}

		if err := db.Create(&subtask).Error; err != nil {
			logger.Error("Failed to create subtask", zap.Error(err))
			response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create subtask")
			return
		}

		services.LogActivity(db, task.ID, userID, "subtask_added", "subtask", nil, subtask.Title)

		hub.Broadcast(&services.Event{Type: "subtask:updated", Payload: subtask, UserID: userIDStr}, userIDStr)

		logger.Info("Subtask created", zap.String("task_id", taskID), zap.String("subtask_id", subtask.ID.String()))
		response.Success(c, http.StatusCreated, subtask)
	}
}

// UpdateSubtask updates a subtask.
func UpdateSubtask(db *gorm.DB, hub *services.Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("user_id")
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user ID")
			return
		}

		taskID := c.Param("id")
		subtaskID := c.Param("subtask_id")

		var task models.Task
		if err := db.Where("id = ? AND user_id = ?", taskID, userID).First(&task).Error; err != nil {
			response.Error(c, http.StatusNotFound, "TASK_NOT_FOUND", "Task not found")
			return
		}

		var subtask models.Subtask
		if err := db.Where("id = ? AND task_id = ?", subtaskID, task.ID).First(&subtask).Error; err != nil {
			response.Error(c, http.StatusNotFound, "SUBTASK_NOT_FOUND", "Subtask not found")
			return
		}

		var input struct {
			Title     *string `json:"title"`
			Completed *bool   `json:"completed"`
			Position  *int    `json:"position"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			response.Error(c, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid request body")
			return
		}

		updates := map[string]interface{}{}
		if input.Title != nil {
			updates["title"] = *input.Title
		}
		if input.Completed != nil {
			updates["completed"] = *input.Completed
			if *input.Completed {
				services.LogActivity(db, task.ID, userID, "subtask_completed", "subtask", subtask.Title, true)
			}
		}
		if input.Position != nil {
			updates["position"] = *input.Position
		}

		if len(updates) > 0 {
			db.Model(&subtask).Updates(updates)
		}

		hub.Broadcast(&services.Event{Type: "subtask:updated", Payload: subtask, UserID: userIDStr}, userIDStr)

		logger.Info("Subtask updated", zap.String("subtask_id", subtaskID))
		response.Success(c, http.StatusOK, subtask)
	}
}

// DeleteSubtask deletes a subtask.
func DeleteSubtask(db *gorm.DB, hub *services.Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("user_id")
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user ID")
			return
		}

		taskID := c.Param("id")
		subtaskID := c.Param("subtask_id")

		var task models.Task
		if err := db.Where("id = ? AND user_id = ?", taskID, userID).First(&task).Error; err != nil {
			response.Error(c, http.StatusNotFound, "TASK_NOT_FOUND", "Task not found")
			return
		}

		if err := db.Where("id = ? AND task_id = ?", subtaskID, task.ID).Delete(&models.Subtask{}).Error; err != nil {
			logger.Error("Failed to delete subtask", zap.Error(err))
			response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete subtask")
			return
		}

		hub.Broadcast(&services.Event{Type: "subtask:updated", Payload: gin.H{"deleted": subtaskID}, UserID: userIDStr}, userIDStr)

		logger.Info("Subtask deleted", zap.String("subtask_id", subtaskID))
		response.SuccessNoContent(c)
	}
}

// ReorderSubtasks reorders subtasks by providing ordered IDs.
func ReorderSubtasks(db *gorm.DB) gin.HandlerFunc {
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
			OrderedIDs []string `json:"ordered_ids" validate:"required"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			response.Error(c, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid request body")
			return
		}

		for i, idStr := range input.OrderedIDs {
			id, err := uuid.Parse(idStr)
			if err != nil {
				continue
			}
			db.Model(&models.Subtask{}).Where("id = ? AND task_id = ?", id, task.ID).Update("position", i)
		}

		logger.Info("Subtasks reordered", zap.String("task_id", taskID), zap.Int("count", len(input.OrderedIDs)))
		response.Success(c, http.StatusOK, gin.H{"message": "Subtasks reordered"})
	}
}
