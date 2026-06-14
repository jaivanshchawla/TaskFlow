package main

import (
	"fmt"

	"github.com/jaivanshchawla/taskflow/internal/config"
	"github.com/jaivanshchawla/taskflow/internal/database"
	"github.com/jaivanshchawla/taskflow/internal/router"
	"github.com/jaivanshchawla/taskflow/internal/services"
	"github.com/jaivanshchawla/taskflow/pkg/logger"
	"github.com/joho/godotenv"
	"go.uber.org/zap"
)

func main() {
	// 1. Load .env
	_ = godotenv.Load()

	// 2. Init logger first with sensible defaults (so config.Load can safely call logger.Fatal)
	logger.Init("development", "debug")

	// 3. Load config (fatal if required vars missing — logger is safe to use now)
	cfg := config.Load()

	// 4. Re-init logger with actual config values
	logger.Init(cfg.Env, cfg.LogLevel)
	defer logger.Sync()

	logger.Info("Starting TaskFlow backend",
		zap.String("env", cfg.Env),
		zap.Int("port", cfg.Port),
		zap.String("version", "1.0.0"),
	)

	// 5. Connect to PostgreSQL with retry
	db := database.Connect(cfg.DatabaseURL)
	logger.Info("Database connected successfully")

	// 6. Run auto-migrations
	database.Migrate(db)
	logger.Info("Database migrations complete")

	// 7. Initialize WebSocket hub
	hub := services.NewHub()
	go hub.Run()
	logger.Info("WebSocket hub initialized")

	// 8. Register all routes
	r := router.SetupRouter(db, hub, cfg)

	// 9. Start server
	addr := fmt.Sprintf(":%d", cfg.Port)
	logger.Info("Server listening", zap.String("addr", addr))
	if err := r.Run(addr); err != nil {
		logger.Fatal("Server failed to start", zap.Error(err))
	}
}
