package middleware

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/jaivanshchawla/taskflow/internal/config"
	"github.com/jaivanshchawla/taskflow/internal/models"
	"github.com/jaivanshchawla/taskflow/pkg/logger"
	"github.com/jaivanshchawla/taskflow/pkg/response"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// JWKS cache for Clerk's public keys.
type jwksCache struct {
	keys      []jwkKey
	fetchedAt time.Time
	mu        sync.RWMutex
}

type jwkKey struct {
	Kid string `json:"kid"`
	Kty string `json:"kty"`
	Alg string `json:"alg"`
	Use string `json:"use"`
	N   string `json:"n"`
	E   string `json:"e"`
}

type jwksResponse struct {
	Keys []jwkKey `json:"keys"`
}

var (
	jwksCacheInstance = &jwksCache{}
	jwksCacheTTL      = 1 * time.Hour
)

// Auth returns a Gin middleware that validates Clerk JWTs.
func Auth(db *gorm.DB, cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract Bearer token — check Authorization header first, then query param (for WebSocket)
		authHeader := c.GetHeader("Authorization")
		tokenString := ""

		if authHeader != "" {
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
				tokenString = parts[1]
			}
		}

		// Fallback: accept token from query parameter (needed for WebSocket upgrade)
		if tokenString == "" {
			tokenString = c.Query("token")
		}

		if tokenString == "" {
			logger.Warn("Missing authorization token", zap.String("path", c.Request.URL.Path))
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Missing authorization token")
			c.Abort()
			return
		}

		// If Authorization header was present but not in Bearer format, reject
		if authHeader != "" && tokenString == "" {
			logger.Warn("Invalid Authorization header format", zap.String("path", c.Request.URL.Path))
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid authorization format")
			c.Abort()
			return
		}

		// Parse and validate JWT
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			// Validate signing method
			if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}

			// Get the key ID from header
			kid, ok := token.Header["kid"].(string)
			if !ok {
				return nil, fmt.Errorf("missing kid in token header")
			}

			// Get the public key from JWKS cache
			return getPublicKey(kid, cfg.ClerkJWKSURL)
		})

		if err != nil {
			logger.Warn("JWT validation failed",
				zap.String("path", c.Request.URL.Path),
				zap.Error(err),
			)
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid or expired token")
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok || !token.Valid {
			logger.Warn("Invalid JWT claims", zap.String("path", c.Request.URL.Path))
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid token claims")
			c.Abort()
			return
		}

		// Extract Clerk user ID
		clerkUserID, _ := claims["sub"].(string)
		if clerkUserID == "" {
			logger.Warn("Missing sub in JWT claims", zap.String("path", c.Request.URL.Path))
			response.Error(c, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid token: missing user ID")
			c.Abort()
			return
		}

		// Extract role from publicMetadata
		role := "user"
		if publicMetadata, ok := claims["public_metadata"].(map[string]interface{}); ok {
			if r, ok := publicMetadata["role"].(string); ok {
				role = r
			}
		}

		// Look up user in local DB
		var user models.User
		result := db.Where("clerk_user_id = ?", clerkUserID).First(&user)
		if result.Error != nil {
			if result.Error == gorm.ErrRecordNotFound {
				// Auto-create user (belt-and-suspenders in case webhook was missed)
				logger.Info("User not found in DB, auto-creating",
					zap.String("clerk_user_id", clerkUserID),
				)

				email, _ := claims["email"].(string)
				if email == "" {
					email = clerkUserID + "@clerk.dev"
				}

				name, _ := claims["email_address"].(string)
				if name == "" {
					name = email
				}

				user = models.User{
					ClerkUserID: clerkUserID,
					Email:       email,
					Name:        name,
					Role:        role,
				}
				if err := db.Create(&user).Error; err != nil {
					logger.Error("Failed to auto-create user",
						zap.String("clerk_user_id", clerkUserID),
						zap.Error(err),
					)
					response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to create user")
					c.Abort()
					return
				}

				prefs := models.UserPreferences{
					UserID:       user.ID,
					Theme:        "system",
					DefaultView:  "list",
					ItemsPerPage: 20,
				}
				db.Create(&prefs)

				logger.Info("Auto-created user",
					zap.String("user_id", user.ID.String()),
					zap.String("clerk_user_id", clerkUserID),
				)
			} else {
				logger.Error("Database error looking up user",
					zap.String("clerk_user_id", clerkUserID),
					zap.Error(result.Error),
				)
				response.Error(c, http.StatusInternalServerError, "INTERNAL_ERROR", "Failed to look up user")
				c.Abort()
				return
			}
		}

		// Set context values
		c.Set("user_id", user.ID.String())
		c.Set("clerk_user_id", clerkUserID)
		c.Set("role", user.Role)

		logger.Info("User authenticated",
			zap.String("user_id", user.ID.String()),
			zap.String("role", user.Role),
		)

		c.Next()
	}
}

// getPublicKey retrieves the public key for a given kid from JWKS, with caching.
func getPublicKey(kid, jwksURL string) (interface{}, error) {
	jwksCacheInstance.mu.RLock()
	if jwksCacheInstance.keys != nil && time.Since(jwksCacheInstance.fetchedAt) < jwksCacheTTL {
		for _, key := range jwksCacheInstance.keys {
			if key.Kid == kid {
				jwksCacheInstance.mu.RUnlock()
				return parseJWKToRSA(key)
			}
		}
	}
	jwksCacheInstance.mu.RUnlock()

	// Fetch fresh JWKS
	jwksCacheInstance.mu.Lock()
	defer jwksCacheInstance.mu.Unlock()

	// Double-check after acquiring write lock
	if jwksCacheInstance.keys != nil && time.Since(jwksCacheInstance.fetchedAt) < jwksCacheTTL {
		for _, key := range jwksCacheInstance.keys {
			if key.Kid == kid {
				return parseJWKToRSA(key)
			}
		}
	}

	// Fetch JWKS from Clerk
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", jwksURL, nil)
	if err != nil {
		return nil, fmt.Errorf("creating JWKS request: %w", err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetching JWKS: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading JWKS response: %w", err)
	}

	var jwks jwksResponse
	if err := json.Unmarshal(body, &jwks); err != nil {
		return nil, fmt.Errorf("parsing JWKS response: %w", err)
	}

	// Update cache
	jwksCacheInstance.keys = jwks.Keys
	jwksCacheInstance.fetchedAt = time.Now()

	logger.Debug("JWKS refreshed", zap.Int("keys", len(jwks.Keys)))

	// Find the key
	for _, key := range jwks.Keys {
		if key.Kid == kid {
			return parseJWKToRSA(key)
		}
	}

	return nil, fmt.Errorf("key with kid %s not found in JWKS", kid)
}

// parseJWKToRSA converts a JWK to an RSA public key.
func parseJWKToRSA(key jwkKey) (*rsa.PublicKey, error) {
	// Decode modulus
	nBytes, err := base64.RawURLEncoding.DecodeString(key.N)
	if err != nil {
		return nil, fmt.Errorf("decoding modulus: %w", err)
	}
	n := new(big.Int).SetBytes(nBytes)

	// Decode exponent
	eBytes, err := base64.RawURLEncoding.DecodeString(key.E)
	if err != nil {
		return nil, fmt.Errorf("decoding exponent: %w", err)
	}
	e := new(big.Int).SetBytes(eBytes)

	return &rsa.PublicKey{
		N: n,
		E: int(e.Int64()),
	}, nil
}
