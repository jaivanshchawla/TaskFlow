package errors

// AppError represents a structured application error with a code and message.
type AppError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Status  int    `json:"-"`
}

// Error implements the error interface.
func (e *AppError) Error() string {
	return e.Message
}

// Predefined error codes.
const (
	CodeUnauthorized      = "UNAUTHORIZED"
	CodeForbidden         = "FORBIDDEN"
	CodeNotFound          = "NOT_FOUND"
	CodeValidationError   = "VALIDATION_ERROR"
	CodeInternalError     = "INTERNAL_ERROR"
	CodeTaskNotFound      = "TASK_NOT_FOUND"
	CodeUserNotFound      = "USER_NOT_FOUND"
	CodeLabelNotFound     = "LABEL_NOT_FOUND"
	CodeTemplateNotFound  = "TEMPLATE_NOT_FOUND"
	CodeSubtaskNotFound   = "SUBTASK_NOT_FOUND"
	CodeCommentNotFound   = "COMMENT_NOT_FOUND"
	CodeAttachmentNotFound = "ATTACHMENT_NOT_FOUND"
	CodeDuplicateEntry    = "DUPLICATE_ENTRY"
	CodeInvalidPayload    = "INVALID_PAYLOAD"
	CodeWebhookInvalid    = "WEBHOOK_INVALID"
)

// New creates a new AppError.
func New(code string, status int, message string) *AppError {
	return &AppError{
		Code:    code,
		Message: message,
		Status:  status,
	}
}

// Common error constructors.

func Unauthorized(message string) *AppError {
	if message == "" {
		message = "Authentication required"
	}
	return New(CodeUnauthorized, 401, message)
}

func Forbidden(message string) *AppError {
	if message == "" {
		message = "Access denied"
	}
	return New(CodeForbidden, 403, message)
}

func NotFound(message string) *AppError {
	if message == "" {
		message = "Resource not found"
	}
	return New(CodeNotFound, 404, message)
}

func ValidationError(message string) *AppError {
	if message == "" {
		message = "Invalid input"
	}
	return New(CodeValidationError, 422, message)
}

func InternalError(message string) *AppError {
	if message == "" {
		message = "Internal server error"
	}
	return New(CodeInternalError, 500, message)
}

func TaskNotFound(id string) *AppError {
	return New(CodeTaskNotFound, 404, "Task with ID "+id+" was not found")
}

func UserNotFound(id string) *AppError {
	return New(CodeUserNotFound, 404, "User with ID "+id+" was not found")
}

func LabelNotFound(id string) *AppError {
	return New(CodeLabelNotFound, 404, "Label with ID "+id+" was not found")
}

func TemplateNotFound(id string) *AppError {
	return New(CodeTemplateNotFound, 404, "Template with ID "+id+" was not found")
}

func SubtaskNotFound(id string) *AppError {
	return New(CodeSubtaskNotFound, 404, "Subtask with ID "+id+" was not found")
}

func CommentNotFound(id string) *AppError {
	return New(CodeCommentNotFound, 404, "Comment with ID "+id+" was not found")
}

func AttachmentNotFound(id string) *AppError {
	return New(CodeAttachmentNotFound, 404, "Attachment with ID "+id+" was not found")
}

func DuplicateEntry(message string) *AppError {
	return New(CodeDuplicateEntry, 409, message)
}

func InvalidPayload(message string) *AppError {
	return New(CodeInvalidPayload, 400, message)
}
