package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jaivanshchawla/taskflow/internal/config"
	"github.com/jaivanshchawla/taskflow/pkg/response"
	"gorm.io/gorm"
)

// Health returns server health status.
func Health(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		response.Success(c, http.StatusOK, gin.H{
			"status":    "ok",
			"env":       cfg.Env,
			"timestamp": time.Now().UTC().Format(time.RFC3339),
		})
	}
}

// HealthDB checks database connectivity.
func HealthDB(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		sqlDB, err := db.DB()
		if err != nil {
			response.Error(c, http.StatusServiceUnavailable, "DATABASE_ERROR", "Database not available")
			return
		}

		if err := sqlDB.Ping(); err != nil {
			response.Error(c, http.StatusServiceUnavailable, "DATABASE_ERROR", "Database connection failed")
			return
		}

		response.Success(c, http.StatusOK, gin.H{
			"status": "ok",
			"db":     "connected",
		})
	}
}
