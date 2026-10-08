# Construction-Company Submission Options

## 2026-10-07 UHの工務店ポータル除外を確定

オーナーが、HSからUHの工務店ポータル利用を計画に含めないことの了承を得たと報告し、確定事項として記録するよう指示。UHは工務店・各加盟店のマスタ登録の有無にかかわらず、工務店ポータルの提供対象に含めない。HSの管理者・担当者は既存の権限に従いUH業務を扱い、HS利用を回答者一人に限定しない。HSC/SHSの延期中ポータル計画は維持する。

根拠：[オーナー採用記録](source-materials.md#2026-10-07-uh回答に対するオーナーの仕様確定と再確認連絡)。除外を守るアカウント発行・閲覧・更新の具体的な設計と実装検証は未実施。これは要件確定であり、認証・権限設定・アカウント・Devを変更した記録ではない。以下の全般的な旧候補説明をUHへの提供承認と解釈しない。

## Status

One shared partner account per construction company has been selected as a provisional proposal-prototype direction. House Solution has not accepted it as a production requirement. Earlier alternatives remain comparison context.

## Constraints to Resolve

- An unauthenticated public form can receive spam and does not establish the sender's organization.
- Requiring every construction company to maintain an ID and password may create an unacceptable administrative burden for a business partner.
- Staff review after submission can prevent unreviewed records from becoming registered data, but it does not by itself prevent spam or impersonation attempts.

## Alternatives

| Option | How it works | Benefits | Main trade-offs |
| --- | --- | --- | --- |
| Public form with anti-abuse controls | Anyone can submit; use rate limits, bot detection, a honeypot, and staff review. | Lowest sender friction; no partner onboarding. | Does not verify the organization; controls reduce abuse but cannot establish sender identity. |
| Organization-specific submission link | Give each known construction company a distinct, revocable link or token to open the form; combine it with anti-abuse controls and staff review. | No password for the partner; submissions can be associated with a known organization; a compromised link can be revoked. | A shared or forwarded link can be used by others; token lifecycle and partner-contact management are required. |
| Email one-time passcode or magic link | The form is accessible after a code or link is sent to a pre-registered company contact email address; combine it with anti-abuse controls and staff review. | Avoids a remembered password while confirming control of an approved contact email. | Requires a maintained contact-email registry and adds a verification step; it verifies email control, not necessarily the individual sender. |
| Partner account | Issue accounts to construction-company users, with passwordless or password-based sign-in and permission management. | Strongest ongoing identity and audit model; supports future partner self-service. | Highest onboarding, support, and account-management burden. |

## Adopted Proposal Prototype — House Solution Review Pending

- Issue one shared Firebase Authentication account per construction company. House Solution administrators issue and disable accounts; construction companies set and reset their own passwords.
- Bind the authenticated UID to one construction-company ID on the server. The account can access only its own work items and never staff screens or registered business collections directly.
- Use trusted Callable commands for company updates and staff review. Enforce the allowed fields, revision, status transition, and one-to-one work-item/case relationship on the server.
- Treat email as notification only. Store the pending work item before notification and retain it when delivery is unavailable.
- Record the current contact name and email on each response because a shared company account cannot identify the individual operator.

## Decision Inputs Needed

- Number of construction companies and frequency of submissions.
- Whether each company has a stable, controlled business email address.
- Acceptable onboarding and support burden for House Solution staff and partners.
- Required auditability, impersonation risk tolerance, and handling of a compromised contact email or link.
- Whether House Solution accepts company-level rather than individual-level attribution and the shared-password reset/rotation procedure.
