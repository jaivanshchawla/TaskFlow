package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
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
		today := time.Now().Truncate(24 * time.Hour)
		tomorrow := today.Add(24 * time.Hour)
		sevenDaysAgo := time.Now().AddDate(0, 0, -7)

		baseQuery := "user_id = ? AND deleted_at IS NULL"

		// Single query for total, completed_today, due_today, overdue, completed_7d, total_7d
		var result struct {
			TotalTasks     int64
			CompletedToday int64
			DueToday       int64
			Overdue        int64
			Completed7d    int64
			Total7d        int64
		}
		db.Raw(`
			SELECT
				COUNT(*) FILTER (WHERE `+baseQuery+`) as total_tasks,
				COUNT(*) FILTER (WHERE `+baseQuery+` AND status = 'done' AND updated_at >= ?) as completed_today,
				COUNT(*) FILTER (WHERE `+baseQuery+` AND due_date >= ? AND due_date < ?) as due_today,
				COUNT(*) FILTER (WHERE `+baseQuery+` AND due_date < ? AND status NOT IN ('done','cancelled')) as overdue,
				COUNT(*) FILTER (WHERE `+baseQuery+` AND status = 'done' AND updated_at >= ?) as completed_7d,
				COUNT(*) FILTER (WHERE `+baseQuery+` AND created_at >= ?) as total_7d
			FROM tasks
			WHERE `+baseQuery,
			userID, userID, userID, today,
			userID, userID, tomorrow,
			userID, today,
			userID, sevenDaysAgo,
			userID, sevenDaysAgo,
			userID,
		).Scan(&result)

		stats["total_tasks"] = result.TotalTasks
		stats["completed_today"] = result.CompletedToday
		stats["due_today"] = result.DueToday
		stats["overdue"] = result.Overdue

		completionRate := float64(0)
		if result.Total7d > 0 {
			completionRate = float64(result.Completed7d) / float64(result.Total7d)
		}
		stats["completion_rate_7d"] = completionRate

		// Single GROUP BY query for status counts
		type statusCount struct {
			Status string
			Count  int64
		}
		var statusCounts []statusCount
		db.Raw("SELECT status, COUNT(*) as count FROM tasks WHERE "+baseQuery+" GROUP BY status", userID).Scan(&statusCounts)
		byStatus := map[string]int64{"todo": 0, "in_progress": 0, "in_review": 0, "done": 0, "cancelled": 0}
		for _, sc := range statusCounts {
			byStatus[sc.Status] = sc.Count
		}
		stats["by_status"] = byStatus

		// Single GROUP BY query for priority counts
		type priorityCount struct {
			Priority string
			Count    int64
		}
		var priorityCounts []priorityCount
		db.Raw("SELECT priority, COUNT(*) as count FROM tasks WHERE "+baseQuery+" GROUP BY priority", userID).Scan(&priorityCounts)
		byPriority := map[string]int64{"urgent": 0, "high": 0, "medium": 0, "low": 0}
		for _, pc := range priorityCounts {
			byPriority[pc.Priority] = pc.Count
		}
		stats["by_priority"] = byPriority

		logger.Debug("Stats retrieved", zap.String("user_id", userIDStr), zap.Int64("total_tasks", result.TotalTasks))
		response.Success(c, http.StatusOK, stats)
	}
}
