CREATE TABLE IF NOT EXISTS `asset_types` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`icon` text DEFAULT 'wrench' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `idx_asset_types_name` ON `asset_types` (`name`);
CREATE TABLE IF NOT EXISTS `assets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room_id` integer,
	`asset_type_id` integer,
	`name` text NOT NULL,
	`category` text,
	`brand` text,
	`model` text,
	`installed_at` text,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`asset_type_id`) REFERENCES `asset_types`(`id`) ON UPDATE no action ON DELETE set null
);

CREATE INDEX IF NOT EXISTS `idx_assets_room` ON `assets` (`room_id`);
CREATE INDEX IF NOT EXISTS `idx_assets_type` ON `assets` (`asset_type_id`);
CREATE TABLE IF NOT EXISTS `maintenance_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` integer NOT NULL,
	`completed_at` text NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `maintenance_tasks`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS `idx_logs_task_completed` ON `maintenance_logs` (`task_id`,`completed_at`);
CREATE TABLE IF NOT EXISTS `maintenance_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_id` integer NOT NULL,
	`name` text NOT NULL,
	`interval_days` integer NOT NULL,
	`warning_days` integer DEFAULT 14 NOT NULL,
	`last_completed_at` text,
	`next_due_at` text NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS `idx_tasks_asset` ON `maintenance_tasks` (`asset_id`);
CREATE INDEX IF NOT EXISTS `idx_tasks_next_due` ON `maintenance_tasks` (`next_due_at`);
CREATE TABLE IF NOT EXISTS `maintenance_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`asset_type_id` integer NOT NULL,
	`name` text NOT NULL,
	`interval_days` integer NOT NULL,
	`warning_days` integer DEFAULT 14 NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`asset_type_id`) REFERENCES `asset_types`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS `idx_templates_type_name` ON `maintenance_templates` (`asset_type_id`,`name`);
CREATE INDEX IF NOT EXISTS `idx_templates_type` ON `maintenance_templates` (`asset_type_id`);
CREATE TABLE IF NOT EXISTS `rooms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#147d72' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `idx_rooms_name` ON `rooms` (`name`);