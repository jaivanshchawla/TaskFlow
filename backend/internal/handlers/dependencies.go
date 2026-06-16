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

type dependencyResult struct {
	ID       string     `json:"id"`
	Title    string     `json:"title"`
	Status   string     `json:"status"`
	Priority string     `json:"priority"`
	DueDate  *time.Time `json:"due_date"`
	Relation string     `json:"-"`
}

func ListDependencies(db *gorm.DB) gin.HandlerFunc {
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

		var results []dependencyResult
		err = db.Raw(`
			SELECT t.id::text, t.title, t.status, t.priority, t.due_date, 'depends_on' as relation
			FROM tasks t
			JOIN task_dependencies td ON td.depends_on_id = t.id
			WHERE td.task_id = ? AND t.deleted_at IS NULL
			UNION ALL
			SELECT t.id::text, t.title, t.status, t.priority, t.due_date, 'depended_by' as relation
			FROM tasks t
			JOIN task_dependencies td ON td.task_id = t.id
			WHERE td.depends_on_id = ? AND t.deleted_at IS NULL
			LIMIT 200
		`, task.ID, task.ID).Scan(&results).Error
		if err != nil {
			logger.Error("Failed to query dependencies", zap.Error(err))
			response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list dependencies")
			return
		}

		dependsOn := make([]models.Task, 0)
		dependedBy := make([]models.Task, 0)
		for _, r := range results {
			uid, _ := uuid.Parse(r.ID)
			task := models.Task{ID: uid, Title: r.Title, Status: r.Status, Priority: r.Priority, DueDate: r.DueDate}
			if r.Relation == "depends_on" {
				dependsOn = append(dependsOn, task)
			} else {
				dependedBy = append(dependedBy, task)
			}
		}

		logger.Info("Dependencies listed", zap.String("task_id", taskID))
		response.Success(c, http.StatusOK, gin.H{
			"depends_on":  dependsOn,
			"depended_by": dependedBy,
		})
	}
}

func AddDependency(db *gorm.DB) gin.HandlerFunc {
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
			DependsOnID string `json:"depends_on_id" validate:"required"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			response.Error(c, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid request body")
			return
		}

		dependsOnUUID, err := uuid.Parse(input.DependsOnID)
		if err != nil {
			response.ValidationError(c, gin.H{"depends_on_id": "Invalid task ID"})
			return
		}

		if dependsOnUUID == task.ID {
			response.Error(c, http.StatusBadRequest, "INVALID_PAYLOAD", "A task cannot depend on itself")
			return
		}

		// Verify target task exists and belongs to user
		var dependsOnTask models.Task
		if err := db.Where("id = ? AND user_id = ?", dependsOnUUID, userID).First(&dependsOnTask).Error; err != nil {
			response.Error(c, http.StatusNotFound, "TASK_NOT_FOUND", "Dependency task not found")
			return
		}

		// Check for duplicate
		var existing models.TaskDependency
		if err := db.Where("task_id = ? AND depends_on_id = ?", task.ID, dependsOnUUID).First(&existing).Error; err == nil {
			response.Error(c, http.StatusConflict, "DUPLICATE_ENTRY", "Dependency already exists")
			return
		}

		dep := models.TaskDependency{
			TaskID:      task.ID,
			DependsOnID: dependsOnUUID,
		}

		if err := db.Create(&dep).Error; err != nil {
			logger.Error("Failed to add dependency", zap.Error(err))
			response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to add dependency")
			return
		}

		logger.Info("Dependency added", zap.String("task_id", taskID), zap.String("depends_on_id", dependsOnUUID.String()))
		response.Success(c, http.StatusCreated, dep)
	}
}

func RemoveDependency(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("user_id")
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user ID")
			return
		}

		taskID := c.Param("id")
		depID := c.Param("dep_id")

		var task models.Task
		if err := db.Where("id = ? AND user_id = ?", taskID, userID).First(&task).Error; err != nil {
			response.Error(c, http.StatusNotFound, "TASK_NOT_FOUND", "Task not found")
			return
		}

		dependsOnUUID, err := uuid.Parse(depID)
		if err != nil {
			response.ValidationError(c, gin.H{"dep_id": "Invalid dependency task ID"})
			return
		}

		var dep models.TaskDependency
		if err := db.Where("task_id = ? AND depends_on_id = ?", task.ID, dependsOnUUID).First(&dep).Error; err != nil {
			response.Error(c, http.StatusNotFound, "NOT_FOUND", "Dependency not found")
			return
		}

		if err := db.Delete(&dep).Error; err != nil {
			logger.Error("Failed to remove dependency", zap.Error(err))
			response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to remove dependency")
			return
		}

		logger.Info("Dependency removed", zap.String("task_id", taskID), zap.String("depends_on_id", dependsOnUUID.String()))
		response.SuccessNoContent(c)
	}
}
