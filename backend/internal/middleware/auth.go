package middleware

import (
	"context"
	"net/http"
	"os"
	"strings"

	"e-notulen/backend/internal/model"
	"e-notulen/backend/pkg/keycloak"
	"e-notulen/backend/pkg/response"
)

type contextKey string

const UserContextKey contextKey = "user_context"

type AuthMiddleware struct {
	validator *keycloak.KeycloakValidator
}

func NewAuthMiddleware(validator *keycloak.KeycloakValidator) *AuthMiddleware {
	return &AuthMiddleware{validator: validator}
}

func (m *AuthMiddleware) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var tokenString string
		authHeader := r.Header.Get("Authorization")
		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
				tokenString = parts[1]
			}
		}

		if tokenString == "" {
			if cookie, err := r.Cookie("access_token"); err == nil && cookie.Value != "" {
				tokenString = cookie.Value
			}
		}

		defaultAdminCtx := model.UserContext{
			Sub:     "00000000-0000-0000-0000-000000000001",
			Name:    "Super Admin (Diskominfo)",
			Email:   "admin@purbalinggakab.go.id",
			Role:    "admin",
			OPDCode: "T8",
			OPDName: "Dinas Komunikasi dan Informatika",
		}

		appEnv := strings.ToLower(os.Getenv("APP_ENV"))
		isDev := appEnv == "development" || appEnv == "dev"

		if tokenString == "" {
			if isDev {
				ctx := context.WithValue(r.Context(), UserContextKey, defaultAdminCtx)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}
			response.Error(w, http.StatusUnauthorized, "Sesi otentikasi tidak ditemukan, silakan login kembali", "UNAUTHORIZED", nil)
			return
		}

		if isDev && (strings.HasPrefix(tokenString, "mock-") || tokenString == "dev-token") {
			ctx := context.WithValue(r.Context(), UserContextKey, defaultAdminCtx)
			next.ServeHTTP(w, r.WithContext(ctx))
			return
		}

		claims, err := m.validator.ValidateToken(tokenString)
		if err != nil {
			if isDev {
				// In local development, if external Keycloak token validation fails, fallback to default admin
				ctx := context.WithValue(r.Context(), UserContextKey, defaultAdminCtx)
				next.ServeHTTP(w, r.WithContext(ctx))
				return
			}
			response.Error(w, http.StatusUnauthorized, "Token otentikasi tidak valid atau sudah kedaluwarsa", "UNAUTHORIZED", []string{err.Error()})
			return
		}

		userCtx := model.ResolveUserContext(claims)
		ctx := context.WithValue(r.Context(), UserContextKey, userCtx)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func RequireRoles(roles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userCtx, ok := GetUserContext(r.Context())
			if !ok {
				response.Error(w, http.StatusUnauthorized, "User context not found", "UNAUTHORIZED", nil)
				return
			}

			allowed := false
			for _, role := range roles {
				if userCtx.Role == role {
					allowed = true
					break
				}
			}

			if !allowed {
				response.Error(w, http.StatusForbidden, "Forbidden: insufficient permissions", "FORBIDDEN", nil)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func GetUserContext(ctx context.Context) (model.UserContext, bool) {
	userCtx, ok := ctx.Value(UserContextKey).(model.UserContext)
	return userCtx, ok
}
