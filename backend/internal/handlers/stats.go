package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jaivanshchawla/taskflow/internal/models"
	"github.com/jaivanshchawla/taskflow/pkg/logger"
	"github.com/jaivanshchawla/taskflow/pkg/response"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// GetStats returns dashboard statistics for the current user.
func GetStats(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("user_id")
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user ID")
			return
		}

		stats := gin.H{}

		// Total tasks
		var totalTasks int64
		db.Model(&models.Task{}).Where("user_id = ? AND deleted_at IS NULL", userID).Count(&totalTasks)
		stats["total_tasks"] = totalTasks

		// Completed today
		today := time.Now().Truncate(24 * time.Hour)
		var completedToday int64
		db.Model(&models.Task{}).Where(
			"user_id = ? AND status = ? AND updated_at >= ? AND deleted_at IS NULL",
			userID, "done", today,
		).Count(&completedToday)
		stats["completed_today"] = completedToday

		// Due today
		var dueToday int64
		tomorrow := today.Add(24 * time.Hour)
		db.Model(&models.Task{}).Where(
			"user_id = ? AND due_date >= ? AND due_date < ? AND deleted_at IS NULL",
			userID, today, tomorrow,
		).Count(&dueToday)
		stats["due_today"] = dueToday

		// Overdue
		var overdue int64
		db.Model(&models.Task{}).Where(
			"user_id = ? AND due_date < ? AND status NOT IN (?, ?) AND deleted_at IS NULL",
			userID, today, "done", "cancelled",
		).Count(&overdue)
		stats["overdue"] = overdue

		// Completion rate (last 7 days)
		sevenDaysAgo := time.Now().AddDate(0, 0, -7)
		var completed7d int64
		db.Model(&models.Task{}).Where(
			"user_id = ? AND status = ? AND updated_at >= ? AND deleted_at IS NULL",
			userID, "done", sevenDaysAgo,
		).Count(&completed7d)
		var total7d int64
		db.Model(&models.Task{}).Where(
			"user_id = ? AND created_at >= ? AND deleted_at IS NULL",
			userID, sevenDaysAgo,
		).Count(&total7d)
		completionRate := float64(0)
		if total7d > 0 {
			completionRate = float64(completed7d) / float64(total7d)
		}
		stats["completion_rate_7d"] = completionRate

		// By status
		byStatus := map[string]int64{}
		statuses := []string{"todo", "in_progress", "in_review", "done", "cancelled"}
		for _, status := range statuses {
			var count int64
			db.Model(&models.Task{}).Where(
				"user_id = ? AND status = ? AND deleted_at IS NULL",
				userID, status,
			).Count(&count)
			byStatus[status] = count
		}
		stats["by_status"] = byStatus

		// By priority
		byPriority := map[string]int64{}
		priorities := []string{"urgent", "high", "medium", "low"}
		for _, priority := range priorities {
			var count int64
			db.Model(&models.Task{}).Where(
				"user_id = ? AND priority = ? AND deleted_at IS NULL",
				userID, priority,
			).Count(&count)
			byPriority[priority] = count
		}
		stats["by_priority"] = byPriority

		logger.Info("Stats retrieved", zap.String("user_id", userIDStr), zap.Int64("total_tasks", totalTasks))
		response.Success(c, http.StatusOK, stats)
	}
}
