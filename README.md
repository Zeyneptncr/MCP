# 👥 MCP + n8n Kişi Kayıt Sistemi

Bu proje, n8n üzerinde çalışan bir **AI Agent** ile geliştirilen, kullanıcı mesajlarından kişi kayıtlarını yöneten bir sistemdir. Kayıt işlemleri, Express + PostgreSQL ile yazılmış bir MCP sunucusuna bağlıdır. Komutlar doğal Türkçe dilde verilir.

---

## 🚀 Özellikler

- 🔗 **n8n AI Agent** → Gemini 2.5 Flash + Simple Memory + PostgreSQL Memory + MCP Tool
- 🧠 **System Message** sayesinde Türkçe komutlarla kişi işlemleri yapılır:
  - `Ekle Ahmet Yılmaz` → kişi ekler
  - `Güncelle 2 Mehmet Can` → günceller
  - `Sil 3` → siler
  - `Listele` → tüm kişileri listeler
- 🧩 **Toollar:**
  - `create-task-db`: yeni kişi ekler
  - `list-tasks`: tüm kişileri listeler
  - `update-task`: kişiyi günceller
  - `delete-task`: kişiyi siler

---

## 🏗 Yapı

### n8n tarafı:
- `When chat message received` → AI Agent → Gemini
- `AI Agent` → MCP Tool + PostgreSQL Memory + Simple Memory
- MCP tool URL: `http://host.docker.internal:3000/sse`

### MCP server (`server.js`):
- Express + `@modelcontextprotocol/sdk` ile SSE tabanlı komut alır
- Gelen komutları veritabanına işler (`tasks` tablosu)
- Gerekirse Google Sheets entegrasyonu eklenebilir

---

## 🛠 Kurulum

1. PostgreSQL sunucusu çalışır durumda olmalı
2. `tasks` tablosu şu şekilde olmalı:

```sql
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title TEXT,
  date DATE
);
