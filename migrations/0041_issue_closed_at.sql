-- When an issue was last closed; cleared when it is reopened. The statistics read issue turnaround from it.
ALTER TABLE issues ADD COLUMN closed_at TEXT;
-- Earlier closures: the reporter's resolved or closed notification is the only record of when. Issues without one stay unknown.
UPDATE issues SET closed_at=(SELECT MAX(n.created_at) FROM notifications n WHERE n.issue_id=issues.id AND n.kind IN ('issue_resolved','issue_closed')) WHERE status='closed';
CREATE INDEX issues_closed_at ON issues(closed_at) WHERE closed_at IS NOT NULL;
