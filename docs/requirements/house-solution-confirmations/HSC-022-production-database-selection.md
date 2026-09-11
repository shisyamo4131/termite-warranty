# HSC-022: Production Database Selection

- Status: Open technical decision
- Decision owner: Project, with House Solution input

## Confirmed Context

Firestore is adopted for the prototype. PostgreSQL may replace it after a documented production reassessment.

## Questions

1. What representative-data volume, query behavior, response-time target, and operating-cost ceiling must Firestore satisfy?
2. What schema, search, migration, consistency, or delivery risks would require PostgreSQL?
3. By which project date must the production database decision be made?

## Affected Documents

Technology decision, data contract, search design, migration, roadmap, cost, and tests.
