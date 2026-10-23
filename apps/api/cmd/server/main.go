package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/enjoy-life/store-api/internal/config"
	"github.com/enjoy-life/store-api/internal/handlers"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	cfg := config.Load()
	if cfg.DatabaseURL == "" {
		slog.Error("DATABASE_URL is required")
		os.Exit(1)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	db, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("database pool", "error", err)
		os.Exit(1)
	}
	defer db.Close()
	if err = db.Ping(ctx); err != nil {
		slog.Error("database unavailable", "error", err)
		os.Exit(1)
	}
	if err = handlers.EnsurePaymentSchema(ctx, db); err != nil { slog.Error("payment migration", "error", err); os.Exit(1) }
	if err = handlers.EnsureAccountSchema(ctx, db); err != nil { slog.Error("accounts migration", "error", err); os.Exit(1) }
	if err = handlers.EnsureAdminAudit(ctx, db); err != nil { slog.Error("admin audit migration", "error", err); os.Exit(1) }
	if err = handlers.EnsureBlogSchema(ctx, db); err != nil { slog.Error("blog migration", "error", err); os.Exit(1) }
	if err = handlers.EnsureMediaSchema(ctx, db); err != nil { slog.Error("media migration", "error", err); os.Exit(1) }
	if err = handlers.EnsureProductCatalogSchema(ctx, db); err != nil { slog.Error("catalog migration", "error", err); os.Exit(1) }
	if err = handlers.EnsureWarehouseSchema(ctx, db); err != nil { slog.Error("warehouse migration", "error", err); os.Exit(1) }
	if err = handlers.EnsureAdmin(ctx, db, cfg.AdminEmail, cfg.AdminPassword); err != nil {
		slog.Error("admin bootstrap", "error", err)
		os.Exit(1)
	}
	app := &handlers.App{DB: db, Config: cfg}
	reconcileCtx,reconcileCancel:=context.WithCancel(context.Background())
	defer reconcileCancel()
	go app.StartPayOSReconciler(reconcileCtx)
	srv := &http.Server{Addr: ":" + cfg.Port, Handler: handlers.Router(app), ReadHeaderTimeout: 5 * time.Second, ReadTimeout: 15 * time.Second, WriteTimeout: 20 * time.Second, IdleTimeout: 60 * time.Second}
	go func() {
		slog.Info("Enjoy Life API listening", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server failed", "error", err)
			os.Exit(1)
		}
	}()
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGTERM, syscall.SIGINT)
	<-stop
	shutCtx, shutCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutCancel()
	_ = srv.Shutdown(shutCtx)
}
