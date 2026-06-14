package services

import (
	"encoding/json"

	"github.com/google/uuid"
	"github.com/jaivanshchawla/taskflow/internal/models"
	"github.com/jaivanshchawla/taskflow/pkg/logger"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// LogActivity creates an activity log entry for a task mutation.
func LogActivity(db *gorm.DB, taskID, userID uuid.UUID, action, field string, oldVal, newVal interface{}) error {
	oldJSON := marshalJSON(oldVal)
	newJSON := marshalJSON(newVal)

	log := models.ActivityLog{
		TaskID:       taskID,
		UserID:       userID,
		Action:       action,
		FieldChanged: field,
		OldValue:     oldJSON,
		NewValue:     newJSON,
	}

	logger.Debug("Logging activity",
		zap.String("task_id", taskID.String()),
		zap.String("user_id", userID.String()),
		zap.String("action", action),
		zap.String("field", field),
	)

	if err := db.Create(&log).Error; err != nil {
		logger.Error("Failed to create activity log",
			zap.String("task_id", taskID.String()),
			zap.String("action", action),
			zap.Error(err),
		)
		return err
	}

	return nil
}

// marshalJSON converts a value to a JSON string pointer for storage.
func marshalJSON(v interface{}) *string {
	if v == nil {
		return nil
	}
	b, err := json.Marshal(v)
	if err != nil {
		return nil
	}
	s := string(b)
	return &s
}
