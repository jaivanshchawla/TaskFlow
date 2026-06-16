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

func ListTimeEntries(db *gorm.DB) gin.HandlerFunc {
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

		var entries []models.TimeEntry
		if err := db.Where("task_id = ?", task.ID).Order("started_at DESC").Limit(100).Find(&entries).Error; err != nil {
			logger.Error("Failed to list time entries", zap.Error(err))
			response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list time entries")
			return
		}

		logger.Info("Time entries listed", zap.String("task_id", taskID), zap.Int("count", len(entries)))
		response.Success(c, http.StatusOK, entries)
	}
}

func StartTimeEntry(db *gorm.DB) gin.HandlerFunc {
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

		// Check for an already running entry
		var running models.TimeEntry
		if err := db.Where("task_id = ? AND user_id = ? AND ended_at IS NULL", task.ID, userID).First(&running).Error; err == nil {
			response.Error(c, http.StatusConflict, "CONFLICT", "A timer is already running for this task")
			return
		}

		entry := models.TimeEntry{
			TaskID:    task.ID,
			UserID:    userID,
			StartedAt: time.Now(),
		}

		if err := db.Create(&entry).Error; err != nil {
			logger.Error("Failed to start time entry", zap.Error(err))
			response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to start time entry")
			return
		}

		logger.Info("Time entry started", zap.String("task_id", taskID), zap.String("entry_id", entry.ID.String()))
		response.Success(c, http.StatusCreated, entry)
	}
}

func StopTimeEntry(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("user_id")
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user ID")
			return
		}

		taskID := c.Param("id")
		entryID := c.Param("entry_id")

		var task models.Task
		if err := db.Where("id = ? AND user_id = ?", taskID, userID).First(&task).Error; err != nil {
			response.Error(c, http.StatusNotFound, "TASK_NOT_FOUND", "Task not found")
			return
		}

		var entry models.TimeEntry
		if err := db.Where("id = ? AND task_id = ?", entryID, task.ID).First(&entry).Error; err != nil {
			response.Error(c, http.StatusNotFound, "TIME_ENTRY_NOT_FOUND", "Time entry not found")
			return
		}

		if entry.EndedAt != nil {
			response.Error(c, http.StatusConflict, "CONFLICT", "Time entry is already stopped")
			return
		}

		now := time.Now()
		duration := int(now.Sub(entry.StartedAt).Seconds())

		if err := db.Model(&entry).Updates(map[string]interface{}{
			"ended_at": now,
			"duration": duration,
		}).Error; err != nil {
			logger.Error("Failed to stop time entry", zap.Error(err))
			response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to stop time entry")
			return
		}

		entry.EndedAt = &now
		entry.Duration = duration

		logger.Info("Time entry stopped", zap.String("entry_id", entryID), zap.Int("duration", duration))
		response.Success(c, http.StatusOK, entry)
	}
}

func DeleteTimeEntry(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("user_id")
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user ID")
			return
		}

		taskID := c.Param("id")
		entryID := c.Param("entry_id")

		var task models.Task
		if err := db.Where("id = ? AND user_id = ?", taskID, userID).First(&task).Error; err != nil {
			response.Error(c, http.StatusNotFound, "TASK_NOT_FOUND", "Task not found")
			return
		}

		var entry models.TimeEntry
		if err := db.Where("id = ? AND task_id = ?", entryID, task.ID).First(&entry).Error; err != nil {
			response.Error(c, http.StatusNotFound, "TIME_ENTRY_NOT_FOUND", "Time entry not found")
			return
		}

		if err := db.Delete(&entry).Error; err != nil {
			logger.Error("Failed to delete time entry", zap.Error(err))
			response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete time entry")
			return
		}

		logger.Info("Time entry deleted", zap.String("entry_id", entryID))
		response.SuccessNoContent(c)
	}
}
