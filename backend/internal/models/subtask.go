package models

import (
	"time"

	"github.com/google/uuid"
)

// Subtask represents a subtask within a task.
type Subtask struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TaskID    uuid.UUID `gorm:"type:uuid;not null;index" json:"task_id"`
	Title     string    `gorm:"not null" json:"title" validate:"required,max=500"`
	Completed bool      `gorm:"not null;default:false" json:"completed"`
	Position  int       `gorm:"not null;default:0" json:"position"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Relations
	Task Task `gorm:"foreignKey:TaskID" json:"task,omitempty"`
}
