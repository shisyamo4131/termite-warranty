# HSC-023: Firestore N-Gram Query and Consistency Design

- Status: Open technical decision
- Decision owner: Project technical decision

## Confirmed Context

Normalization and 1- and 2-character N-Gram token generation are confirmed for selected master-name searches. The production query and maintenance mechanism is not finalized.

## Questions

1. What token-map shape, query strategy, and indexes are required?
2. How are tokens updated atomically or reconciled after master changes?
3. What representative-data tests prove correctness and acceptable cost?

## Affected Documents

Search architecture, Firestore indexes, trusted writes, data contract, and tests.
