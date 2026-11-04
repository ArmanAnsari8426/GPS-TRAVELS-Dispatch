# GPS Travels Dispatch

Reads the daily vendor trip sheet (.xls / .xlsx), builds a WhatsApp message for every
driver and shows a timing and office analysis. Everything runs in the browser, so no
data is uploaded anywhere.

## Run it

1. Keep the whole folder together (for example in `Downloads`).
2. Double-click `index.html` and open it in Chrome or Edge. No internet or install needed.
3. Drop in the trip sheet. Optionally add your own driver list (name or vehicle number + mobile).
4. Press **Send on WhatsApp** for each driver. WhatsApp opens with the message ready, you press Send.
5. When you are done, use **Report (Excel)** or **All messages (.txt)**.

## Folder

```
index.html            page structure
css/style.css         styling, light and dark mode
js/config.js          settings and trip sheet column positions
js/utils.js           time, date and phone helpers
js/parser.js          trip sheet and driver list parsing
js/analysis.js        driver grouping, timing estimates, office summary
js/store.js           remembers which trips were sent
js/messages.js        WhatsApp message text and link
js/export.js          Excel report and text export
js/ui.js              rendering
js/app.js             state, file loading, events
js/xlsx.full.min.js   SheetJS 0.18.5 (third-party, do not edit)
```

## Notes

- If the vendor changes the sheet layout, update the column numbers in `js/config.js`.
- The timing analysis is an estimate (distance / average speed + a few minutes per extra
  pickup). The sheet has no real drop time. Speed, stop time and buffer can be changed in Settings.
- The employee code is treated as the office.
