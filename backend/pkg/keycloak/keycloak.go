package keycloak

import (
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"sync"
	"time"

	"e-notulen/backend/internal/model"

	"github.com/golang-jwt/jwt/v5"
)

type JSONWebKeys struct {
	Keys []JSONWebKey `json:"keys"`
}

type JSONWebKey struct {
	Kty string   `json:"kty"`
	Kid string   `json:"kid"`
	Use string   `json:"use"`
	N   string   `json:"n"`
	E   string   `json:"e"`
	Alg string   `json:"alg"`
	X5c []string `json:"x5c"`
}

type KeycloakValidator struct {
	jwksURL     string
	issuer      string
	clientID    string
	keysCache   map[string]*rsa.PublicKey
	cacheExpiry time.Time
	mu          sync.RWMutex
}

func NewKeycloakValidator(jwksURL, issuer, clientID string) *KeycloakValidator {
	return &KeycloakValidator{
		jwksURL:   jwksURL,
		issuer:    issuer,
		clientID:  clientID,
		keysCache: make(map[string]*rsa.PublicKey),
	}
}

func (kv *KeycloakValidator) ValidateToken(tokenString string) (*model.TokenClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &model.TokenClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		kid, ok := token.Header["kid"].(string)
		if !ok {
			return nil, errors.New("token header missing kid")
		}

		pubKey, err := kv.getKey(kid)
		if err != nil {
			return nil, fmt.Errorf("failed to get public key for kid %s: %w", kid, err)
		}

		return pubKey, nil
	})

	if err != nil {
		return nil, fmt.Errorf("invalid token: %w", err)
	}

	if claims, ok := token.Claims.(*model.TokenClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token claims")
}

func (kv *KeycloakValidator) getKey(kid string) (*rsa.PublicKey, error) {
	kv.mu.RLock()
	if time.Now().Before(kv.cacheExpiry) {
		if key, ok := kv.keysCache[kid]; ok {
			kv.mu.RUnlock()
			return key, nil
		}
	}
	kv.mu.RUnlock()

	kv.mu.Lock()
	defer kv.mu.Unlock()

	// Double-check after acquiring write lock
	if time.Now().Before(kv.cacheExpiry) {
		if key, ok := kv.keysCache[kid]; ok {
			return key, nil
		}
	}

	// Try to refresh JWKS. If refresh fails, fall back to stale cache
	// to avoid locking out all users during transient Keycloak downtime.
	if err := kv.refreshJWKS(); err != nil {
		// Stale-cache fallback: if we have any cached keys, use them.
		if key, ok := kv.keysCache[kid]; ok {
			return key, nil
		}
		// No cache at all → cannot verify token safely
		return nil, fmt.Errorf("JWKS refresh failed and no cached key for kid %s: %w", kid, err)
	}

	if key, ok := kv.keysCache[kid]; ok {
		return key, nil
	}

	return nil, fmt.Errorf("key id %s not found in JWKS", kid)
}

func (kv *KeycloakValidator) refreshJWKS() error {
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(kv.jwksURL)
	if err != nil {
		return fmt.Errorf("failed to fetch JWKS: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("jwks endpoint returned status: %d", resp.StatusCode)
	}

	var jwks JSONWebKeys
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return fmt.Errorf("failed to decode JWKS: %w", err)
	}

	newCache := make(map[string]*rsa.PublicKey)
	for _, key := range jwks.Keys {
		if key.Use == "sig" || key.Use == "" {
			pubKey, err := parseRSAPublicKey(key.N, key.E)
			if err == nil {
				newCache[key.Kid] = pubKey
			}
		}
	}

	kv.keysCache = newCache
	kv.cacheExpiry = time.Now().Add(1 * time.Hour)
	return nil
}

func parseRSAPublicKey(nStr, eStr string) (*rsa.PublicKey, error) {
	nBytes, err := base64.RawURLEncoding.DecodeString(nStr)
	if err != nil {
		return nil, err
	}
	eBytes, err := base64.RawURLEncoding.DecodeString(eStr)
	if err != nil {
		return nil, err
	}

	n := new(big.Int).SetBytes(nBytes)
	var e int
	for _, b := range eBytes {
		e = (e << 8) | int(b)
	}

	return &rsa.PublicKey{
		N: n,
		E: e,
	}, nil
}
