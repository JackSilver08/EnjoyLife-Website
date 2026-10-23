package config

import (
	"os"
	"strings"
)

type Config struct {
	DatabaseURL      string
	Port             string
	OpenAIAPIKey     string
	AIModel          string
	AdminKey         string
	PaymentEnabled   bool
	PayOSClientID    string
	PayOSAPIKey      string
	PayOSChecksumKey string
	WebOrigin        string
	// PayOSBaseURL is injectable in unit/integration tests only; Load never reads a public override.
	PayOSBaseURL  string
	AdminEmail    string
	AdminPassword string
}

func Load() Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}
	openAIAPIKey := strings.TrimSpace(os.Getenv("OPENAI_API_KEY"))
	// AI_API_KEY existed in the starter's sample environment. Keep it as a
	// backwards-compatible alias, but prefer OpenAI's conventional name.
	if openAIAPIKey == "" {
		openAIAPIKey = strings.TrimSpace(os.Getenv("AI_API_KEY"))
	}
	aiModel := strings.TrimSpace(os.Getenv("AI_MODEL"))
	if aiModel == "" {
		aiModel = "gpt-6-luna"
	}
	return Config{
		DatabaseURL:      os.Getenv("DATABASE_URL"),
		Port:             port,
		OpenAIAPIKey:     openAIAPIKey,
		AIModel:          aiModel,
		AdminKey:         os.Getenv("ADMIN_API_KEY"),
		PaymentEnabled:   strings.EqualFold(strings.TrimSpace(os.Getenv("PAYMENT_ENABLED")), "true"),
		PayOSClientID:    os.Getenv("PAYOS_CLIENT_ID"),
		PayOSAPIKey:      os.Getenv("PAYOS_API_KEY"),
		PayOSChecksumKey: os.Getenv("PAYOS_CHECKSUM_KEY"),
		WebOrigin:        os.Getenv("WEB_ORIGIN"),
		AdminEmail:       os.Getenv("ADMIN_EMAIL"),
		AdminPassword:    os.Getenv("ADMIN_PASSWORD"),
	}
}
