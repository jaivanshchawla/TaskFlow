package middleware

import (
	"net/http"
	"runtime/debug"

	"github.com/gin-gonic/gin"
	"github.com/jaivanshchawla/taskflow/pkg/logger"
	"github.com/jaivanshchawla/taskflow/pkg/response"
	"go.uber.org/zap"
)

// Recovery returns a Gin middleware that recovers from panics.
func Recovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				stack := debug.Stack()
				logger.Error("Panic recovered",
					zap.String("path", c.Request.URL.Path),
					zap.String("method", c.Request.Method),
					zap.Any("panic", err),
					zap.String("stack", string(stack)),
				)
				response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Internal server error")
				c.Abort()
			}
		}()
		c.Next()
	}
}
