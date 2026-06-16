package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jaivanshchawla/taskflow/internal/models"
	"github.com/jaivanshchawla/taskflow/internal/services"
	"github.com/jaivanshchawla/taskflow/pkg/logger"
	"github.com/jaivanshchawla/taskflow/pkg/response"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ListTemplates returns all templates for the current user.
func ListTemplates(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("user_id")
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user ID")
			return
		}

		var templates []models.TaskTemplate
		if err := db.Where("user_id = ?", userID).Order("created_at DESC").Limit(100).Find(&templates).Error; err != nil {
			logger.Error("Failed to list templates", zap.Error(err))
			response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to list templates")
			return
		}

		response.Success(c, http.StatusOK, templates)
	}
}

// CreateTemplate creates a new task template.
func CreateTemplate(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("user_id")
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user ID")
			return
		}

		var input struct {
			Name                string  `json:"name" validate:"required,max=200"`
			TitleTemplate       string  `json:"title_template"`
			DescriptionTemplate string  `json:"description_template"`
			Priority            string  `json:"priority"`
			DefaultLabels       *string `json:"default_labels"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			response.Error(c, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid request body")
			return
		}

		if input.Priority == "" {
			input.Priority = "medium"
		}

		template := models.TaskTemplate{
			UserID:              userID,
			Name:                input.Name,
			TitleTemplate:       input.TitleTemplate,
			DescriptionTemplate: input.DescriptionTemplate,
			Priority:            input.Priority,
			DefaultLabels:       input.DefaultLabels,
		}

		if err := db.Create(&template).Error; err != nil {
			logger.Error("Failed to create template", zap.Error(err))
			response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create template")
			return
		}

		logger.Info("Template created", zap.String("template_id", template.ID.String()))
		response.Success(c, http.StatusCreated, template)
	}
}

// DeleteTemplate deletes a template.
func DeleteTemplate(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("user_id")
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user ID")
			return
		}

		templateID := c.Param("id")
		var template models.TaskTemplate
		if err := db.Where("id = ? AND user_id = ?", templateID, userID).First(&template).Error; err != nil {
			response.Error(c, http.StatusNotFound, "TEMPLATE_NOT_FOUND", "Template not found")
			return
		}

		if err := db.Delete(&template).Error; err != nil {
			logger.Error("Failed to delete template", zap.Error(err))
			response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to delete template")
			return
		}

		logger.Info("Template deleted", zap.String("template_id", templateID))
		response.SuccessNoContent(c)
	}
}

// ApplyTemplate creates a new task from a template.
func ApplyTemplate(db *gorm.DB, hub *services.Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("user_id")
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user ID")
			return
		}

		templateID := c.Param("id")
		var template models.TaskTemplate
		if err := db.Where("id = ? AND user_id = ?", templateID, userID).First(&template).Error; err != nil {
			response.Error(c, http.StatusNotFound, "TEMPLATE_NOT_FOUND", "Template not found")
			return
		}

		task := models.Task{
			UserID:      userID,
			Title:       template.TitleTemplate,
			Description: template.DescriptionTemplate,
			Status:      "todo",
			Priority:    template.Priority,
		}

		if err := db.Create(&task).Error; err != nil {
			logger.Error("Failed to create task from template", zap.Error(err))
			response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create task from template")
			return
		}

		services.LogActivity(db, task.ID, userID, "task_created", "title", nil, task.Title)
		hub.Broadcast(&services.Event{Type: "task:created", Payload: task, UserID: userIDStr}, userIDStr)

		logger.Info("Task created from template", zap.String("task_id", task.ID.String()), zap.String("template_id", templateID))
		response.Success(c, http.StatusCreated, task)
	}
}
