package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jaivanshchawla/taskflow/pkg/logger"
	"github.com/jaivanshchawla/taskflow/pkg/response"
	"go.uber.org/zap"
)

// AdminOnly returns a Gin middleware that requires admin role.
// Must run AFTER Auth middleware.
func AdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, _ := c.Get("role")
		roleStr, _ := role.(string)

		if roleStr != "admin" {
			logger.Warn("Admin access denied",
				zap.String("user_id", c.GetString("user_id")),
				zap.String("path", c.Request.URL.Path),
				zap.String("role", roleStr),
			)
			response.Error(c, http.StatusForbidden, "FORBIDDEN", "Admin access required")
			c.Abort()
			return
		}

		c.Next()
	}
}
