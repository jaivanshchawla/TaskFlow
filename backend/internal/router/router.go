package router

import (
	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
	"github.com/jaivanshchawla/taskflow/internal/config"
	"github.com/jaivanshchawla/taskflow/internal/handlers"
	"github.com/jaivanshchawla/taskflow/internal/middleware"
	"github.com/jaivanshchawla/taskflow/internal/services"
	"gorm.io/gorm"
)

// SetupRouter configures all routes for the application.
func SetupRouter(db *gorm.DB, hub *services.Hub, cfg *config.Config) *gin.Engine {
	r := gin.New()

	// Global middleware
	r.Use(middleware.Recovery())
	r.Use(middleware.Logger())
	r.Use(middleware.CORS(cfg.FrontendURL))
	r.Use(middleware.RateLimit())
	r.Use(gzip.Gzip(gzip.DefaultCompression))

	// Public health endpoints (Railway needs these)
	r.GET("/health", handlers.Health(cfg))
	r.GET("/api/v1/health/db", handlers.HealthDB(db))

	// Clerk webhook (public — has its own signature verification)
	r.POST("/api/webhooks/clerk", handlers.ClerkWebhook(db, cfg))

	// Protected API
	api := r.Group("/api/v1")
	api.Use(middleware.Auth(db, cfg))
	{
		// Users
		api.GET("/users/me", handlers.GetMe(db))
		api.PATCH("/users/me/preferences", handlers.UpdatePreferences(db))

		// Stats
		api.GET("/stats", handlers.GetStats(db))

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

			// Subtasks
			tasks.POST("/:id/subtasks", handlers.CreateSubtask(db, hub))
			tasks.PATCH("/:id/subtasks/:subtask_id", handlers.UpdateSubtask(db, hub))
			tasks.DELETE("/:id/subtasks/:subtask_id", handlers.DeleteSubtask(db, hub))
			tasks.PATCH("/:id/subtasks/reorder", handlers.ReorderSubtasks(db))

			// Comments
			tasks.GET("/:id/comments", handlers.ListComments(db))
			tasks.POST("/:id/comments", handlers.CreateComment(db, hub))
			tasks.PATCH("/:id/comments/:comment_id", handlers.UpdateComment(db))
			tasks.DELETE("/:id/comments/:comment_id", handlers.DeleteComment(db))

			// Attachments
			tasks.POST("/:id/attachments", handlers.CreateAttachment(db, hub))
			tasks.DELETE("/:id/attachments/:attachment_id", handlers.DeleteAttachment(db))

			// Activity
			tasks.GET("/:id/activity", handlers.GetActivity(db))
		}

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

		// WebSocket
		api.GET("/ws", handlers.WebSocketHandler(hub, db))

		// Admin
		admin := api.Group("/admin")
		admin.Use(middleware.AdminOnly())
		{
			admin.GET("/users", handlers.AdminListUsers(db))
			admin.PATCH("/users/:id", handlers.AdminUpdateUser(db))
			admin.GET("/tasks", handlers.AdminListTasks(db))
			admin.GET("/activity", handlers.AdminGetActivity(db))
			admin.GET("/stats", handlers.AdminGetStats(db))
		}
	}

	return r
}
