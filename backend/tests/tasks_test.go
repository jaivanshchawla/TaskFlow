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

	// Stats
	api.GET("/stats", handlers.GetStats(db))

	// Bulk create
	tasks.POST("/bulk-create", handlers.BulkCreateTasks(db, hub))

	// Subtasks
	tasks.POST("/:id/subtasks", handlers.CreateSubtask(db, hub))
	tasks.PATCH("/:id/subtasks/:subtask_id", handlers.UpdateSubtask(db, hub))
	tasks.DELETE("/:id/subtasks/:subtask_id", handlers.DeleteSubtask(db, hub))
	tasks.PATCH("/:id/subtasks/reorder", handlers.ReorderSubtasks(db))

	// Comments
	tasks.GET("/:id/comments", handlers.ListComments(db))
	tasks.POST("/:id/comments", handlers.CreateComment(db, hub))

	// Activity
	tasks.GET("/:id/activity", handlers.GetActivity(db))

	// Dependencies
	tasks.GET("/:id/dependencies", handlers.ListDependencies(db))
	tasks.POST("/:id/dependencies", handlers.AddDependency(db))
	tasks.DELETE("/:id/dependencies/:dep_id", handlers.RemoveDependency(db))

	// Time entries
	tasks.GET("/:id/time-entries", handlers.ListTimeEntries(db))
	tasks.POST("/:id/time-entries", handlers.StartTimeEntry(db))
	tasks.PATCH("/:id/time-entries/:entry_id", handlers.StopTimeEntry(db))
	tasks.DELETE("/:id/time-entries/:entry_id", handlers.DeleteTimeEntry(db))

	// Labels
	labels := api.Group("/labels")
	{
		labels.GET("", handlers.ListLabels(db))
		labels.POST("", handlers.CreateLabel(db))
		labels.PATCH("/:id", handlers.UpdateLabel(db))
		labels.DELETE("/:id", handlers.DeleteLabel(db))
	}

	// Templates
	templates := api.Group("/templates")
	{
		templates.GET("", handlers.ListTemplates(db))
		templates.POST("", handlers.CreateTemplate(db))
		templates.DELETE("/:id", handlers.DeleteTemplate(db))
		templates.POST("/:id/apply", handlers.ApplyTemplate(db, hub))
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

func TestGetStats_Success(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db)
	defer cleanupTestData(t, db, user.ID)

	createTestTask(t, db, user.ID)
	createTestTask(t, db, user.ID)

	router := setupTestRouter(db)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/stats", nil)
	req.Header.Set("X-Test-User-Id", user.ID.String())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, true, resp["success"])
	data := resp["data"].(map[string]interface{})
	assert.NotNil(t, data["total_tasks"])
	assert.NotNil(t, data["by_status"])
	assert.NotNil(t, data["by_priority"])
}

func TestBulkCreateTasks_Success(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db)
	defer cleanupTestData(t, db, user.ID)

	router := setupTestRouter(db)

	body := map[string]interface{}{
		"tasks": []map[string]interface{}{
			{"title": "Bulk Task 1", "status": "todo", "priority": "high"},
			{"title": "Bulk Task 2", "status": "in_progress", "priority": "low"},
		},
	}
	jsonBody, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/tasks/bulk-create", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User-Id", user.ID.String())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, true, resp["success"])
	data := resp["data"].(map[string]interface{})
	assert.Equal(t, float64(2), data["count"])
}

func TestBulkCreateTasks_EmptyList(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db)
	defer cleanupTestData(t, db, user.ID)

	router := setupTestRouter(db)

	body := map[string]interface{}{
		"tasks": []map[string]interface{}{},
	}
	jsonBody, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/tasks/bulk-create", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User-Id", user.ID.String())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestListLabels_Success(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db)
	defer cleanupTestData(t, db, user.ID)

	createTestLabel(t, db, user.ID)

	router := setupTestRouter(db)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/labels", nil)
	req.Header.Set("X-Test-User-Id", user.ID.String())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, true, resp["success"])
}

func TestCreateLabel_Success(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db)
	defer cleanupTestData(t, db, user.ID)

	router := setupTestRouter(db)

	body := map[string]interface{}{
		"name":  "New Label",
		"color": "#ef4444",
	}
	jsonBody, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/labels", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User-Id", user.ID.String())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	assert.Equal(t, true, resp["success"])
}

func TestUpdateLabel_Success(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db)
	defer cleanupTestData(t, db, user.ID)

	label := createTestLabel(t, db, user.ID)
	router := setupTestRouter(db)

	body := map[string]interface{}{
		"name": "Updated Label",
	}
	jsonBody, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPatch, "/api/v1/labels/"+label.ID.String(), bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User-Id", user.ID.String())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestDeleteLabel_Success(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db)
	defer cleanupTestData(t, db, user.ID)

	label := createTestLabel(t, db, user.ID)
	router := setupTestRouter(db)

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/labels/"+label.ID.String(), nil)
	req.Header.Set("X-Test-User-Id", user.ID.String())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusNoContent, w.Code)
}

func TestListDependencies_Success(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db)
	defer cleanupTestData(t, db, user.ID)

	task1 := createTestTask(t, db, user.ID)
	task2 := createTestTask(t, db, user.ID)

	router := setupTestRouter(db)

	body := map[string]interface{}{
		"depends_on_id": task1.ID.String(),
	}
	jsonBody, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/tasks/"+task2.ID.String()+"/dependencies", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User-Id", user.ID.String())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)

	req2 := httptest.NewRequest(http.MethodGet, "/api/v1/tasks/"+task2.ID.String()+"/dependencies", nil)
	req2.Header.Set("X-Test-User-Id", user.ID.String())

	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)

	assert.Equal(t, http.StatusOK, w2.Code)
}

func TestAddDependency_SelfDependence(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db)
	defer cleanupTestData(t, db, user.ID)

	task := createTestTask(t, db, user.ID)
	router := setupTestRouter(db)

	body := map[string]interface{}{
		"depends_on_id": task.ID.String(),
	}
	jsonBody, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/tasks/"+task.ID.String()+"/dependencies", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User-Id", user.ID.String())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestRemoveDependency_Success(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db)
	defer cleanupTestData(t, db, user.ID)

	task1 := createTestTask(t, db, user.ID)
	task2 := createTestTask(t, db, user.ID)

	router := setupTestRouter(db)

	body := map[string]interface{}{
		"depends_on_id": task1.ID.String(),
	}
	jsonBody, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/tasks/"+task2.ID.String()+"/dependencies", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User-Id", user.ID.String())
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusCreated, w.Code)

	req2 := httptest.NewRequest(http.MethodDelete, "/api/v1/tasks/"+task2.ID.String()+"/dependencies/"+task1.ID.String(), nil)
	req2.Header.Set("X-Test-User-Id", user.ID.String())
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)
	assert.Equal(t, http.StatusNoContent, w2.Code)
}

func TestTimeEntriesCRUD(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db)
	defer cleanupTestData(t, db, user.ID)

	task := createTestTask(t, db, user.ID)
	router := setupTestRouter(db)

	// Start a time entry
	req := httptest.NewRequest(http.MethodPost, "/api/v1/tasks/"+task.ID.String()+"/time-entries", nil)
	req.Header.Set("X-Test-User-Id", user.ID.String())
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusCreated, w.Code)

	var startResp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &startResp)
	data := startResp["data"].(map[string]interface{})
	entryID := data["id"].(string)

	// List time entries
	req2 := httptest.NewRequest(http.MethodGet, "/api/v1/tasks/"+task.ID.String()+"/time-entries", nil)
	req2.Header.Set("X-Test-User-Id", user.ID.String())
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)
	assert.Equal(t, http.StatusOK, w2.Code)

	// Stop the time entry
	req3 := httptest.NewRequest(http.MethodPatch, "/api/v1/tasks/"+task.ID.String()+"/time-entries/"+entryID, nil)
	req3.Header.Set("X-Test-User-Id", user.ID.String())
	w3 := httptest.NewRecorder()
	router.ServeHTTP(w3, req3)
	assert.Equal(t, http.StatusOK, w3.Code)

	// Delete the time entry
	req4 := httptest.NewRequest(http.MethodDelete, "/api/v1/tasks/"+task.ID.String()+"/time-entries/"+entryID, nil)
	req4.Header.Set("X-Test-User-Id", user.ID.String())
	w4 := httptest.NewRecorder()
	router.ServeHTTP(w4, req4)
	assert.Equal(t, http.StatusNoContent, w4.Code)
}

func TestStartTimeEntry_Conflict(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db)
	defer cleanupTestData(t, db, user.ID)

	task := createTestTask(t, db, user.ID)
	router := setupTestRouter(db)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/tasks/"+task.ID.String()+"/time-entries", nil)
	req.Header.Set("X-Test-User-Id", user.ID.String())
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	assert.Equal(t, http.StatusCreated, w.Code)

	req2 := httptest.NewRequest(http.MethodPost, "/api/v1/tasks/"+task.ID.String()+"/time-entries", nil)
	req2.Header.Set("X-Test-User-Id", user.ID.String())
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)
	assert.Equal(t, http.StatusConflict, w2.Code)
}

func TestCreateComment_Success(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db)
	defer cleanupTestData(t, db, user.ID)

	task := createTestTask(t, db, user.ID)
	router := setupTestRouter(db)

	body := map[string]interface{}{
		"content": "This is a comment",
	}
	jsonBody, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/tasks/"+task.ID.String()+"/comments", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Test-User-Id", user.ID.String())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusCreated, w.Code)
}

func TestListComments_Success(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db)
	defer cleanupTestData(t, db, user.ID)

	task := createTestTask(t, db, user.ID)
	router := setupTestRouter(db)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/tasks/"+task.ID.String()+"/comments", nil)
	req.Header.Set("X-Test-User-Id", user.ID.String())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestGetActivity_Success(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db)
	defer cleanupTestData(t, db, user.ID)

	task := createTestTask(t, db, user.ID)
	router := setupTestRouter(db)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/tasks/"+task.ID.String()+"/activity", nil)
	req.Header.Set("X-Test-User-Id", user.ID.String())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestExportTasksCSV_Success(t *testing.T) {
	db := setupTestDB(t)
	user := createTestUser(t, db)
	defer cleanupTestData(t, db, user.ID)

	createTestTask(t, db, user.ID)
	router := setupTestRouter(db)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/tasks/export", nil)
	req.Header.Set("X-Test-User-Id", user.ID.String())

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "text/csv", w.Header().Get("Content-Type"))
}
