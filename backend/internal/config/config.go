package config

import (
	"os"
	"strconv"

	"github.com/jaivanshchawla/taskflow/pkg/logger"
	"go.uber.org/zap"
)

// Config holds all application configuration.
type Config struct {
	Port               int
	Env                string
	DatabaseURL        string
	ClerkSecretKey     string
	ClerkWebhookSecret string
	ClerkJWKSURL       string
	FrontendURL        string
	LogLevel           string
	LogFormat          string
}

// Load reads configuration from environment variables.
// Fatal if any required var is missing.
func Load() *Config {
	cfg := &Config{}

	// Port
	portStr := getEnv("PORT", "8080")
	port, err := strconv.Atoi(portStr)
	if err != nil {
		port = 8080
	}
	cfg.Port = port

	// Environment
	cfg.Env = getEnv("ENV", "development")

	// Database (required)
	cfg.DatabaseURL = getEnvRequired("DATABASE_URL")

	// Clerk (required)
	cfg.ClerkSecretKey = getEnvRequired("CLERK_SECRET_KEY")
	cfg.ClerkWebhookSecret = getEnvRequired("CLERK_WEBHOOK_SECRET")
	cfg.ClerkJWKSURL = getEnvRequired("CLERK_JWKS_URL")

	// CORS
	cfg.FrontendURL = getEnv("FRONTEND_URL", "http://localhost:3000")

	// Logging
	cfg.LogLevel = getEnv("LOG_LEVEL", "debug")
	cfg.LogFormat = getEnv("LOG_FORMAT", "console")

	// Log config (redact secrets)
	if logger.Log != nil {
		logger.Log.Info("Configuration loaded",
			zap.Int("port", cfg.Port),
			zap.String("env", cfg.Env),
			zap.String("database_url", redactURL(cfg.DatabaseURL)),
			zap.String("clerk_secret_key", redactSecret(cfg.ClerkSecretKey)),
			zap.String("clerk_webhook_secret", redactSecret(cfg.ClerkWebhookSecret)),
			zap.String("clerk_jwks_url", cfg.ClerkJWKSURL),
			zap.String("frontend_url", cfg.FrontendURL),
			zap.String("log_level", cfg.LogLevel),
		)
	}

	return cfg
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func getEnvRequired(key string) string {
	val := os.Getenv(key)
	if val == "" {
		logger.Fatal("Missing required environment variable",
			zap.String("key", key),
		)
	}
	return val
}

// redactSecret shows only the first 8 characters of a secret.
func redactSecret(s string) string {
	if len(s) <= 8 {
		return "****"
	}
	return s[:8] + "****"
}

// redactURL masks the password in a database URL.
func redactURL(url string) string {
	// Simple redaction: replace everything between :// and @
	start := -1
	end := -1
	for i, c := range url {
		if c == ':' && i+2 < len(url) && url[i+1] == '/' && url[i+2] == '/' {
			start = i + 3
		}
		if c == '@' && start > 0 {
			end = i
			break
		}
	}
	if start > 0 && end > start {
		return url[:start] + "****" + url[end:]
	}
	return url
}
