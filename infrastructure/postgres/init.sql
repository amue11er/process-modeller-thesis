CREATE EXTENSION IF NOT EXISTS pgvector;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR UNIQUE NOT NULL,
  name VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users NOT NULL,
  name VARCHAR,
  status VARCHAR DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID REFERENCES processes NOT NULL,
  filename VARCHAR NOT NULL,
  raw_text TEXT,
  word_count INT,
  page_count INT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID REFERENCES processes NOT NULL,
  activity_number INT,
  activity_type VARCHAR,
  name VARCHAR NOT NULL,
  description TEXT,
  legal_basis TEXT[],
  dependencies UUID[],
  quality_score FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID REFERENCES processes NOT NULL,
  document_id UUID REFERENCES documents,
  chunk_text TEXT,
  embedding vector(768),
  chunk_index INT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bpmn_diagrams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id UUID REFERENCES processes NOT NULL UNIQUE,
  xml_content TEXT,
  validation_status VARCHAR,
  validation_errors JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE law_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_name VARCHAR NOT NULL,           -- z.B. "VwVfG", "LVwG", "GG"
  paragraph VARCHAR NOT NULL,          -- z.B. "§ 9", "§ 22 Abs. 1"
  title VARCHAR,                       -- z.B. "Verfahrensgrundsätze"
  chunk_text TEXT NOT NULL,            -- Der eigentliche Gesetzestext
  embedding vector(768),               -- Embedding für Similarity Search
  source_url VARCHAR,                  -- Optional: Link zum Gesetz
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index für schnelle Similarity Search
CREATE INDEX law_chunks_embedding_idx ON law_chunks 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Index für Filterung nach Gesetz
CREATE INDEX law_chunks_law_name_idx ON law_chunks(law_name);