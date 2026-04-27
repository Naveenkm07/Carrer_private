# Modo: tracker — Tracker de Aplicaciones

Lee y muestra `data/applications.md`.

**Formato del tracker:**
```markdown
| # | Fecha | Empresa | Rol | Score | Estado | PDF | Report |
```

Estados posibles: `Evaluated` → `Applied` → `Responded` → `Contact` → `Interview` → `Offer` / `Rejected` / `Discarded` / `SKIP`

- `Applied` = the candidate sent their application
- `Responded` = A recruiter/company contacted and the candidate responded (inbound)
- `Contact` = The candidate proactively contacted someone at the company (outbound, e.g., LinkedIn power move)

If the user asks to update a status, edit the corresponding row.

Also show statistics:
- Total applications
- By status
- Average score
- % with PDF generated
- % with report generated
