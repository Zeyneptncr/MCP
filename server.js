import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import axios from "axios";
import { z } from "zod";
import { google } from "googleapis";
import { Pool } from "pg";

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '1234',
  database: 'postgres',
});


const app = express();
const port = 3000;
app.use(express.json());


const server = new McpServer({
  name: "Task Management",
  version: "1.0.0",
  capabilities: {
    tools: {},
    resources: {},
  },
});

server.tool(
  "create-task-db",
  "Veritabanına yeni görev ekler",
  {
    title: z.string().describe("Görev başlığı"),
    date: z.string().describe("Tarih (YYYY-MM-DD)")
  },
  async ({ title, date }) => {
    try {
      await pool.query('INSERT INTO tasks (title, date) VALUES ($1, $2)', [title, date]);
      return { content: [{ type: "text", text: "✅ Veritabanına görev eklendi." }] };
    } catch (err) {
      return { content: [{ type: "text", text: "❌ Hata: " + err.message }] };
    }
  }
);

server.tool(
  "list-tasks",
  "Tüm görevleri listeler",
  {},
  async () => {
    try {
      const result = await pool.query('SELECT * FROM tasks ORDER BY id DESC');
      const rows = result.rows.map(row => `📝 ${row.id}: ${row.title} (${row.date})`).join('\n');
      return { content: [{ type: "text", text: rows || "Hiç görev yok." }] };
    } catch (err) {
      return { content: [{ type: "text", text: "❌ Listeleme hatası: " + err.message }] };
    }
  }
);

server.tool(
  "update-task",
  "ID'ye göre görevi günceller",
  {
    id: z.number().describe("Görev ID"),
    title: z.string().describe("Yeni başlık"),
    date: z.string().describe("Yeni tarih (YYYY-MM-DD)")
  },
  async ({ id, title, date }) => {
    try {
      await pool.query('UPDATE tasks SET title=$1, date=$2 WHERE id=$3', [title, date, id]);
      return { content: [{ type: "text", text: "🔄 Görev güncellendi." }] };
    } catch (err) {
      return { content: [{ type: "text", text: "❌ Güncelleme hatası: " + err.message }] };
    }
  }
);

server.tool(
  "delete-task",
  "ID'ye göre görevi siler",
  {
    id: z.number().describe("Silinecek görev ID")
  },
  async ({ id }) => {
    try {
      await pool.query('DELETE FROM tasks WHERE id=$1', [id]);
      return { content: [{ type: "text", text: "🗑 Görev silindi." }] };
    } catch (err) {
      return { content: [{ type: "text", text: "❌ Silme hatası: " + err.message }] };
    }
  }
);



// GOOGLE SHEETS TOOL
/*server.tool(
  "create-task",
  "Add tasks to Google Sheets",
  {
    title: z.string().describe("task title"),
    date: z.string().describe("Date (YYYY-MM-DD)"),
  },
  async ({ title, date }) => {
    console.log("GELEN PAYLOAD:", title);
    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: "./gservice-key.json",
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
      });

      const client = await auth.getClient();
      const sheets = google.sheets({ version: "v4", auth: client });

      const spreadsheetId = "1Jf_NA7H2XXmCIibmQBXBGK3Q_rPxeyhCPTIj9LJ0JTs";
      const range = "Sayfa1!A1:B1";

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range,
        valueInputOption: "RAW",
        requestBody: {
          values: [[title, date]],
        },
      });

      return {
        content: [
          {
            type: "text",
            text: "✅ Görev başarıyla Google Sheets'e eklendi!",
          },
        ],
      };
    } catch (err) {
      console.error(err);
      return {
        content: [
          {
            type: "text",
            text: "❌ Ekleme başarısız: " + err.message,
          },
        ],
      };
    }
  }
); */

// GREET TOOL — SELAM CEVABI
server.tool(
  "greet",
  "Returns a greeting message",
  z.object({
    text: z.string().describe("Greeting text from user"),
  }),
  async ({ text }) => {
    return {
      content: [
        {
          type: "text",
          text: `👋 Merhaba! Bana şunu yazdın: "${text}"`,
        },
      ],
    };
  }
);


const transports = {};

app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  transports[transport.sessionId] = transport;

  res.on("close", () => {
    delete transports[transport.sessionId];
  });

  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  console.log("POST /messages alındı:", req.query.sessionId, JSON.stringify(req.body, null, 2));
  const sessionId = req.query.sessionId;
  const transport = transports[sessionId];

  if (transport instanceof SSEServerTransport) {
    await transport.handlePostMessage(req, res, req.body);
  } else {
    res.status(400).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "session",
      },
      id: null,
    });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(` MCP Server is running on : http://0.0.0.0:${port}/sse`);
});