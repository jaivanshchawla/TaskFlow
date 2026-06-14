package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jaivanshchawla/taskflow/pkg/response"
	"github.com/ulule/limiter/v3"
	"github.com/ulule/limiter/v3/drivers/store/memory"
)

// RateLimit returns a Gin middleware that limits to 100 requests per minute per IP.
func RateLimit() gin.HandlerFunc {
	rate := limiter.Rate{
		Period: 1 * time.Minute,
		Limit:  100,
	}

	store := memory.NewStore()

	return func(c *gin.Context) {
		key := fmt.Sprintf("limiter:%s", c.ClientIP())
		limitCtx, err := store.Increment(c.Request.Context(), key, 1, rate)
		if err != nil {
			// On error, allow the request through
			c.Next()
			return
		}

		if limitCtx.Reached {
			response.Error(c, http.StatusTooManyRequests, "RATE_LIMIT_EXCEEDED", "Too many requests. Please try again later.")
			c.Abort()
			return
		}

		c.Next()
	}
}
