package models

import (
	"time"

	"github.com/google/uuid"
)

// ActivityLog records every state change on a task.
type ActivityLog struct {
	ID          uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TaskID      uuid.UUID  `gorm:"type:uuid;not null;index" json:"task_id"`
	UserID      uuid.UUID  `gorm:"type:uuid;not null" json:"user_id"`
	Action      string     `gorm:"not null" json:"action"`
	FieldChanged string    `json:"field_changed"`
	OldValue    *string    `gorm:"type:jsonb" json:"old_value"`
	NewValue    *string    `gorm:"type:jsonb" json:"new_value"`
	CreatedAt   time.Time  `json:"created_at"`

	// Relations
	Task Task `gorm:"foreignKey:TaskID" json:"task,omitempty"`
	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}
