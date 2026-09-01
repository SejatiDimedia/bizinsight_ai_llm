# BizInsight AI — Agent Rules

## Architecture Rules

Proyek ini mengikuti arsitektur Multi-Agent yang terinspirasi dari proyek AutoBargain AI.
Sebelum menulis atau mengubah kode apapun, **WAJIB baca** file `ARCHITECTURE_REFERENCE.md` di root project
untuk memahami semua pattern yang harus diikuti.

## Pola yang WAJIB Diikuti

1. **BaseAgent Pattern**: Setiap agent harus extend `Agent` dari `agents/agent.py` dengan warna ANSI unik.
2. **Multi-Model Failover**: Setiap LLM call harus menggunakan `litellm.completion()` dengan chain failover minimal 3 model (Gemini → Groq → fallback).
3. **ReAct Tool Calling**: `ConversationalAgent` menggunakan loop ReAct maksimal 4 iterasi tool-calling.
4. **Pydantic Structured Output**: Semua data contract menggunakan `pydantic.BaseModel` dengan `Field(description=...)`.
5. **Lazy Initialization**: Framework orchestrator menggunakan lazy init — agents hanya dibuat saat pertama kali dibutuhkan.
6. **Gradio Dashboard**: UI menggunakan `gr.Blocks` dengan streaming log via `QueueHandler` + `queue.Queue`.
7. **Database Safety**: Hanya `SELECT` query yang boleh dieksekusi. Gunakan `psycopg2` dengan `readonly=True` dan `statement_timeout`.

## Tech Stack

- **LLM**: LiteLLM → Gemini 3.6 Flash / Groq GPT-OSS-120B (Free Tier)
- **Database**: PostgreSQL dengan `psycopg2`
- **UI**: Gradio + Plotly
- **Models**: Pydantic v2
- **Env**: python-dotenv

## Bahasa

- Kode ditulis dalam **bahasa Inggris** (variabel, fungsi, class names).
- Komentar dan docstring boleh dalam **Bahasa Indonesia**.
- Output ke pengguna dalam **Bahasa Indonesia** yang profesional.
