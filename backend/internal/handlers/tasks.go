package handlers

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jaivanshchawla/taskflow/internal/models"
	"github.com/jaivanshchawla/taskflow/internal/services"
	"github.com/jaivanshchawla/taskflow/pkg/logger"
	"github.com/jaivanshchawla/taskflow/pkg/response"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ListTasks returns a filtered, sorted, paginated list of tasks.
func ListTasks(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("user_id")
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user ID")
			return
		}

		// Parse query params
		page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
		perPage, _ := strconv.Atoi(c.DefaultQuery("per_page", "20"))
		if page < 1 {
			page = 1
		}
		if perPage < 1 || perPage > 100 {
			perPage = 20
		}

		query := db.Model(&models.Task{}).Where("tasks.user_id = ? AND tasks.deleted_at IS NULL", userID)

		// Status filter
		if status := c.Query("status"); status != "" {
			statuses := strings.Split(status, ",")
			query = query.Where("tasks.status IN ?", statuses)
		}

		// Priority filter
		if priority := c.Query("priority"); priority != "" {
			priorities := strings.Split(priority, ",")
			query = query.Where("tasks.priority IN ?", priorities)
		}

		// Label filter
		if labelIDs := c.Query("label_ids"); labelIDs != "" {
			ids := strings.Split(labelIDs, ",")
			query = query.Joins("JOIN task_labels ON task_labels.task_id = tasks.id").Where("task_labels.label_id IN ?", ids)
		}

		// Search
		if search := c.Query("search"); search != "" {
			query = query.Where("to_tsvector('english', tasks.title) @@ plainto_tsquery('english', ?)", search)
		}

		// Assigned to me
		if assignedToMe := c.Query("assigned_to_me"); assignedToMe == "true" {
			query = query.Where("tasks.assigned_to = ?", userID)
		}

		// Overdue
		if overdue := c.Query("overdue"); overdue == "true" {
			query = query.Where("tasks.due_date < ? AND tasks.status NOT IN (?, ?)", time.Now(), "done", "cancelled")
		}

		// Count total
		var total int64
		query.Count(&total)

		// Sort
		sortBy := c.DefaultQuery("sort_by", "created_at")
		sortDir := c.DefaultQuery("sort_dir", "desc")
		allowedSorts := map[string]bool{"due_date": true, "priority": true, "created_at": true, "updated_at": true, "position": true}
		if !allowedSorts[sortBy] {
			sortBy = "created_at"
		}
		if sortDir != "asc" && sortDir != "desc" {
			sortDir = "desc"
		}
		query = query.Order(fmt.Sprintf("tasks.%s %s", sortBy, sortDir))

		// Paginate
		offset := (page - 1) * perPage
		var tasks []models.Task
		if err := query.Preload("Labels").Preload("Assignee").Offset(offset).Limit(perPage).Find(&tasks).Error; err != nil {
			logger.Error("Failed to list tasks", zap.String("user_id", userIDStr), zap.Error(err))
			response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list tasks")
			return
		}

		// Populate computed fields
		for i := range tasks {
			var subtasksCompleted, commentsCount, attachmentsCount int64
			db.Model(&models.Subtask{}).Where("task_id = ? AND completed = true", tasks[i].ID).Count(&subtasksCompleted)
			db.Model(&models.Comment{}).Where("task_id = ?", tasks[i].ID).Count(&commentsCount)
			db.Model(&models.Attachment{}).Where("task_id = ?", tasks[i].ID).Count(&attachmentsCount)
			tasks[i].SubtasksCompleted = int(subtasksCompleted)
			tasks[i].CommentsCount = int(commentsCount)
			tasks[i].AttachmentsCount = int(attachmentsCount)
		}

		logger.Info("Tasks listed", zap.String("user_id", userIDStr), zap.Int64("count", total))
		response.SuccessPaginated(c, tasks, page, perPage, int(total))
	}
}

// CreateTask creates a new task.
func CreateTask(db *gorm.DB, hub *services.Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("user_id")
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user ID")
			return
		}

		var input struct {
			Title       string     `json:"title" validate:"required,max=500"`
			Description string     `json:"description"`
			Status      string     `json:"status" validate:"oneof=todo in_progress in_review done cancelled"`
			Priority    string     `json:"priority" validate:"oneof=low medium high urgent"`
			DueDate     *time.Time `json:"due_date"`
			LabelIDs    []string   `json:"label_ids"`
			AssignedTo  *string    `json:"assigned_to"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			response.Error(c, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid request body")
			return
		}

		// Validate title
		if strings.TrimSpace(input.Title) == "" {
			response.ValidationError(c, gin.H{"title": "Title is required"})
			return
		}
		if len(input.Title) > 500 {
			response.ValidationError(c, gin.H{"title": "Title must be 500 characters or less"})
			return
		}

		// Set defaults
		if input.Status == "" {
			input.Status = "todo"
		}
		if input.Priority == "" {
			input.Priority = "medium"
		}

		// Validate status and priority
		validStatuses := map[string]bool{"todo": true, "in_progress": true, "in_review": true, "done": true, "cancelled": true}
		if !validStatuses[input.Status] {
			response.ValidationError(c, gin.H{"status": "Invalid status value"})
			return
		}
		validPriorities := map[string]bool{"low": true, "medium": true, "high": true, "urgent": true}
		if !validPriorities[input.Priority] {
			response.ValidationError(c, gin.H{"priority": "Invalid priority value"})
			return
		}

		// Parse assigned_to
		var assignedTo *uuid.UUID
		if input.AssignedTo != nil && *input.AssignedTo != "" {
			at, err := uuid.Parse(*input.AssignedTo)
			if err != nil {
				response.ValidationError(c, gin.H{"assigned_to": "Invalid user ID"})
				return
			}
			assignedTo = &at
		}

		task := models.Task{
			UserID:      userID,
			Title:       input.Title,
			Description: input.Description,
			Status:      input.Status,
			Priority:    input.Priority,
			DueDate:     input.DueDate,
			AssignedTo:  assignedTo,
		}

		if err := db.Create(&task).Error; err != nil {
			logger.Error("Failed to create task", zap.String("user_id", userIDStr), zap.Error(err))
			response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create task")
			return
		}

		// Associate labels
		if len(input.LabelIDs) > 0 {
			for _, lid := range input.LabelIDs {
				labelID, err := uuid.Parse(lid)
				if err != nil {
					continue
				}
				db.Exec("INSERT INTO task_labels (task_id, label_id) VALUES (?, ?) ON CONFLICT DO NOTHING", task.ID, labelID)
			}
			// Reload task with labels
			db.Preload("Labels").First(&task, task.ID)
		}

		// Log activity
		services.LogActivity(db, task.ID, userID, "task_created", "", nil, task.Title)

		// Broadcast WS event
		hub.Broadcast(&services.Event{
			Type:    "task:created",
			Payload: task,
			UserID:  userIDStr,
		}, userIDStr)

		logger.Info("Task created", zap.String("task_id", task.ID.String()), zap.String("user_id", userIDStr), zap.String("title", task.Title))
		response.Success(c, http.StatusCreated, task)
	}
}

// GetTask returns a single task with all relations.
func GetTask(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("user_id")
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user ID")
			return
		}

		taskID := c.Param("id")
		role, _ := c.Get("role")

		var task models.Task
		query := db.Where("id = ?", taskID)

		// Non-admins can only see their own tasks
		if role != "admin" {
			query = query.Where("user_id = ?", userID)
		}

		if err := query.
			Preload("Labels").
			Preload("Subtasks", func(db *gorm.DB) *gorm.DB { return db.Order("position ASC") }).
			Preload("Comments", func(db *gorm.DB) *gorm.DB { return db.Order("created_at ASC").Preload("User") }).
			Preload("Attachments").
			Preload("ActivityLogs", func(db *gorm.DB) *gorm.DB { return db.Order("created_at DESC").Limit(20).Preload("User") }).
			Preload("Assignee").
			First(&task).Error; err != nil {
			logger.Warn("Task not found", zap.String("task_id", taskID), zap.String("user_id", userIDStr))
			response.Error(c, http.StatusNotFound, "TASK_NOT_FOUND", "Task with ID "+taskID+" was not found")
			return
		}

		// Populate computed fields
		var subtasksCompleted, commentsCount, attachmentsCount int64
		db.Model(&models.Subtask{}).Where("task_id = ? AND completed = true", task.ID).Count(&subtasksCompleted)
		db.Model(&models.Comment{}).Where("task_id = ?", task.ID).Count(&commentsCount)
		db.Model(&models.Attachment{}).Where("task_id = ?", task.ID).Count(&attachmentsCount)
		task.SubtasksCompleted = int(subtasksCompleted)
		task.CommentsCount = int(commentsCount)
		task.AttachmentsCount = int(attachmentsCount)

		logger.Info("Task retrieved", zap.String("task_id", taskID), zap.String("user_id", userIDStr))
		response.Success(c, http.StatusOK, task)
	}
}

// UpdateTask partially updates a task.
func UpdateTask(db *gorm.DB, hub *services.Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("user_id")
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user ID")
			return
		}

		taskID := c.Param("id")
		role, _ := c.Get("role")

		var task models.Task
		query := db.Where("id = ?", taskID)
		if role != "admin" {
			query = query.Where("user_id = ?", userID)
		}
		if err := query.First(&task).Error; err != nil {
			response.Error(c, http.StatusNotFound, "TASK_NOT_FOUND", "Task with ID "+taskID+" was not found")
			return
		}

		var input struct {
			Title       *string    `json:"title"`
			Description *string    `json:"description"`
			Status      *string    `json:"status"`
			Priority    *string    `json:"priority"`
			DueDate     *time.Time `json:"due_date"`
			AssignedTo  *string    `json:"assigned_to"`
			Position    *int       `json:"position"`
			LabelIDs    []string   `json:"label_ids"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			response.Error(c, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid request body")
			return
		}

		// Track changes for activity log
		changedFields := []string{}

		updates := map[string]interface{}{}

		if input.Title != nil && *input.Title != task.Title {
			services.LogActivity(db, task.ID, userID, "task_updated", "title", task.Title, *input.Title)
			updates["title"] = *input.Title
			changedFields = append(changedFields, "title")
		}
		if input.Description != nil && *input.Description != task.Description {
			services.LogActivity(db, task.ID, userID, "task_updated", "description", task.Description, *input.Description)
			updates["description"] = *input.Description
			changedFields = append(changedFields, "description")
		}
		if input.Status != nil && *input.Status != task.Status {
			services.LogActivity(db, task.ID, userID, "status_changed", "status", task.Status, *input.Status)
			updates["status"] = *input.Status
			changedFields = append(changedFields, "status")
		}
		if input.Priority != nil && *input.Priority != task.Priority {
			services.LogActivity(db, task.ID, userID, "priority_changed", "priority", task.Priority, *input.Priority)
			updates["priority"] = *input.Priority
			changedFields = append(changedFields, "priority")
		}
		if input.DueDate != nil {
			var oldDueDate *time.Time
			if task.DueDate != nil {
				oldDueDate = task.DueDate
			}
			// Only log and update if value actually changed
			if (oldDueDate == nil && input.DueDate != nil) || (oldDueDate != nil && !oldDueDate.Equal(*input.DueDate)) {
				services.LogActivity(db, task.ID, userID, "due_date_changed", "due_date", oldDueDate, *input.DueDate)
				updates["due_date"] = *input.DueDate
				changedFields = append(changedFields, "due_date")
			}
		}
		if input.Position != nil {
			updates["position"] = *input.Position
		}
		if input.AssignedTo != nil {
			var newAssigned *uuid.UUID
			if *input.AssignedTo != "" {
				at, err := uuid.Parse(*input.AssignedTo)
				if err != nil {
					response.ValidationError(c, gin.H{"assigned_to": "Invalid user ID"})
					return
				}
				newAssigned = &at
			}
			services.LogActivity(db, task.ID, userID, "assigned", "assigned_to", task.AssignedTo, newAssigned)
			updates["assigned_to"] = newAssigned
			changedFields = append(changedFields, "assigned_to")
		}

		// Update labels
		if input.LabelIDs != nil {
			db.Exec("DELETE FROM task_labels WHERE task_id = ?", task.ID)
			for _, lid := range input.LabelIDs {
				labelID, err := uuid.Parse(lid)
				if err != nil {
					continue
				}
				db.Exec("INSERT INTO task_labels (task_id, label_id) VALUES (?, ?) ON CONFLICT DO NOTHING", task.ID, labelID)
			}
			services.LogActivity(db, task.ID, userID, "label_changed", "labels", nil, len(input.LabelIDs))
		}

		if len(updates) > 0 {
			if err := db.Model(&task).Updates(updates).Error; err != nil {
				logger.Error("Failed to update task", zap.String("task_id", taskID), zap.Error(err))
				response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to update task")
				return
			}
		}

		// Reload task with labels
		db.Preload("Labels").Preload("Assignee").First(&task, task.ID)

		// Broadcast WS event
		hub.Broadcast(&services.Event{
			Type:    "task:updated",
			Payload: task,
			UserID:  userIDStr,
		}, userIDStr)

		logger.Info("Task updated", zap.String("task_id", taskID), zap.Strings("changed_fields", changedFields))
		response.Success(c, http.StatusOK, task)
	}
}

// DeleteTask soft-deletes a task.
func DeleteTask(db *gorm.DB, hub *services.Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("user_id")
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user ID")
			return
		}

		taskID := c.Param("id")
		role, _ := c.Get("role")

		var task models.Task
		query := db.Where("id = ?", taskID)
		if role != "admin" {
			query = query.Where("user_id = ?", userID)
		}
		if err := query.First(&task).Error; err != nil {
			response.Error(c, http.StatusNotFound, "TASK_NOT_FOUND", "Task with ID "+taskID+" was not found")
			return
		}

		if err := db.Delete(&task).Error; err != nil {
			logger.Error("Failed to delete task", zap.String("task_id", taskID), zap.Error(err))
			response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete task")
			return
		}

		services.LogActivity(db, task.ID, userID, "task_deleted", "", nil, nil)

		hub.Broadcast(&services.Event{
			Type:    "task:deleted",
			Payload: gin.H{"id": taskID},
			UserID:  userIDStr,
		}, userIDStr)

		logger.Info("Task deleted", zap.String("task_id", taskID), zap.String("user_id", userIDStr))
		response.SuccessNoContent(c)
	}
}

// ExportTasksCSV exports tasks as CSV with the same filters as ListTasks.
func ExportTasksCSV(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("user_id")
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user ID")
			return
		}

		query := db.Model(&models.Task{}).Where("tasks.user_id = ? AND tasks.deleted_at IS NULL", userID)

		// Apply same filters as ListTasks
		if status := c.Query("status"); status != "" {
			statuses := strings.Split(status, ",")
			query = query.Where("tasks.status IN ?", statuses)
		}
		if priority := c.Query("priority"); priority != "" {
			priorities := strings.Split(priority, ",")
			query = query.Where("tasks.priority IN ?", priorities)
		}
		if search := c.Query("search"); search != "" {
			query = query.Where("to_tsvector('english', tasks.title) @@ plainto_tsquery('english', ?)", search)
		}

		var tasks []models.Task
		query.Preload("Labels").Find(&tasks)

		c.Header("Content-Type", "text/csv")
		c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"taskflow-export-%s.csv\"", time.Now().Format("2006-01-02")))

		writer := csv.NewWriter(c.Writer)
		defer writer.Flush()

		// Header
		writer.Write([]string{"ID", "Title", "Description", "Status", "Priority", "Labels", "Due Date", "Created At"})

		// Rows
		for _, task := range tasks {
			labels := []string{}
			for _, l := range task.Labels {
				labels = append(labels, l.Name)
			}
			dueDate := ""
			if task.DueDate != nil {
				dueDate = task.DueDate.Format(time.RFC3339)
			}
			writer.Write([]string{
				task.ID.String(),
				task.Title,
				task.Description,
				task.Status,
				task.Priority,
				strings.Join(labels, ", "),
				dueDate,
				task.CreatedAt.Format(time.RFC3339),
			})
		}

		logger.Info("Tasks exported", zap.String("user_id", userIDStr), zap.Int("count", len(tasks)))
	}
}

// BulkTaskAction performs bulk operations on multiple tasks.
func BulkTaskAction(db *gorm.DB, hub *services.Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("user_id")
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user ID")
			return
		}

		var input struct {
			TaskIDs []string `json:"task_ids" validate:"required"`
			Action  string   `json:"action" validate:"required,oneof=delete update_status update_priority add_label"`
			Payload struct {
				Status  string `json:"status"`
				Priority string `json:"priority"`
				LabelID string `json:"label_id"`
			} `json:"payload"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			response.Error(c, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid request body")
			return
		}

		if len(input.TaskIDs) == 0 {
			response.Error(c, http.StatusBadRequest, "INVALID_PAYLOAD", "No task IDs provided")
			return
		}

		// Parse task IDs
		taskIDs := []uuid.UUID{}
		for _, idStr := range input.TaskIDs {
			id, err := uuid.Parse(idStr)
			if err != nil {
				continue
			}
			taskIDs = append(taskIDs, id)
		}

		// Verify all tasks belong to user
		var tasks []models.Task
		role, _ := c.Get("role")
		query := db.Where("id IN ?", taskIDs)
		if role != "admin" {
			query = query.Where("user_id = ?", userID)
		}
		if err := query.Find(&tasks).Error; err != nil {
			logger.Error("Failed to fetch tasks for bulk action", zap.Error(err))
			response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to fetch tasks")
			return
		}

		affected := 0
		for _, task := range tasks {
			switch input.Action {
			case "delete":
				db.Delete(&task)
				services.LogActivity(db, task.ID, userID, "task_deleted", "", nil, nil)
				hub.Broadcast(&services.Event{Type: "task:deleted", Payload: gin.H{"id": task.ID.String()}, UserID: userIDStr}, userIDStr)
		case "update_status":
			oldStatus := task.Status
			db.Model(&task).Update("status", input.Payload.Status)
			services.LogActivity(db, task.ID, userID, "status_changed", "status", oldStatus, input.Payload.Status)
			db.Preload("Labels").First(&task, task.ID)
			hub.Broadcast(&services.Event{Type: "task:updated", Payload: task, UserID: userIDStr}, userIDStr)
		case "update_priority":
			oldPriority := task.Priority
			db.Model(&task).Update("priority", input.Payload.Priority)
			services.LogActivity(db, task.ID, userID, "priority_changed", "priority", oldPriority, input.Payload.Priority)
			db.Preload("Labels").First(&task, task.ID)
			hub.Broadcast(&services.Event{Type: "task:updated", Payload: task, UserID: userIDStr}, userIDStr)
			case "add_label":
				labelID, err := uuid.Parse(input.Payload.LabelID)
				if err == nil {
					db.Exec("INSERT INTO task_labels (task_id, label_id) VALUES (?, ?) ON CONFLICT DO NOTHING", task.ID, labelID)
					services.LogActivity(db, task.ID, userID, "label_added", "labels", nil, labelID.String())
				}
			}
			affected++
		}

		logger.Info("Bulk action completed", zap.String("action", input.Action), zap.Int("affected", affected))
		response.Success(c, http.StatusOK, gin.H{"affected": affected})
	}
}
