# Legacy System Context and New-Service Objectives

## Confirmed Legacy Facts

- The current system is based on FileMaker.
- Multiple locations and users operate it concurrently.
- FileMaker licensing cost is high, and unused licenses appear to exist.
- The system has been extended over time; some information that should be managed as structured fields is operated through free-text remarks.

## Confirmed New-Service Boundary

- The system in this repository is for a new service and does not replace the FileMaker system or its existing member page.
- The current member page uses a simple shared authentication account rather than one account per construction company, as presently understood. Its exact implementation has not been verified.
- The member page and email flow are operational context only and do not satisfy the new service's identity and structured-workflow requirements.

## Confirmed Objectives

- Review licence usage and running costs.
- Improve the ability to manage necessary information as structured data.
- Improve data-entry efficiency.
- Reduce human error by replacing email reading and re-entry with form submission followed by staff review.

## Unresolved-Matter Routing

Existing-system data migration is excluded by [decision 0015](../decisions/0015-no-legacy-data-migration.md). See [HSC-016 cutover and rollback](house-solution-confirmations/HSC-016-cutover-rollback.md) and [HSC-027 business success measures](house-solution-confirmations/HSC-027-business-success-measures.md) for the remaining questions.
