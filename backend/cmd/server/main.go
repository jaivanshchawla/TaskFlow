package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

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

	// 9. Start server with proper timeouts
	addr := fmt.Sprintf(":%d", cfg.Port)
	srv := &http.Server{
		Addr:              addr,
		Handler:           r,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       120 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
	}

	logger.Info("Server listening", zap.String("addr", addr))

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Server failed to start", zap.Error(err))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	logger.Info("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown", zap.Error(err))
	}
	logger.Info("Server exited cleanly")
}
