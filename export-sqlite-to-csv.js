import pkg from "sqlite3";
const { Database } = pkg;
import { Parser } from "json2csv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "prisma", "dev.db");
const outputDir = path.join(__dirname, "prisma");

const tables = ["Asset", "Transaction"];

console.log("Iniciando exportación de datos...");
console.log("Ruta esperada de la base de datos:", dbPath);
console.log("Ruta esperada de salida:", outputDir);

async function exportTableToCSV(table) {
  const db = new Database(dbPath);
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM "${table}"`, (err, rows) => {
      console.log(`Consultando tabla: ${table}`);
      if (err) {
        db.close();
        return reject(err);
      }
      if (rows.length === 0) {
        console.log(`La tabla ${table} está vacía.`);
        db.close();
        return resolve();
      }
      const parser = new Parser();
      const csv = parser.parse(rows);
      console.log("CSV generado (primeros 100 caracteres):", csv.substring(0, 100));
      console.log("outputDir (ruta de escritura):", outputDir);
      try {
        fs.writeFileSync(path.join(outputDir, `${table.toLowerCase()}s.csv`), csv);
      } catch (err) {
        console.error("Error escribiendo CSV:", err);
      }
      db.close();
      resolve();
    });
  });
}

(async () => {
  for (const table of tables) {
    try {
      await exportTableToCSV(table);
      console.log(`Exported ${table} to CSV.`);
    } catch (err) {
      console.error(`Error exporting ${table}:`, err);
    }
  }
})();