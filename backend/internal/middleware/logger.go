package middleware

import (
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5/middleware"
)

func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)

		defer func() {
			log.Printf("[HTTP] %s %s | %d | %s | %s",
				r.Method,
				r.RequestURI,
				ww.Status(),
				time.Since(start),
				r.RemoteAddr,
			)
		}()

		next.ServeHTTP(ww, r)
	})
}
