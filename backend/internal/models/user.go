package models

import (
	"time"

	"github.com/google/uuid"
)

// User represents a user synced from Clerk.
type User struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ClerkUserID string    `gorm:"uniqueIndex;not null" json:"clerk_user_id"`
	Email       string    `gorm:"uniqueIndex;not null" json:"email"`
	Name        string    `gorm:"not null;default:''" json:"name"`
	AvatarURL   string    `json:"avatar_url"`
	Role        string    `gorm:"not null;default:'user'" json:"role"` // 'user' | 'admin'
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// Relations
	Preferences *UserPreferences `gorm:"foreignKey:UserID" json:"preferences,omitempty"`
	Tasks       []Task           `gorm:"foreignKey:UserID" json:"tasks,omitempty"`
}
