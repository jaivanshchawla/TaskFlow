package models

import (
	"time"

	"github.com/google/uuid"
)

// Attachment represents a file attachment on a task.
type Attachment struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TaskID    uuid.UUID `gorm:"type:uuid;not null;index" json:"task_id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	FileName  string    `gorm:"not null" json:"file_name"`
	FileURL   string    `gorm:"not null" json:"file_url"`
	FileSize  int64     `gorm:"not null;default:0" json:"file_size"`
	FileType  string    `gorm:"not null" json:"file_type"`
	CreatedAt time.Time `json:"created_at"`

	// Relations
	Task Task `gorm:"foreignKey:TaskID" json:"task,omitempty"`
	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}
