package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jaivanshchawla/taskflow/pkg/logger"
	"go.uber.org/zap"
)

// Logger returns a Gin middleware that logs every HTTP request.
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		method := c.Request.Method

		// Process request
		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()
		userID := c.GetString("user_id")
		if userID == "" {
			userID = "anonymous"
		}

		// Log based on status code
		fields := []zap.Field{
			zap.String("method", method),
			zap.String("path", path),
			zap.Int("status", status),
			zap.Duration("latency", latency),
			zap.String("user_id", userID),
			zap.String("ip", c.ClientIP()),
		}

		if status >= 500 {
			logger.Error("HTTP request", fields...)
		} else if status >= 400 {
			logger.Warn("HTTP request", fields...)
		} else {
			logger.Info("HTTP request", fields...)
		}
	}
}
