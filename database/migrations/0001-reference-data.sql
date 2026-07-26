CREATE TABLE organizations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name varchar(255) NOT NULL,
  short_name varchar(100),
  external_code varchar(100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_organizations_external_code UNIQUE (external_code)
);
CREATE INDEX idx_organizations_name ON organizations (name);

CREATE TABLE departments (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id bigint NOT NULL,
  parent_department_id bigint,
  name varchar(255) NOT NULL,
  short_name varchar(100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_departments_organizations FOREIGN KEY (organization_id) REFERENCES organizations (id),
  CONSTRAINT fk_departments_parent FOREIGN KEY (parent_department_id) REFERENCES departments (id),
  CONSTRAINT uq_departments_organization_name UNIQUE (organization_id, name)
);
CREATE INDEX idx_departments_organization_id ON departments (organization_id);
CREATE INDEX idx_departments_parent_department_id ON departments (parent_department_id);

CREATE TABLE persons (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  external_id varchar(100),
  full_name varchar(255) NOT NULL,
  email varchar(255),
  phone varchar(50),
  organization_id bigint,
  department_id bigint,
  position_name varchar(255),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_persons_external_id UNIQUE (external_id),
  CONSTRAINT uq_persons_email UNIQUE (email),
  CONSTRAINT fk_persons_organizations FOREIGN KEY (organization_id) REFERENCES organizations (id),
  CONSTRAINT fk_persons_departments FOREIGN KEY (department_id) REFERENCES departments (id)
);
CREATE INDEX idx_persons_organization_id ON persons (organization_id);
CREATE INDEX idx_persons_department_id ON persons (department_id);
CREATE INDEX idx_persons_full_name ON persons (full_name);
CREATE INDEX idx_persons_is_active ON persons (is_active);
