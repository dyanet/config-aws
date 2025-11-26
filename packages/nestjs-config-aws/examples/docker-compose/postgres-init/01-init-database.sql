-- Initialize database for nest-config-aws examples

-- Create additional databases for different environments
CREATE DATABASE myapp_test;
CREATE DATABASE myapp_prod;

-- Connect to the development database
\c myapp_dev;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    data JSONB,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create configuration table for testing
CREATE TABLE IF NOT EXISTS app_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    environment VARCHAR(50) DEFAULT 'development',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_uuid ON users(uuid);
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_app_config_key ON app_config(key);
CREATE INDEX IF NOT EXISTS idx_app_config_environment ON app_config(environment);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Insert sample data
INSERT INTO users (email, name, password_hash) VALUES
    ('admin@example.com', 'Admin User', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uIoS'), -- password: admin123
    ('user@example.com', 'Regular User', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uIoS'), -- password: user123
    ('test@example.com', 'Test User', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5uIoS')  -- password: test123
ON CONFLICT (email) DO NOTHING;

-- Insert sample configuration
INSERT INTO app_config (key, value, environment) VALUES
    ('feature_flags.new_ui', 'true', 'development'),
    ('feature_flags.beta_features', 'false', 'development'),
    ('api.rate_limit', '1000', 'development'),
    ('api.timeout', '30000', 'development'),
    ('cache.ttl', '3600', 'development'),
    ('feature_flags.new_ui', 'false', 'production'),
    ('feature_flags.beta_features', 'false', 'production'),
    ('api.rate_limit', '100', 'production'),
    ('api.timeout', '10000', 'production'),
    ('cache.ttl', '7200', 'production')
ON CONFLICT (key) DO NOTHING;

-- Insert sample audit logs
INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address) VALUES
    (1, 'LOGIN', 'user', '1', '{"method": "email"}', '127.0.0.1'),
    (1, 'CREATE', 'config', 'feature_flags.new_ui', '{"old_value": null, "new_value": "true"}', '127.0.0.1'),
    (2, 'LOGIN', 'user', '2', '{"method": "email"}', '127.0.0.1'),
    (2, 'VIEW', 'dashboard', 'main', '{"page": "dashboard"}', '127.0.0.1')
ON CONFLICT DO NOTHING;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_config_updated_at BEFORE UPDATE ON app_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Connect to test database and create similar structure
\c myapp_test;

-- Create the same tables for test database (simplified)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_data (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert minimal test data
INSERT INTO users (email, name) VALUES
    ('test1@example.com', 'Test User 1'),
    ('test2@example.com', 'Test User 2')
ON CONFLICT (email) DO NOTHING;

INSERT INTO test_data (name, value) VALUES
    ('test_config_1', 'test_value_1'),
    ('test_config_2', 'test_value_2')
ON CONFLICT DO NOTHING;

-- Grant permissions (for development/testing purposes)
-- In production, you would use more restrictive permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Switch back to development database
\c myapp_dev;

-- Display setup completion message
SELECT 'Database initialization completed successfully!' as message;