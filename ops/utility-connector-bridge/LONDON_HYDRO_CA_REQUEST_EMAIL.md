# London Hydro CA / Connectivity Outreach Draft

Use this template for the initial operator outreach to `gb@londonhydro.com`. Send it before incorporation is complete so the supported-CA and TLS-mode uncertainty is removed in parallel with burner staging work.

## Subject

Green Button CMD third-party onboarding: supported CA list and connectivity-testing guidance request

## Draft

Hello London Hydro Green Button team,

We are preparing a third-party Green Button CMD integration and are currently staging our callback and connectivity bridge ahead of formal submission.

Before we place any production certificate order or finalize the utility-facing bridge configuration, please share the following for your current onboarding process:

1. The list of Certificate Authorities that London Hydro supports for third-party Green Button CMD exchanges.
2. Any current connectivity-testing instructions or prerequisites that apply during the 90-day connectivity testing period.
3. Confirmation of whether third-party token/feed/revoke exchanges are expected to use:
   - standard server-auth TLS only (`server_tls`), or
   - outbound client-certificate presentation / mutual TLS (`mtls_upstream`)
4. Any hostname, IP allow-listing, or certificate-chain expectations we should prepare before formal registration.

We are not submitting our production packet yet. This request is only to avoid ordering the wrong certificate chain or hardening the bridge against the wrong TLS mode.

Thank you,

[Authorized signer name]  
[Title]  
[Legal company name or planned entity name]  
[Business email]  
[Business phone]  

## Archive Checklist

- Save the sent email in the onboarding evidence folder.
- Save London Hydro's reply verbatim.
- Record the date received.
- Update `UTILITY_BRIDGE_UPSTREAM_TLS_MODE` planning only after the reply is archived.
- Do not purchase the production certificate until the reply is in hand.
