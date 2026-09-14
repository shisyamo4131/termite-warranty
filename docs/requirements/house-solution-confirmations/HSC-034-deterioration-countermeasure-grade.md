# HSC-034: Deterioration Countermeasure Grade and Warranty Limit

- Status: Not yet asked
- Decision owner: House Solution

## Confirmed Context

House Solution may need to record a property's `劣化対策等級`. A working explanation associates grade 3 with a 30-year warranty limit and grade 2 with a 20-year warranty limit, but this service-specific relationship has not been confirmed. The prototype must not implement or require the grade until the questions below are answered.

The Japanese Housing Performance Indication System describes the grade as a level of measures applied to the building's structural frame. Official guidance describes grade 3 as roughly three generations (75–90 years), grade 2 as roughly two generations (50–60 years), and grade 1 as the Building Standards Act level. Those periods are not themselves the proposed 30-year and 20-year warranty limits. Official retrofit guidance also recognizes work that improves an existing home's deterioration-countermeasure performance, so the grade cannot yet be assumed to remain unchanged throughout the building's life.

## Questions

1. Are the proposed grade-3/30-year and grade-2/20-year values House Solution's own cumulative warranty limits, and from which date is the limit measured?
2. How are grade 1, grade 0 for an existing home, and an unconfirmed grade handled: rejection, individual review, or another limit?
3. Which document or assessment establishes the grade, and which assessment date must be retained?
4. Can a later retrofit or reassessment change the grade used by this service? If so, does the new grade affect only a later renewal or also an already accepted warranty?
5. Must the system answer how many renewals remain, or only the latest permitted warranty expiry date? How are warranty products with different periods handled near the limit?
6. Should grade history be recorded against the property, the case, or a dated assessment record, and what decision-time value must be retained with each applied warranty?

## Recommended Proposal — Awaiting House Solution Decision

- Treat the grade as a dated assessment of the physical property. Retain assessment history against the property, including at least the grade, assessment date, and evidence or source document.
- When an applied warranty is accepted, retain a decision-time snapshot of the grade, assessment date, warranty-limit rule, and calculated latest permitted expiry used for that acceptance. A later property reassessment must not rewrite the basis of an earlier acceptance.
- Calculate renewal availability from the latest permitted expiry and the requested warranty period instead of storing a fixed `remaining renewal count`. For example, ten years remaining could permit either one 10-year renewal or two 5-year renewals, subject to the product and business rules confirmed by House Solution.
- If a retrofit or reassessment changes the grade, append a new property assessment rather than replacing the prior assessment. Whether the new assessment applies from the next renewal or can affect an existing warranty remains a House Solution decision.
- Do not use a case-level grade history as the sole record. One case can contain multiple applied warranties accepted at different times, so it cannot by itself preserve which assessment and limit justified each acceptance.
- Recommended future model: property-owned dated assessment history plus an applied-warranty decision snapshot. This is a proposal for discussion, not an approved requirement, and remains excluded from the prototype.

## Sources

- Ministry of Land, Infrastructure, Transport and Tourism, `日本住宅性能表示基準及び評価方法基準の概要`: https://www.mlit.go.jp/jutakukentiku/house/content/001857615.pdf
- Long-term Quality Housing Renovation Promotion Project, `長期優良住宅（増改築）認定制度について`: https://r07.choki-reform.mlit.go.jp/overview/criterion.html

## Affected Documents

Master/property data model, case and applied-warranty data contract, renewal eligibility and validation, construction-company submission fields, search/display requirements, migration, and tests.
