# এসডিও সহায়ক · SDO Sahayak

A free desk helper for staff of Sub-Divisional Officer (SDO) offices in West Bengal.
It runs in any browser, needs no login, no server and no internet after the first visit.
Nothing typed into it leaves the computer or phone.

## What it does

| Section | Use |
|---|---|
| **Certificates** | Desk guide for SC/ST, OBC, OBC-NCL (Central), Residential, Income and EWS certificates: issuing authority, eligibility, documents checklist, enquiry points, common reasons for return. Tick the documents an applicant gave and it drafts the shortfall letter for the rest. |
| **Drafting** | Fill-in-the-blank letters in English and Bengali: shortfall letter, hearing notice, forwarding for enquiry, enquiry report, note sheet, rejection order, reminder, blank memo with "copy forwarded to". Copy or print. |
| **Pending register** | Track application numbers by stage and see which are overdue. Copy as CSV into Excel. |
| **Tools** | Family income vs. limit, deadline / days pending, age on a date, amount in words (Indian system), land unit converter (katha, bigha, decimal, acre), English to Bengali digits. |
| **Portals & schemes** | Links to e-District, caste certificate portal, Banglar Bhumi, Jai Bangla, HRMS etc., and where to send people for common schemes. |

Office name, sub-division, district, memo prefix and signing officer are set once under **Office details**.

## Put it online for free (GitHub Pages)

1. On GitHub open the repository → **Settings → Pages**.
2. Source: *Deploy from a branch*, pick the branch and folder `/ (root)`, save.
3. The app is then at `https://<username>.github.io/<repo>/sdo-sahayak/`.
4. On a phone, open the link and choose **Add to Home screen**. It then opens like an app and works offline.

You can also copy the `sdo-sahayak` folder to a pen drive and open `index.html` on any office computer.

## Please note

- This is not an official Government of West Bengal application. Show it to your Head of Office before sharing it widely.
- Income limits, formats and procedures change. Check the latest order before deciding a case. Corrections are welcome: edit the `CERTS` and `TEMPLATES` lists inside `index.html`.
- Do not type applicants' personal details into the pending register. Keep only application numbers.
