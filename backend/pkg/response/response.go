package response

import (
	"math"
	"net/http"

	"github.com/gin-gonic/gin"
)

// Meta contains pagination metadata.
type Meta struct {
	Page       int `json:"page"`
	PerPage    int `json:"per_page"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

// SuccessResponse is the standard success envelope.
type SuccessResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data"`
	Meta    *Meta       `json:"meta,omitempty"`
}

// ErrorResponse is the standard error envelope.
type ErrorResponse struct {
	Success bool        `json:"success"`
	Error   ErrorDetail `json:"error"`
}

// ErrorDetail contains structured error information.
type ErrorDetail struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

// Success sends a success response with data.
func Success(c *gin.Context, status int, data interface{}) {
	c.JSON(status, SuccessResponse{
		Success: true,
		Data:    data,
	})
}

// SuccessNoContent sends a 204 No Content response.
func SuccessNoContent(c *gin.Context) {
	c.Status(http.StatusNoContent)
}

// SuccessPaginated sends a paginated success response.
func SuccessPaginated(c *gin.Context, data interface{}, page, perPage, total int) {
	totalPages := int(math.Ceil(float64(total) / float64(perPage)))
	if totalPages < 1 {
		totalPages = 1
	}

	c.JSON(http.StatusOK, SuccessResponse{
		Success: true,
		Data:    data,
		Meta: &Meta{
			Page:       page,
			PerPage:    perPage,
			Total:      total,
			TotalPages: totalPages,
		},
	})
}

// Error sends a structured error response.
func Error(c *gin.Context, status int, code, message string) {
	c.JSON(status, ErrorResponse{
		Success: false,
		Error: ErrorDetail{
			Code:    code,
			Message: message,
		},
	})
}

// ErrorWithDetails sends an error response with additional details.
func ErrorWithDetails(c *gin.Context, status int, code, message string, details interface{}) {
	c.JSON(status, ErrorResponse{
		Success: false,
		Error: ErrorDetail{
			Code:    code,
			Message: message,
			Details: details,
		},
	})
}

// ValidationError sends a 422 validation error response.
func ValidationError(c *gin.Context, details interface{}) {
	c.JSON(http.StatusUnprocessableEntity, ErrorResponse{
		Success: false,
		Error: ErrorDetail{
			Code:    "VALIDATION_ERROR",
			Message: "Invalid input",
			Details: details,
		},
	})
}
