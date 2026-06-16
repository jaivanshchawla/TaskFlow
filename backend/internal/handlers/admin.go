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

// AdminListUsers returns all users with task counts.
func AdminListUsers(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		type UserStats struct {
			models.User
			TaskCount      int64 `json:"task_count"`
			CompletedCount int64 `json:"completed_count"`
		}

		var userStats []UserStats
		err := db.Raw(`
			SELECT u.id, u.clerk_user_id, u.email, u.name, u.avatar_url, u.role, u.created_at, u.updated_at,
				   COUNT(t.id) FILTER (WHERE t.deleted_at IS NULL) as task_count,
				   COUNT(t2.id) FILTER (WHERE t2.status = 'done' AND t2.deleted_at IS NULL) as completed_count
			FROM users u
			LEFT JOIN tasks t ON t.user_id = u.id
			LEFT JOIN tasks t2 ON t2.user_id = u.id AND t2.status = 'done'
			WHERE u.deleted_at IS NULL
			GROUP BY u.id
			ORDER BY u.created_at DESC
		`).Scan(&userStats).Error
		if err != nil {
			logger.Error("Failed to list users", zap.Error(err))
			response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list users")
			return
		}

		logger.Info("Admin listed users", zap.Int("count", len(userStats)))
		response.Success(c, http.StatusOK, userStats)
	}
}

// AdminUpdateUser updates a user's role.
func AdminUpdateUser(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.Param("id")
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			response.Error(c, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid user ID")
			return
		}

		var input struct {
			Role string `json:"role" validate:"required,oneof=admin user"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			response.Error(c, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid request body")
			return
		}

		var user models.User
		if err := db.First(&user, "id = ?", userID).Error; err != nil {
			response.Error(c, http.StatusNotFound, "USER_NOT_FOUND", "User not found")
			return
		}

		db.Model(&user).Update("role", input.Role)

		logger.Info("Admin updated user role", zap.String("user_id", userIDStr), zap.String("role", input.Role))
		response.Success(c, http.StatusOK, user)
	}
}

// AdminListTasks returns all tasks across all users.
func AdminListTasks(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
		if page < 1 {
			page = 1
		}
		if perPage < 1 || perPage > 100 {
			perPage = 20
		}

		query := db.Model(&models.Task{}).Where("tasks.deleted_at IS NULL")

		if status := c.Query("status"); status != "" {
			query = query.Where("tasks.status IN ?", []string{status})
		}
		if priority := c.Query("priority"); priority != "" {
			query = query.Where("tasks.priority IN ?", []string{priority})
		}

		var total int64
		if err := query.Count(&total).Error; err != nil {
			logger.Error("Failed to count tasks", zap.Error(err))
			response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to count tasks")
			return
		}

		var tasks []models.Task
		if err := query.Preload("Labels").Preload("Assignee").Preload("User").
			Order("tasks.created_at DESC").
			Offset((page - 1) * perPage).Limit(perPage).
			Find(&tasks).Error; err != nil {
			logger.Error("Failed to list tasks", zap.Error(err))
			response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list tasks")
			return
		}

		response.SuccessPaginated(c, tasks, page, perPage, int(total))
	}
}

// AdminGetActivity returns platform-wide activity log.
func AdminGetActivity(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
		if page < 1 {
			page = 1
		}
		if perPage < 1 || perPage > 100 {
			perPage = 20
		}

		var total int64
		if err := db.Model(&models.ActivityLog{}).Count(&total).Error; err != nil {
			logger.Error("Failed to count activity logs", zap.Error(err))
			response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to count activity logs")
			return
		}

		var logs []models.ActivityLog
		if err := db.Order("created_at DESC").Preload("User").Preload("Task").
			Offset((page - 1) * perPage).Limit(perPage).
			Find(&logs).Error; err != nil {
			logger.Error("Failed to list activity logs", zap.Error(err))
			response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list activity logs")
			return
		}

		response.SuccessPaginated(c, logs, page, perPage, int(total))
	}
}

// AdminGetStats returns platform-wide statistics.
func AdminGetStats(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var totalUsers, totalTasks, tasksToday int64
		db.Model(&models.User{}).Count(&totalUsers)
		db.Model(&models.Task{}).Where("deleted_at IS NULL").Count(&totalTasks)
		db.Model(&models.Task{}).Where("deleted_at IS NULL AND created_at >= CURRENT_DATE AND created_at < CURRENT_DATE + INTERVAL '1 day'").Count(&tasksToday)

		var activeUsers int64
		db.Raw(`
			SELECT COUNT(DISTINCT user_id) FROM activity_logs 
			WHERE created_at >= NOW() - INTERVAL '7 days'
		`).Scan(&activeUsers)

		stats := gin.H{
			"total_users":  totalUsers,
			"total_tasks":  totalTasks,
			"tasks_today":  tasksToday,
			"active_users": activeUsers,
		}

		response.Success(c, http.StatusOK, stats)
	}
}
