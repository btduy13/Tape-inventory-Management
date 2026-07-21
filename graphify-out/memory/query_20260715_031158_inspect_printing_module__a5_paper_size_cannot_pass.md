---
type: "query"
date: "2026-07-15T03:11:58.624409+00:00"
question: "inspect printing module; A5 paper size cannot pass to real printer"
contributor: "graphify"
outcome: "useful"
source_nodes: ["printCurrentVoucher()", "normalizePaperSize()", "buildElectronPrintOptions()", "buildVoucherPrintDocument()"]
---

# Q: inspect printing module; A5 paper size cannot pass to real printer

## Answer

Expanded via graph vocab: [print, printer, paper, size, voucher, normalize, request, options, document, current, apply, build]. Printing spans UI Printing Framework, Print Layout Settings, Voucher Print Documents, and Printer Job Processing. Static inspection shows A5 reaches printCurrentVoucher, preload IPC, main.js, and buildElectronPrintOptions as pageSize A5. Local TrueTech driver advertises A5 but defaults to A4. The likely failure is Electron 31/Chromium or driver named-media fallback during silent printing. Tests verify only the JS option object, not the Windows spooler or physical printer. Recommended fix: emit explicit A5 micron dimensions 148000x210000, add runtime logging, and upgrade Electron from EOL 31.7.7.

## Outcome

- Signal: useful

## Source Nodes

- printCurrentVoucher()
- normalizePaperSize()
- buildElectronPrintOptions()
- buildVoucherPrintDocument()