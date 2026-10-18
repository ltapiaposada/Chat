/**
 * @file Crea las tablas `departments`, `department_channels` y
 * `agent_departments` para el sistema de departamentos. La tabla
 * `departments` incluye estrategias de enrutamiento (`broadcast`,
 * `least_busy`, `direct`) y de respaldo, así como un agente por defecto.
 * Las tablas de unión vinculan departamentos con canales y agentes.
 * También se agregan las columnas `department_id` e `intention` a la
 * tabla `chats`, junto con los índices necesarios para consultas por
 * empresa, departamento y estado.
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE departments (
      id SERIAL PRIMARY KEY,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(100) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
      routing_strategy VARCHAR(30) NOT NULL DEFAULT 'broadcast'
        CHECK (routing_strategy IN ('broadcast', 'least_busy', 'direct')),
      fallback_strategy VARCHAR(30) NOT NULL DEFAULT 'channel_queue'
        CHECK (fallback_strategy IN ('channel_queue', 'department_queue')),
      default_agent_id INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (company_id, slug),
      UNIQUE (id, company_id),
      CONSTRAINT departments_default_agent_company_fkey
        FOREIGN KEY (default_agent_id, company_id) REFERENCES users(id, company_id) ON DELETE RESTRICT
    );

    CREATE TABLE department_channels (
      department_id INTEGER NOT NULL,
      channel_id INTEGER NOT NULL,
      company_id INTEGER NOT NULL,
      PRIMARY KEY (department_id, channel_id),
      FOREIGN KEY (department_id, company_id) REFERENCES departments(id, company_id) ON DELETE CASCADE,
      FOREIGN KEY (channel_id, company_id) REFERENCES channels(id, company_id) ON DELETE CASCADE
    );

    CREATE TABLE agent_departments (
      agent_id INTEGER NOT NULL,
      department_id INTEGER NOT NULL,
      company_id INTEGER NOT NULL,
      PRIMARY KEY (agent_id, department_id),
      FOREIGN KEY (agent_id, company_id) REFERENCES users(id, company_id) ON DELETE CASCADE,
      FOREIGN KEY (department_id, company_id) REFERENCES departments(id, company_id) ON DELETE CASCADE
    );

    ALTER TABLE chats ADD COLUMN department_id INTEGER;
    ALTER TABLE chats ADD COLUMN intention VARCHAR(200);
    ALTER TABLE chats ADD CONSTRAINT chats_department_company_fkey
      FOREIGN KEY (department_id, company_id) REFERENCES departments(id, company_id) ON DELETE RESTRICT;

    CREATE INDEX idx_departments_company_status ON departments(company_id, status);
    CREATE INDEX idx_department_channels_channel ON department_channels(company_id, channel_id);
    CREATE INDEX idx_agent_departments_agent ON agent_departments(company_id, agent_id);
    CREATE INDEX idx_chats_department_status ON chats(company_id, department_id, status);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE chats DROP CONSTRAINT IF EXISTS chats_department_company_fkey;
    ALTER TABLE chats DROP COLUMN IF EXISTS intention;
    ALTER TABLE chats DROP COLUMN IF EXISTS department_id;
    DROP TABLE IF EXISTS agent_departments;
    DROP TABLE IF EXISTS department_channels;
    DROP TABLE IF EXISTS departments;
  `);
};
