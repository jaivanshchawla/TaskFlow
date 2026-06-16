package models

import "github.com/google/uuid"

type TaskDependency struct {
	TaskID      uuid.UUID `gorm:"type:uuid;primaryKey"`
	DependsOnID uuid.UUID `gorm:"type:uuid;primaryKey"`
}
