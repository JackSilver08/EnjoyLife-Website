package config

import "os"

type Config struct {
	DatabaseURL    string
	Port           string
	AdminKey       string
	PaymentEnabled bool
}

func Load() Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}
	return Config{
		DatabaseURL: os.Getenv("DATABASE_URL"),
		Port:        port,
		AdminKey:    os.Getenv("ADMIN_API_KEY"),
		// This switch intentionally does not activate a gateway yet.
		PaymentEnabled: false,
	}
}
