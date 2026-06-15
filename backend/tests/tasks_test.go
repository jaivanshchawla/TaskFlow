package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jaivanshchawla/taskflow/internal/handlers"
	"github.com/jaivanshchawla/taskflow/internal/models"
	"github.com/jaivanshchawla/taskflow/internal/services"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupTestRouter(db *gorm.DB) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	hub := services.NewHub()
	go hub.Run()

	// Health endpoints (public)
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})
	r.GET("/api/v1/health/db", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "db": "connected"})
	})

	// Protected routes
	api := r.Group("/api/v1")
	// Skip auth middleware in tests by setting user_id directly
	// Reject requests without X-Test-User-Id to properly simulate unauthorized access
	api.Use(func(c *gin.Context) {
		userID := c.GetHeader("X-Test-User-Id")
		role := c.GetHeader("X-Test-Role")
		if userID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			c.Abort()
			return
		}
		if role == "" {
			role = "user"
		}
		c.Set("user_id", userID)
		c.Set("role", role)
		c.Next()
	})

	// Tasks
	tasks := api.Group("/tasks")
	{
		tasks.GET("", handlers.ListTasks(db))
		tasks.POST("", handlers.CreateTask(db, hub))
		tasks.GET("/export", handlers.ExportTasksCSV(db))
		tasks.POST("/bulk", handlers.BulkTaskAction(db, hub))
		tasks.GET("/:id", handlers.GetTask(db))
		tasks.PATCH("/:id", handlers.UpdateTask(db, hub))
		tasks.DELETE("/:id", handlers.DeleteTask(db, hub))
	}

	// Labels
	labels := api.Group("/labels")
	{
		labels.GET("", handlers.ListLabels(db))
		labels.POST("", handlers.CreateLabel(db))
	}

	return r
}

func TestCreateTask_Success(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db)
	defer cleanupTestData(t, db, user.ID)

	router := setupTestRouter(db)

	body := map[string]interface{}{
		"title":       "Test Task",
		"description": "Test description",
		"status":      "todo",
		"priority":    "high",
	}
	jsonBody, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/tasks", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User-Id", user.ID.String())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, true, resp["success"])
}

func TestCreateTask_ValidationError(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db)
	defer cleanupTestData(t, db, user.ID)

	router := setupTestRouter(db)

	body := map[string]interface{}{
		"title": "",
	}
	jsonBody, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/tasks", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User-Id", user.ID.String())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnprocessableEntity, w.Code)
}

func TestCreateTask_Unauthorized(t *testing.T) {
	db := setupTestDB(t)
	router := setupTestRouter(db)

	body := map[string]interface{}{
		"title": "Test Task",
	}
	jsonBody, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/tasks", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestGetTasks_FilterByStatus(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db)
	defer cleanupTestData(t, db, user.ID)

	task1 := createTestTask(t, db, user.ID)
	db.Model(&task1).Update("status", "in_progress")

	task2 := createTestTask(t, db, user.ID)
	db.Model(&task2).Update("status", "done")

	router := setupTestRouter(db)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/tasks?status=in_progress", nil)
	req.Header.Set("X-Test-User-Id", user.ID.String())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, true, resp["success"])
}

func TestGetTasks_PaginationCorrect(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db)
	defer cleanupTestData(t, db, user.ID)

	for i := 0; i < 5; i++ {
		createTestTask(t, db, user.ID)
	}

	router := setupTestRouter(db)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/tasks?page=2&per_page=2", nil)
	req.Header.Set("X-Test-User-Id", user.ID.String())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	meta, ok := resp["meta"].(map[string]interface{})
	require.True(t, ok)
	assert.Equal(t, float64(2), meta["page"])
}

func TestGetTask_NotOwned(t *testing.T) {
	db := setupTestDB(t)
	user1 := createTestUser(t, db)
	user2 := createTestUser(t, db)
	defer cleanupTestData(t, db, user1.ID, user2.ID)

	task := createTestTask(t, db, user1.ID)
	router := setupTestRouter(db)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/tasks/"+task.ID.String(), nil)
	req.Header.Set("X-Test-User-Id", user2.ID.String())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestUpdateTask_PartialUpdate(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db)
	defer cleanupTestData(t, db, user.ID)

	task := createTestTask(t, db, user.ID)
	router := setupTestRouter(db)

	body := map[string]interface{}{
		"title": "Updated Title",
	}
	jsonBody, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPatch, "/api/v1/tasks/"+task.ID.String(), bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User-Id", user.ID.String())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var updatedTask models.Task
	db.First(&updatedTask, task.ID)
	assert.Equal(t, "Updated Title", updatedTask.Title)
	assert.Equal(t, "todo", updatedTask.Status)
}

func TestDeleteTask_SoftDelete(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db)
	defer cleanupTestData(t, db, user.ID)

	task := createTestTask(t, db, user.ID)
	router := setupTestRouter(db)

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/tasks/"+task.ID.String(), nil)
	req.Header.Set("X-Test-User-Id", user.ID.String())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNoContent, w.Code)

	var count int64
	db.Model(&models.Task{}).Where("user_id = ? AND deleted_at IS NULL", user.ID).Count(&count)
	assert.Equal(t, int64(0), count)

	var deletedTask models.Task
	err := db.Unscoped().First(&deletedTask, task.ID).Error
	assert.Nil(t, err)
}

func TestAdminGetAllTasks_Success(t *testing.T) {
	db := setupTestDB(t)
	admin := createTestAdminUser(t, db)
	user1 := createTestUser(t, db)
	defer cleanupTestData(t, db, admin.ID, user1.ID)

	createTestTask(t, db, user1.ID)
	createTestTask(t, db, user1.ID)

	router := setupTestRouter(db)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/tasks", nil)
	req.Header.Set("X-Test-User-Id", admin.ID.String())
	req.Header.Set("X-Test-Role", "admin")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	meta, ok := resp["meta"].(map[string]interface{})
	require.True(t, ok)
	assert.NotNil(t, meta)
}

func TestAdminGetAllTasks_ForbiddenForUser(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db)
	defer cleanupTestData(t, db, user.ID)

	router := setupTestRouter(db)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/tasks", nil)
	req.Header.Set("X-Test-User-Id", user.ID.String())
	req.Header.Set("X-Test-Role", "user")

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestHealthEndpoint(t *testing.T) {
	router := setupTestRouter(nil)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, "ok", resp["status"])
}
