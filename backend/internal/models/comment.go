package models

import (
	"time"

	"github.com/google/uuid"
)

// Comment represents a comment on a task.
type Comment struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TaskID    uuid.UUID `gorm:"type:uuid;not null;index" json:"task_id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	Content   string    `gorm:"not null" json:"content" validate:"required,max=5000"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	// Relations
	Task Task `gorm:"foreignKey:TaskID" json:"task,omitempty"`
	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}
