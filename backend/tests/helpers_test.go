package tests

import (
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jaivanshchawla/taskflow/internal/config"
	"github.com/jaivanshchawla/taskflow/internal/database"
	"github.com/jaivanshchawla/taskflow/internal/models"
	"github.com/jaivanshchawla/taskflow/pkg/logger"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

var testDB *gorm.DB

func setupTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	// Initialize logger for tests (must be done before database.Connect)
	logger.Init("test", "warn")

	// Load env
	if os.Getenv("DATABASE_URL") == "" {
		t.Skip("DATABASE_URL not set, skipping integration test")
	}

	cfg := &config.Config{
		DatabaseURL:        os.Getenv("DATABASE_URL"),
		Env:                "test",
		LogLevel:           "warn",
		LogFormat:          "console",
		ClerkSecretKey:     "test_key",
		ClerkWebhookSecret: "test_secret",
		ClerkJWKSURL:       "https://example.com/.well-known/jwks.json",
		FrontendURL:        "http://localhost:3000",
	}

	db := database.Connect(cfg.DatabaseURL)
	database.Migrate(db)
	testDB = db
	return db
}

func createTestUser(t *testing.T, db *gorm.DB) models.User {
	t.Helper()
	u := models.User{
		ClerkUserID: "test_clerk_" + uuid.New().String()[:8],
		Email:       "test_" + uuid.New().String()[:8] + "@test.com",
		Name:        "Test User",
		Role:        "user",
	}
	require.NoError(t, db.Create(&u).Error)
	return u
}

func createTestAdminUser(t *testing.T, db *gorm.DB) models.User {
	t.Helper()
	u := models.User{
		ClerkUserID: "test_admin_clerk_" + uuid.New().String()[:8],
		Email:       "admin_" + uuid.New().String()[:8] + "@test.com",
		Name:        "Test Admin",
		Role:        "admin",
	}
	require.NoError(t, db.Create(&u).Error)
	return u
}

func createTestTask(t *testing.T, db *gorm.DB, userID uuid.UUID) models.Task {
	t.Helper()
	task := models.Task{
		UserID:      userID,
		Title:       "Test Task " + uuid.New().String()[:8],
		Description: "Test description",
		Status:      "todo",
		Priority:    "medium",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	require.NoError(t, db.Create(&task).Error)
	return task
}

func createTestLabel(t *testing.T, db *gorm.DB, userID uuid.UUID) models.Label {
	t.Helper()
	label := models.Label{
		UserID: userID,
		Name:   "Test Label " + uuid.New().String()[:8],
		Color:  "#6366f1",
	}
	require.NoError(t, db.Create(&label).Error)
	return label
}

func cleanupTestData(t *testing.T, db *gorm.DB, userIDs ...uuid.UUID) {
	t.Helper()
	for _, id := range userIDs {
		db.Exec("DELETE FROM task_labels WHERE task_id IN (SELECT id FROM tasks WHERE user_id = ?)", id)
		db.Where("user_id = ?", id).Delete(&models.ActivityLog{})
		db.Where("user_id = ?", id).Delete(&models.Comment{})
		db.Where("user_id = ?", id).Delete(&models.Attachment{})
		db.Where("user_id = ?", id).Delete(&models.Subtask{})
		db.Where("user_id = ?", id).Delete(&models.Task{})
		db.Where("user_id = ?", id).Delete(&models.Label{})
		db.Where("user_id = ?", id).Delete(&models.TaskTemplate{})
		db.Where("user_id = ?", id).Delete(&models.UserPreferences{})
		db.Delete(&models.User{}, "id = ?", id)
	}
}

func makeAuthHeader(userID string) string {
	return fmt.Sprintf("Bearer test_token_%s", userID)
}

func init() {
	// Set up test environment variables (only non-DB vars)
	if os.Getenv("CLERK_SECRET_KEY") == "" {
		os.Setenv("CLERK_SECRET_KEY", "sk_test_placeholder")
	}
	if os.Getenv("CLERK_WEBHOOK_SECRET") == "" {
		os.Setenv("CLERK_WEBHOOK_SECRET", "whsec_placeholder")
	}
	if os.Getenv("CLERK_JWKS_URL") == "" {
		os.Setenv("CLERK_JWKS_URL", "https://example.com/.well-known/jwks.json")
	}
}
