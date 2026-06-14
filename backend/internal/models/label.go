package models

import (
	"time"

	"github.com/google/uuid"
)

// Label represents a color-coded label that can be attached to tasks.
type Label struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	Name      string    `gorm:"not null" json:"name" validate:"required,max=100"`
	Color     string    `gorm:"not null;default:'#6366f1'" json:"color"`
	CreatedAt time.Time `json:"created_at"`

	// Relations
	User  User   `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Tasks []Task `gorm:"many2many:task_labels" json:"tasks,omitempty"`
}
