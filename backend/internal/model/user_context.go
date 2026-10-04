package model

import "github.com/golang-jwt/jwt/v5"

type ResourceRoles struct {
	Roles []string `json:"roles"`
}

type OfficerUnit struct {
	ID   string `json:"id"`
	Nama string `json:"nama"`
}

type OfficerJab struct {
	ID   string `json:"id"`
	Nama string `json:"nama"`
}

type OfficerClaims struct {
	NIP   string      `json:"nip"`
	Nama  string      `json:"nama"`
	GDP   string      `json:"gdp"`
	GDB   string      `json:"gdb"`
	Unit  OfficerUnit `json:"unit"`
	Jab   OfficerJab  `json:"jab"`
	Photo string      `json:"photo"`
}

type TokenClaims struct {
	Sub               string                   `json:"sub"`
	Name              string                   `json:"name"`
	Email             string                   `json:"email"`
	PreferredUsername string                   `json:"preferred_username"`
	GivenName         string                   `json:"given_name"`
	FamilyName        string                   `json:"family_name"`
	KodeUnit          string                   `json:"kode_unit,omitempty"`
	Officer           *OfficerClaims           `json:"officer,omitempty"`
	ResourceAccess    map[string]ResourceRoles `json:"resource_access"`
	jwt.RegisteredClaims
}

type UserContext struct {
	Sub      string `json:"sub"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	Role     string `json:"role"`     // "admin", "operator", "officer"
	OPDCode  string `json:"opd_code"` // "" for admin
	OPDName  string `json:"opd_name"`
	NIP      string `json:"nip,omitempty"`
	Position string `json:"position,omitempty"`
}

func ResolveUserContext(claims *TokenClaims) UserContext {
	role := "officer" // default
	if access, ok := claims.ResourceAccess["e-notulen"]; ok && len(access.Roles) > 0 {
		role = access.Roles[0]
	}

	switch role {
	case "admin":
		return UserContext{
			Sub:     claims.Sub,
			Name:    claims.Name,
			Email:   claims.Email,
			Role:    "admin",
			OPDCode: "", // Admin can access all OPDs
			OPDName: "Semua OPD",
		}
	case "operator":
		return UserContext{
			Sub:     claims.Sub,
			Name:    claims.Name,
			Email:   claims.Email,
			Role:    "operator",
			OPDCode: claims.KodeUnit,
			OPDName: claims.Name,
		}
	case "officer":
		uc := UserContext{
			Sub:   claims.Sub,
			Name:  claims.Name,
			Email: claims.Email,
			Role:  "officer",
		}
		if claims.Officer != nil {
			if claims.Officer.Nama != "" {
				uc.Name = claims.Officer.Nama
			}
			uc.OPDCode = claims.Officer.Unit.ID
			uc.OPDName = claims.Officer.Unit.Nama
			uc.NIP = claims.Officer.NIP
			uc.Position = claims.Officer.Jab.Nama
		}
		return uc
	default:
		return UserContext{
			Sub:   claims.Sub,
			Name:  claims.Name,
			Email: claims.Email,
			Role:  role,
		}
	}
}
