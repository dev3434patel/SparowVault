# Current status — LF-20260922-013706

**Conclusion:** `LOCAL_SOFTWARE_COMPLETE_WITH_EXTERNAL_EVIDENCE_GAPS`

| Gate | Result |
|------|--------|
| localSoftwareStatus | PASS |
| independentClientSync | PASS |
| bankLayoutsVerifiedForScope | 0 |
| blockedFor20BankClaim | true |
| physicalDeviceEvidence | NOT_TESTED |
| hostedRelease | NOT_TESTED |

## Command exits

- typecheck: exit 0 (3393ms)
- lint: exit 0 (3684ms)
- unit-geometry: exit 0 (2297ms)
- check-php: exit 0 (19156ms)
- corpus-intake: exit 0 (116ms)
- statements-certify: exit 0 (3093ms)
- statements-gate-strict: exit 1 (6702ms)
- test-statements: exit 0 (21381ms)
- independent-client: exit 0 (2134ms)
