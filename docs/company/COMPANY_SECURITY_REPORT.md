# Company Security Report

| Control | Status |
|---------|--------|
| Auth required | PASS |
| Company membership scope | PASS |
| Permission keys | PASS |
| Session lock on `/company` | PASS |
| mustChangePin on `/company` | PASS |
| CSRF (shared API bootstrap) | inherits personal app |
| Prepared statements | PASS (PDO) |
| Sensitive action PIN | PARTIAL |
| Attachment MIME validation | N/A (documents deferred) |
