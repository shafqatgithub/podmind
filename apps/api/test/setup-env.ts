/** Jest setupFile — runs before any module import so ConfigModule
 *  validation sees a complete environment. */
process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??=
  "postgres://postgres:localtest@localhost:5432/docs_schema_test";
process.env.DB_SSL ??= "false";
