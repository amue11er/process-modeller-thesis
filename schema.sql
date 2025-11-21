-- 1. Vektor-Erweiterung
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Tabelle für Gesetz + BPMN Paare
CREATE TABLE IF NOT EXISTS training_examples (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    raw_law_text TEXT NOT NULL,
    ground_truth_bpmn TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Tabelle für Vektoren (Gemini 768 Dimensions)
CREATE TABLE IF NOT EXISTS law_embeddings (
    id SERIAL PRIMARY KEY,
    example_id INTEGER REFERENCES training_examples(id) ON DELETE CASCADE,
    chunk_content TEXT NOT NULL,
    embedding vector(768),
    metadata JSONB
);
