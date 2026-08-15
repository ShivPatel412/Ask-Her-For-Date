-- Ask Her For Date - MySQL Production Database Schema

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  username VARCHAR(60) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  whatsapp_number VARCHAR(30),
  role ENUM('user', 'superadmin') NOT NULL DEFAULT 'user',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS web_sessions (
  sid VARCHAR(255) PRIMARY KEY,
  data_json LONGTEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  INDEX idx_web_sessions_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invitations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  owner_user_id INT NOT NULL,
  template_key VARCHAR(60) NOT NULL DEFAULT 'best-friend-date',
  public_token VARCHAR(60) NOT NULL UNIQUE,
  inviter_name VARCHAR(100) NOT NULL,
  recipient_name VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  status ENUM('draft', 'published', 'disabled') NOT NULL DEFAULT 'draft',
  theme_config_json LONGTEXT NOT NULL,
  content_config_json LONGTEXT NOT NULL,
  feature_config_json LONGTEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  published_at DATETIME NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_invitations_owner (owner_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS visitor_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invitation_id INT NOT NULL,
  visitor_id VARCHAR(100) NOT NULL,
  selected_nickname VARCHAR(100),
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_activity_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  completed TINYINT(1) NOT NULL DEFAULT 0,
  final_result VARCHAR(100),
  selected_mood VARCHAR(100),
  selected_availability VARCHAR(100),
  selected_date VARCHAR(100),
  main_question_visits INT NOT NULL DEFAULT 0,
  UNIQUE KEY uniq_invitation_visitor (invitation_id, visitor_id),
  FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE,
  INDEX idx_sessions_invitation (invitation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invitation_id INT NOT NULL,
  session_id INT NOT NULL,
  event_name VARCHAR(100) NOT NULL,
  screen VARCHAR(60),
  previous_screen VARCHAR(60),
  option_value VARCHAR(255),
  sequence_number INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES visitor_sessions(id) ON DELETE CASCADE,
  INDEX idx_events_session_sequence (session_id, sequence_number),
  INDEX idx_events_invitation_created (invitation_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  email VARCHAR(254) NOT NULL,
  action VARCHAR(100) NOT NULL,
  ip_address VARCHAR(60),
  user_agent TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_logs_user (user_id),
  INDEX idx_user_logs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invitation_id INT NOT NULL,
  user_id INT NULL,
  recipient_email VARCHAR(254) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body_html LONGTEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'SENT',
  error_message TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_email_notifications_invitation (invitation_id),
  INDEX idx_email_notifications_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
