package models

import (
	"time"

	"github.com/google/uuid"
)

type TimeEntry struct {
	ID        uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	TaskID    uuid.UUID  `gorm:"type:uuid;not null;index" json:"task_id"`
	UserID    uuid.UUID  `gorm:"type:uuid;not null;index" json:"user_id"`
	StartedAt time.Time  `gorm:"not null" json:"started_at"`
	EndedAt   *time.Time `json:"ended_at"`
	Duration  int        `json:"duration"` // seconds
	CreatedAt time.Time  `json:"created_at"`
}
