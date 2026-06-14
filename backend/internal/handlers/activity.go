package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jaivanshchawla/taskflow/internal/models"
	"github.com/jaivanshchawla/taskflow/pkg/logger"
	"github.com/jaivanshchawla/taskflow/pkg/response"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// GetActivity returns paginated activity logs for a task.
func GetActivity(db *gorm.DB) gin.HandlerFunc {
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

		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
		if page < 1 {
			page = 1
		}
		if perPage < 1 || perPage > 100 {
			perPage = 20
		}

		var total int64
		db.Model(&models.ActivityLog{}).Where("task_id = ?", task.ID).Count(&total)

		var logs []models.ActivityLog
		db.Where("task_id = ?", task.ID).
			Order("created_at DESC").
			Preload("User").
			Offset((page - 1) * perPage).
			Limit(perPage).
			Find(&logs)

		logger.Info("Activity logs retrieved", zap.String("task_id", taskID), zap.Int64("total", total))
		response.SuccessPaginated(c, logs, page, perPage, int(total))
	}
}
