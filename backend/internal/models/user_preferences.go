package models

import (
	"time"

	"github.com/google/uuid"
)

// UserPreferences stores user-specific UI preferences.
type UserPreferences struct {
	UserID      uuid.UUID `gorm:"type:uuid;primaryKey" json:"user_id"`
	Theme       string    `gorm:"not null;default:'system'" json:"theme"`       // 'light' | 'dark' | 'system'
	DefaultView string    `gorm:"not null;default:'list'" json:"default_view"` // 'list' | 'kanban' | 'calendar'
	ItemsPerPage int      `gorm:"not null;default:20" json:"items_per_page"`
	UpdatedAt   time.Time `json:"updated_at"`
}
