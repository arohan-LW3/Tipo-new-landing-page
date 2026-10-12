# Putting the Tipo website on DigitalOcean

This guide is for whoever sets up the hosting. No coding is needed: it's all
done by clicking in the DigitalOcean dashboard. It takes about 15 minutes.

What you'll end up with:

- **The website**, including the customer traceability pages.
- **The admin pages** (`/admin`) where Tipo staff update batch details and
  serial numbers. Their changes appear on the website instantly.
- **A database** that stores the batches and serial numbers. It's
  DigitalOcean's own product, so it's on the same account and the same bill.

After setup, nothing needs to be maintained. When the developer pushes an
update to GitHub, DigitalOcean rebuilds the site by itself, and the batch data
is kept.

---

## Before you start

1. A DigitalOcean account with billing set up.
2. Access to the GitHub repository `arohan-LW3/Tipo-new-landing-page`.
   DigitalOcean will ask to connect to GitHub. The account you connect must
   be able to see this repository. If it can't, ask the developer to give
   access or move the repository to the company's GitHub organisation.
3. The admin usernames and passwords you want Tipo staff to use.
4. The Resend API key used by the Contact Us form. The developer can give
   you this.

---

## Step 1: Create the app

1. In DigitalOcean, open **Apps** and click **Create App**.
2. Choose **GitHub** as the source and connect your GitHub account if asked.
3. Pick the repository **Tipo-new-landing-page** and the branch **main**.
   Keep **Autodeploy** switched on.
4. DigitalOcean finds the `Dockerfile` and sets the app up from it. If it
   asks for a port, enter **8080**.
5. Choose the smallest instance size. This site is light, and it can be
   changed later.

## Step 2: Add the database

1. In the same setup screen, click **Add Resource** → **Database**.
2. Choose **PostgreSQL** and name it **db**. The name matters: the settings
   in Step 3 refer to it.
3. **Dev Database** is the cheapest and is fine to start with. For the live
   business, a **Managed Database** includes automatic daily backups, which
   protects the batch data. Check the backup options and price on screen
   before choosing.

## Step 3: Settings (environment variables)

Open the web service's **Environment Variables** and add these four:

| Name | Value | Encrypt? |
|---|---|---|
| `DATABASE_URL` | `${db.DATABASE_URL}` | no |
| `DATABASE_CA_CERT` | `${db.CA_CERT}` | no |
| `ADMIN_USERS` | the admin logins (see below) | **yes** |
| `RESEND_API_KEY` | the Resend key | **yes** |

Type the first two values exactly as shown, including `${` and `}`.
DigitalOcean fills in the real database details by itself.

**`ADMIN_USERS` format:** `username:password`, with `;` between accounts:

```
owner@heritagetipo.com:FirstStrongPassword;worker:SecondStrongPassword
```

- Usernames can be an email or a plain name. Capital letters don't matter.
- Passwords can't contain `;`.
- Use long passwords that aren't used anywhere else.

> Shortcut: in the app's **Settings → App Spec** you can instead paste the
> contents of `.do/app.yaml` from the repository. It contains all of the
> above. You still need to fill in the two secret values.

## Step 4: Create and check

1. Review the monthly price shown, then click **Create Resources**.
2. Wait for the first build to finish. It takes a few minutes, and the
   status turns green.
3. Open the app's link and check:
   - The home page loads.
   - **Traceability** → enter a batch number → the timeline cards appear.
   - **Admin login** (bottom of the traceability page) → log in with one of
     the `ADMIN_USERS` accounts → you see the batches.

## Step 5: Bring over the data from the test site

If Tipo staff entered batches on the test site (Vercel):

1. On the **test site**, log in to the admin and click **Download all data**.
   Ask the staff to stop editing on the test site from this point.
2. On the **new DigitalOcean site**, log in to the admin, click
   **Upload data**, choose that file and pick **Replace everything**.
3. Check the summary, then click **Confirm upload**.

## Step 6: Connect the domain (optional)

In the app's **Settings → Domains**, add the domain and follow the DNS steps
DigitalOcean shows.

---

## Everyday tasks

- **Change a password, or add or remove an admin:** in the app's **Settings
  → Environment Variables**, edit `ADMIN_USERS` and save. The app restarts
  by itself, and everyone has to log in again.
- **Backup:** any admin can click **Download all data** at any time. With a
  Managed Database, DigitalOcean also keeps daily backups.
- **Website updates from the developer:** nothing to do. Pushes to GitHub
  deploy automatically.

## If something goes wrong

- **"Admin login hasn't been set up on this server yet":** `ADMIN_USERS` is
  missing or empty (Step 3).
- **The traceability page says it couldn't load:** open the app's **Runtime
  Logs** in DigitalOcean. A database error there usually means
  `DATABASE_URL` or `DATABASE_CA_CERT` wasn't typed exactly as in Step 3.
- **Contact form doesn't send emails:** check `RESEND_API_KEY`.
