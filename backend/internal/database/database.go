package database

import (
	"fmt"
	"time"

	"github.com/jaivanshchawla/taskflow/internal/models"
	"github.com/jaivanshchawla/taskflow/pkg/logger"
	"go.uber.org/zap"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

// Connect establishes a connection to PostgreSQL with retry logic.
func Connect(databaseURL string) *gorm.DB {
	var db *gorm.DB
	var err error

	maxRetries := 5
	for i := 1; i <= maxRetries; i++ {
		logger.Info("Connecting to PostgreSQL",
			zap.Int("attempt", i),
			zap.Int("max_retries", maxRetries),
		)

		db, err = gorm.Open(postgres.Open(databaseURL), &gorm.Config{
			Logger:                 gormlogger.Default.LogMode(gormlogger.Silent),
			SkipDefaultTransaction: true,
		})
		if err == nil {
			// Configure connection pool
			sqlDB, err := db.DB()
			if err != nil {
				logger.Error("Failed to get underlying SQL DB", zap.Error(err))
				time.Sleep(2 * time.Second)
				continue
			}

			sqlDB.SetMaxOpenConns(25)
			sqlDB.SetMaxIdleConns(10)
			sqlDB.SetConnMaxLifetime(5 * time.Minute)

			// Verify connection
			if err := sqlDB.Ping(); err != nil {
				logger.Error("Failed to ping PostgreSQL", zap.Error(err))
				time.Sleep(2 * time.Second)
				continue
			}

			logger.Info("Connected to PostgreSQL",
				zap.Int("max_open_conns", 25),
				zap.Int("max_idle_conns", 10),
			)
			return db
		}

		logger.Warn("Failed to connect to PostgreSQL",
			zap.Int("attempt", i),
			zap.Error(err),
		)
		if i < maxRetries {
			time.Sleep(2 * time.Second)
		}
	}

	logger.Fatal("Failed to connect to PostgreSQL after retries",
		zap.Int("attempts", maxRetries),
		zap.Error(err),
	)
	return nil
}

// Migrate runs auto-migration for all models in the correct order.
func Migrate(db *gorm.DB) {
	modelsToMigrate := []struct {
		name  string
		model interface{}
	}{
		{"User", &models.User{}},
		{"UserPreferences", &models.UserPreferences{}},
		{"Task", &models.Task{}},
		{"Subtask", &models.Subtask{}},
		{"Label", &models.Label{}},
		{"TaskLabel", &models.TaskLabel{}},
		{"Comment", &models.Comment{}},
		{"Attachment", &models.Attachment{}},
		{"ActivityLog", &models.ActivityLog{}},
		{"TaskTemplate", &models.TaskTemplate{}},
	}

	for _, m := range modelsToMigrate {
		logger.Info("Migrating model", zap.String("model", m.name))
		if err := db.AutoMigrate(m.model); err != nil {
			logger.Fatal("Failed to migrate model",
				zap.String("model", m.name),
				zap.Error(err),
			)
		}
		logger.Info("Model migrated successfully", zap.String("model", m.name))
	}

	// Create additional indexes
	createIndexes(db)

	logger.Info(fmt.Sprintf("Database migration complete — %d models migrated", len(modelsToMigrate)))
}

// createIndexes creates additional database indexes not covered by GORM tags.
func createIndexes(db *gorm.DB) {
	indexes := []struct {
		name  string
		query string
	}{
		{"idx_tasks_title_search", "CREATE INDEX IF NOT EXISTS idx_tasks_title_search ON tasks USING gin(to_tsvector('english', title))"},
		{"idx_tasks_overdue", "CREATE INDEX IF NOT EXISTS idx_tasks_overdue ON tasks(due_date) WHERE deleted_at IS NULL AND status NOT IN ('done', 'cancelled')"},
		{"idx_activity_created_at_desc", "CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity_logs(created_at DESC)"},
		{"idx_labels_user_name", "CREATE UNIQUE INDEX IF NOT EXISTS idx_labels_user_name ON labels(user_id, name)"},
	}

	for _, idx := range indexes {
		logger.Debug("Creating index", zap.String("name", idx.name))
		if err := db.Exec(idx.query).Error; err != nil {
			logger.Warn("Index creation skipped (may already exist)",
				zap.String("name", idx.name),
				zap.Error(err),
			)
		}
	}
}
