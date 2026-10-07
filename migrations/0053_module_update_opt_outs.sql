-- A later download must not undo a member's explicit release opt-out.
CREATE TABLE module_update_opt_outs (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 module_id TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,module_id)
);
