---
name: release-compliance
owner: security
readers: []
description: Release provenance, SBOM, VEX, AIBOM, and disclosure-contact controls with regulatory tags. Loaded when recon publishes is true.
---

Inherited contract applies. Read `agents/_contract.md` before emitting findings. Cite SLSA spec v1.2 at `slsa.dev`.

Owner: security. These controls support A03 and A08. Gaps found here are `hardening-note` with a `regulatory` tag unless a reachable attack path exists (an unpinned third-party Action in a publish job is an `open` A03 finding, not a note).

Regulatory tags describe who is bound, not what is wrong. The EU Cyber Resilience Act binds manufacturers of products with digital elements sold in the EU; its vulnerability and incident reporting duties apply from 2026-09-11 through ENISA's Single Reporting Platform. The CISA 2026 Minimum Elements for an SBOM (released 2026-07-29) replace the 2021 NTIA baseline for federal use. A repository that is not such a product may ignore the tag. Say so in the note.

| Control | Look for | Evidence needed |
|---------|----------|-----------------|
| REL-PROVENANCE | A publish or release workflow with no provenance attestation. SLSA v1.2 Build L1 means provenance exists, L2 means signed provenance from a hosted build, L3 means a hardened build platform. Provenance must bind to the artifact digest, not only a commit. Trusted publishing (OIDC) instead of long-lived registry tokens. | The workflow file and the attest or sign step, or its absence. |
| REL-SBOM | A release SBOM attached to each artifact, in CycloneDX or SPDX. A lockfile dump is an inventory approximation, not a release SBOM. Against the CISA 2026 minimum elements: component hashes, generation tool and context, supplier, license, and SBOM signature are expected. Tag `regulatory: ["CISA-SBOM-2026"]`. | The SBOM file or generation step and the fields it carries. |
| REL-VEX | A machine-readable VEX statement (CSAF or CycloneDX VEX) next to the SBOM, stating which listed vulnerabilities do and do not affect the product. Tag `regulatory: ["CRA", "CISA-SBOM-2026"]`. | The file, or its absence with a published SBOM present. |
| REL-AIBOM | Models, datasets, or prompts bundled in a release with no AI bill of materials (CycloneDX 1.6+ ML-BOM or SPDX 3 AI profile). Applies only when recon `ai` is true and the release ships model assets. | The shipped model assets and the AIBOM file, or its absence. |
| REL-CVD | A `SECURITY.md` with a private reporting channel and a named contact or form; a statement of supported versions. Tag `regulatory: ["CRA"]`. | The file and the contact line. Never invent an address. |

Rules:

- Absence of a release SBOM is a note, not a vulnerability. Absence of provenance on a publish job is a note unless the same job also uses a mutable third-party Action.
- A hardening note here needs either `upstream_control` or a non-empty `regulatory` list, per the contract.
- Do not claim legal compliance or non-compliance. Report what the files show.
