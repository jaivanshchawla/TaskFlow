package handlers

import (
	"net/http"
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

func BulkCreateTasks(db *gorm.DB, hub *services.Hub) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDStr := c.GetString("user_id")
		userID, err := uuid.Parse(userIDStr)
		if err != nil {
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid user ID")
			return
		}

		var input struct {
			Tasks []struct {
				Title       string     `json:"title" validate:"required,max=500"`
				Description string     `json:"description"`
				Status      string     `json:"status"`
				Priority    string     `json:"priority"`
				DueDate     *time.Time `json:"due_date"`
				LabelIDs    []string   `json:"label_ids"`
			} `json:"tasks" validate:"required"`
		}

		if err := c.ShouldBindJSON(&input); err != nil {
			response.Error(c, http.StatusBadRequest, "INVALID_PAYLOAD", "Invalid request body")
			return
		}

		if len(input.Tasks) == 0 {
			response.Error(c, http.StatusBadRequest, "INVALID_PAYLOAD", "No tasks provided")
			return
		}

		validStatuses := map[string]bool{"todo": true, "in_progress": true, "in_review": true, "done": true, "cancelled": true}
		validPriorities := map[string]bool{"low": true, "medium": true, "high": true, "urgent": true}

		var created []models.Task
		var allLabelIDs []interface{}

		txErr := db.Transaction(func(tx *gorm.DB) error {
			var tasksToCreate []models.Task
			for _, t := range input.Tasks {
				if t.Title == "" {
					continue
				}

				status := t.Status
				if status == "" || !validStatuses[status] {
					status = "todo"
				}

				priority := t.Priority
				if priority == "" || !validPriorities[priority] {
					priority = "medium"
				}

				tasksToCreate = append(tasksToCreate, models.Task{
					UserID:      userID,
					Title:       t.Title,
					Description: t.Description,
					Status:      status,
					Priority:    priority,
					DueDate:     t.DueDate,
				})
			}

			if len(tasksToCreate) == 0 {
				return nil
			}

			if createErr := tx.Create(&tasksToCreate).Error; createErr != nil {
				return createErr
			}

			for i, t := range input.Tasks {
				if i >= len(tasksToCreate) {
					break
				}
				if len(t.LabelIDs) > 0 {
					for _, lid := range t.LabelIDs {
						labelID, parseErr := uuid.Parse(lid)
						if parseErr != nil {
							continue
						}
						allLabelIDs = append(allLabelIDs, tasksToCreate[i].ID, labelID)
					}
				}
			}

			if len(allLabelIDs) > 0 {
				placeholders := ""
				for i := 0; i < len(allLabelIDs)/2; i++ {
					if i > 0 {
						placeholders += ", "
					}
					placeholders += "(?, ?)"
				}
				if execErr := tx.Exec("INSERT INTO task_labels (task_id, label_id) VALUES "+placeholders+" ON CONFLICT DO NOTHING", allLabelIDs...).Error; execErr != nil {
					return execErr
				}
			}

			for i := range tasksToCreate {
				services.LogActivity(tx, tasksToCreate[i].ID, userID, "task_created", "", nil, tasksToCreate[i].Title)
			}

			created = tasksToCreate
			return nil
		})
		if txErr != nil {
			logger.Error("Failed to bulk create tasks", zap.Error(txErr))
			response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to bulk create tasks")
			return
		}

		for i := range created {
			if len(created[i].Labels) == 0 {
				db.Preload("Labels").First(&created[i], created[i].ID)
			}
		}

		hub.Broadcast(&services.Event{
			Type:    "tasks:bulk_created",
			Payload: gin.H{"count": len(created)},
			UserID:  userIDStr,
		}, userIDStr)

		logger.Info("Bulk tasks created", zap.String("user_id", userIDStr), zap.Int("count", len(created)))
		response.Success(c, http.StatusCreated, gin.H{"tasks": created, "count": len(created)})
	}
}
