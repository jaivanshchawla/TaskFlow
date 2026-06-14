package logger

import (
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// Log is the global logger instance.
var Log *zap.Logger

// Init initializes the global zap logger based on environment and level.
func Init(env, level string) {
	var cfg zap.Config
	if env == "production" || env == "test" {
		cfg = zap.NewProductionConfig()
		cfg.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	} else {
		cfg = zap.NewDevelopmentConfig()
		cfg.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
	}

	lvl, err := zapcore.ParseLevel(level)
	if err != nil {
		lvl = zapcore.DebugLevel
	}
	cfg.Level = zap.NewAtomicLevelAt(lvl)

	// Write to stdout
	cfg.OutputPaths = []string{"stdout"}
	cfg.ErrorOutputPaths = []string{"stderr"}

	log, err := cfg.Build(zap.AddCallerSkip(0))
	if err != nil {
		panic("failed to initialize logger: " + err.Error())
	}
	Log = log
	Log.Info("Logger initialized",
		zap.String("env", env),
		zap.String("level", level),
	)
}

// Info logs at info level.
func Info(msg string, fields ...zap.Field) { Log.Info(msg, fields...) }

// Warn logs at warn level.
func Warn(msg string, fields ...zap.Field) { Log.Warn(msg, fields...) }

// Error logs at error level.
func Error(msg string, fields ...zap.Field) { Log.Error(msg, fields...) }

// Debug logs at debug level.
func Debug(msg string, fields ...zap.Field) { Log.Debug(msg, fields...) }

// Fatal logs at fatal level and exits.
func Fatal(msg string, fields ...zap.Field) { Log.Fatal(msg, fields...) }

// Sync flushes any buffered log entries.
func Sync() {
	if Log != nil {
		_ = Log.Sync()
	}
}

// RedactSecret returns only the first 8 characters of a secret for logging.
func RedactSecret(s string) string {
	if len(s) <= 8 {
		return "****"
	}
	return s[:8] + "****"
}

