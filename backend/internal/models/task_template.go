package models

import (
	"time"

	"github.com/google/uuid"
)

// TaskTemplate represents a saved task template.
type TaskTemplate struct {
	ID                  uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID              uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	Name                string    `gorm:"not null" json:"name" validate:"required,max=200"`
	TitleTemplate       string    `json:"title_template"`
	DescriptionTemplate string    `json:"description_template"`
	Priority            string    `gorm:"default:'medium'" json:"priority"`
	DefaultLabels       *string   `gorm:"type:jsonb;default:'[]'" json:"default_labels"`
	CreatedAt           time.Time `json:"created_at"`

	// Relations
	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}
