CREATE EXTENSION IF NOT EXISTS vector;

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
