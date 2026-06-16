package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Task represents a task in the system.
type Task struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	UserID      uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	AssignedTo  *uuid.UUID     `gorm:"type:uuid" json:"assigned_to"`
	Title       string         `gorm:"not null" json:"title" validate:"required,max=500"`
	Description string         `json:"description"`
	Status      string         `gorm:"not null;default:'todo'" json:"status" validate:"oneof=todo in_progress in_review done cancelled"`
	Priority    string         `gorm:"not null;default:'medium'" json:"priority" validate:"oneof=low medium high urgent"`
	DueDate     *time.Time     `json:"due_date"`
	Position    int            `gorm:"not null;default:0" json:"position"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Relations
	User        User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Assignee    *User          `gorm:"foreignKey:AssignedTo" json:"assigned_to_user,omitempty"`
	Labels      []Label        `gorm:"many2many:task_labels" json:"labels,omitempty"`
	Subtasks    []Subtask      `gorm:"foreignKey:TaskID" json:"subtasks,omitempty"`
	Comments    []Comment      `gorm:"foreignKey:TaskID" json:"comments,omitempty"`
	Attachments []Attachment   `gorm:"foreignKey:TaskID" json:"attachments,omitempty"`
	ActivityLogs []ActivityLog    `gorm:"foreignKey:TaskID" json:"activity_logs,omitempty"`
	Recurrence   *RecurrenceConfig `gorm:"type:jsonb" json:"recurrence,omitempty"`
	DependencyIDs []string        `gorm:"type:text[]" json:"dependency_ids,omitempty"`

	// Computed fields (not in DB, populated by handler)
	SubtasksCompleted int `gorm:"-" json:"subtasks_completed,omitempty"`
	CommentsCount     int `gorm:"-" json:"comments_count,omitempty"`
	AttachmentsCount  int `gorm:"-" json:"attachments_count,omitempty"`
}

// TaskLabel is the junction table for tasks and labels.
type TaskLabel struct {
	TaskID  uuid.UUID `gorm:"type:uuid;primaryKey"`
	LabelID uuid.UUID `gorm:"type:uuid;primaryKey"`
}

type RecurrenceConfig struct {
	Type       string `json:"type"`       // daily, weekly, monthly, custom
	Interval   int    `json:"interval"`
	DayOfWeek  *int   `json:"day_of_week,omitempty"`
	DayOfMonth *int   `json:"day_of_month,omitempty"`
}
