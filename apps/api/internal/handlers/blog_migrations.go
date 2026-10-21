package handlers

import (
 "context"
 _ "embed"
 "strings"

 "github.com/jackc/pgx/v5/pgxpool"
)

//go:embed migrations/006_blog.sql
var blogSchemaV1 string

// EnsureBlogSchema works for fresh AND existing Docker PostgreSQL volumes.
// DDL and the advisory lock use a single transaction; repeated boots are safe.
func EnsureBlogSchema(ctx context.Context, db *pgxpool.Pool) error {
 tx, err := db.Begin(ctx)
 if err != nil { return err }
 defer tx.Rollback(ctx)
 if _, err = tx.Exec(ctx, "SELECT pg_advisory_xact_lock(hashtext('enjoy_life_blog_schema_v1'))"); err != nil { return err }
 for _, statement := range strings.Split(blogSchemaV1, "-- +statement") {
  statement = strings.TrimSpace(statement)
  if statement == "" || strings.HasPrefix(statement, "-- Enjoy Life") && !strings.Contains(statement, "CREATE ") {
   continue
  }
  if _, err = tx.Exec(ctx, statement); err != nil { return err }
 }
 return tx.Commit(ctx)
}
