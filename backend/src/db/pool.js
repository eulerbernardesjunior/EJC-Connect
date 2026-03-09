import pg from "pg";
import { env } from "../config/env.js";

const { Pool } = pg;

export const pool = new Pool(env.database);

pool.on("error", (error) => {
  console.error("Unexpected Postgres error", error);
});
