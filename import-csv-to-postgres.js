import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "csv-parse/sync";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Client } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL no definida en el archivo .env");
  process.exit(1);
}

const prismaDir = path.join(__dirname, "prisma");
const assetsCsv = path.join(prismaDir, "assets.csv");
const transactionsCsv = path.join(prismaDir, "transactions.csv");

async function importCSVtoPostgres(table, csvPath) {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  const csvData = fs.readFileSync(csvPath, "utf8");
  const records = parse(csvData, { columns: true, skip_empty_lines: true });

  for (const row of records) {
    // Construir la lista de columnas y valores
    const columns = Object.keys(row);
    const values = columns.map((col) => row[col] === '' ? null : row[col]);
    const placeholders = columns.map((_, i) => `$${i + 1}`);
    const query = `INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(",")}) VALUES (${placeholders.join(",")}) ON CONFLICT (id) DO NOTHING;`;
    try {
      await client.query(query, values);
    } catch (err) {
      console.error(`Error insertando en ${table}:`, err, row);
    }
  }
  await client.end();
}

(async () => {
  if (fs.existsSync(assetsCsv)) {
    console.log("Importando assets...");
    await importCSVtoPostgres("Asset", assetsCsv);
    console.log("Assets importados.");
  } else {
    console.log("No se encontró assets.csv");
  }
  if (fs.existsSync(transactionsCsv)) {
    console.log("Importando transactions...");
    await importCSVtoPostgres("Transaction", transactionsCsv);
    console.log("Transactions importadas.");
  } else {
    console.log("No se encontró transactions.csv");
  }
})(); 